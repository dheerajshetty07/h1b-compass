# H1B Compass — Master Reference Guide

> Your H-1B Command Center — Track policy changes, analyze prevailing wages, and plan your immigration strategy using verified government data.

**Version:** 0.1.0  
**Framework:** Next.js 16.1.6 (App Router, Turbopack)  
**Language:** TypeScript  
**Database:** PostgreSQL (Neon)  
**Deployment:** Vercel (with Cron for auto-refresh)  
**License:** Private

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [System Flow Diagram](#system-flow-diagram)
4. [Data Pipeline](#data-pipeline)
5. [File Dictionary](#file-dictionary)
6. [API Reference](#api-reference)
7. [Database Schema](#database-schema)
8. [Data Sources](#data-sources)
9. [Development Setup](#development-setup)
10. [Deployment Guide](#deployment-guide)
11. [Known Limitations](#known-limitations)

---

## Project Overview

H1B Compass is a web application that helps F-1/OPT/H-1B workers navigate the US immigration system by providing:

- **Policy Radar** — Real-time tracking of Federal Register documents related to H-1B, F-1, OPT, and STEM OPT. Auto-refreshes daily via Vercel Cron.
- **Wage Strategy** — Title-first SOC code matching, OFLC prevailing wage lookup, BLS OEWS market wage comparison, and selection weight simulator
- **Selection Simulator** — Visualizes the wage-based H-1B selection weight system (effective Feb 27, 2026)
- **Resource Library** — Curated official government links, key definitions, and FAQs

### Key Principles

- **Free end-to-end** — All data comes from free, public government APIs and datasets
- **No legal advice** — Informational tool only; always consult an immigration attorney
- **Verified sources only** — Federal Register API, DOL FLAG, BLS OEWS, O*NET

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
│                                                                  │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────┐ │
│  │ Dashboard │  │ Policy Radar │  │ Wage Strategy│  │Resources│ │
│  │  (page)   │  │   (page)     │  │   (page)     │  │ (page)  │ │
│  └─────┬────┘  └──────┬───────┘  └──────┬───────┘  └────┬────┘ │
│        │               │                 │                │      │
│  ┌─────┴───────────────┴─────────────────┴────────────────┴────┐ │
│  │                   React Components                            │ │
│  │  PolicyCard │ WageLevelDisplay │ SelectionSimulator          │ │
│  │  Navigation │ ThemeProvider                                  │ │
│  └───────────────────────────┬─────────────────────────────────┘ │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                    Client-side fetch() calls
                               │
┌──────────────────────────────┼───────────────────────────────────┐
│                        API ROUTES (Server)                        │
│                                                                    │
│  ┌──────────────┐ ┌───────────┐ ┌────────────┐ ┌──────────────┐  │
│  │ /api/policies │ │/api/wages │ │/api/soc-   │ │ /api/simulate│  │
│  │  (GET)        │ │ (GET)     │ │ match      │ │  (POST)      │  │
│  │               │ │           │ │ (POST/GET) │ │              │  │
│  └───────┬───────┘ └─────┬─────┘ └─────┬──────┘ └──────┬───────┘  │
│          │               │              │                │         │
│  ┌───────┴───────────────┴──────────────┴────────────────┴──────┐ │
│  │                    Business Logic                               │
│  │  federal-register.ts │ oflc-wages.ts │ oews-wages.ts │ onet.ts│ │
│  │  soc-matcher.ts      │ locations.ts  │ selection-simulator.ts  │ │
│  └───────────────────────────┬───────────────────────────────────┘ │
└──────────────────────────────┼─────────────────────────────────────┘
                               │
                    Prisma ORM (db.ts)
                               │
┌──────────────────────────────┼─────────────────────────────────────┐
│                         DATABASE                                    │
│                                                                     │
│  PostgreSQL (Neon)                                                  │
│  • policy_document  (6+ records from Federal Register)             │
│  • occupation       (1,016 records from O*NET)                     │
│  • soc_match_index  (147K+ TF-IDF entries)                         │
│  • wages_oflc       (449K+ prevailing wage records)                │
│  • wages_oews       (141K+ market wage records)                    │
│  • ingest_run       ← Provenance tracking                          │
│  • data_refresh_log ← Last updated timestamps                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA INGESTION PIPELINE                           │
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐       │
│  │  Federal Register │    │  DOL FLAG (OFLC) │    │  BLS OEWS        │       │
│  │  (REST API)       │    │  (ZIP → CSV)     │    │  (ZIP → XLSX)    │       │
│  │  free, no key     │    │  free download   │    │  free download   │       │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘       │
│           │                       │                       │                  │
│           ▼                       ▼                       ▼                  │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐       │
│  │  ingest/         │    │  ingest/         │    │  ingest/         │       │
│  │  federal-register│    │  oflc-wages.ts   │    │  oews-wages.ts   │       │
│  │  .ts             │    │  (AdmZip+csv)    │    │  (AdmZip+XLSX)   │       │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘       │
│           │                       │                       │                  │
│           └───────────────────────┼───────────────────────┘                  │
│                                   │                                          │
│                                   ▼                                          │
│  ┌──────────────────┐    ┌──────────────────┐                                │
│  │  O*NET Database  │    │  scripts/seed.ts │                                │
│  │  (ZIP → XLSX)    │───►│  (orchestrator)  │                                │
│  │  free download   │    │  npm run seed    │                                │
│  └────────┬─────────┘    └────────┬─────────┘                                │
│           │                       │                                          │
│           ▼                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐            │
│  │                     PostgreSQL (Neon)                         │            │
│  │  • policy_document  (6+ records from Federal Register)       │            │
│  │  • occupation       (1,016 records from O*NET)               │            │
│  │  • soc_match_index  (147K+ TF-IDF entries)                   │            │
│  │  • wages_oflc       (449K+ prevailing wage records)          │            │
│  │  • wages_oews       (141K+ market wage records)              │            │
│  └──────────────────────────────────────────────────────────────┘            │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────┐            │
│  │  Vercel Cron (daily at noon UTC)                              │            │
│  │  ──► POST /api/refresh ──► Re-fetches Federal Register       │            │
│  └──────────────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          USER INTERACTION FLOW                               │
│                                                                              │
│  User opens app                                                              │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────┐                                                             │
│  │  Dashboard   │  ← Fetches latest 5 policies from /api/policies            │
│  │  (/)         │  ← Shows stage checklist (F-1, OPT, STEM OPT, H-1B)       │
│  │              │  ← Shows saved scenarios (demo data)                       │
│  └──────┬───────┘                                                             │
│         │                                                                    │
│    ┌────┴────┐                                                               │
│    ▼         ▼                                                               │
│  Policy    Wage                                                               │
│  Radar     Strategy                                                           │
│    │         │                                                               │
│    ▼         ▼                                                               │
│  ┌─────────┐ ┌─────────────────────────────────────────────────────────────┐ │
│  │Filters: │ │ 1. Enter job title + description                            │ │
│  │- Type   │ │ 2. Select location (50 US metros)                            │ │
│  │- Tags   │ │ 3. Choose work arrangement (onsite/hybrid/remote)            │ │
│  │- Search │ │ 4. Click "Analyze Wages" (single click, auto-fetches all)   │ │
│  │         │ │                                                              │ │
│  │ Results:│ │ Step A → POST /api/soc-match                                 │ │
│  │ Policy  │ │   • Title-first matching against 1,016 occupations          │ │
│  │ cards   │ │   • Returns top 3 SOC codes with confidence %               │ │
│  │ with    │ │   • Auto-loads wages for top match                          │ │
│  │ impact  │ │                                                              │ │
│  │ summary │ │ Step B → GET /api/wages?socCode=X&areaCode=Y                │ │
│  │         │ │   • Queries OFLC prevailing wages (Levels I-IV)             │ │
│  │         │ │   • Queries BLS OEWS market wages (p10-p90, mean)           │ │
│  │         │ │                                                              │ │
│  │         │ │ Step C → Selection Simulator                                │ │ │
│  │         │ │   • User enters salary → determines wage level              │ │ │
│  │         │ │   • Shows selection weight (1x to 4x entries)               │ │ │
│  └─────────┘ └─────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  Resource Library (/resources)                                        │    │
│  │  • Official government links (USCIS, DOL, BLS, O*NET, Fed Register)  │    │
│  │  • Key definitions (Prevailing Wage, SOC Code, LCA, etc.)            │    │
│  │  • FAQs about selection weights, wage differences, remote work       │    │
│  │  • Legal disclaimer                                                    │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Pipeline

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────────┐
│  O*NET ZIP  │     │  OFLC ZIP    │     │  OEWS ZIP    │     │  Fed Reg    │
│  (47 MB)    │     │  (12 MB)     │     │  (40 MB)     │     │  API (free) │
└──────┬──────┘     └──────┬───────┘     └──────┬───────┘     └──────┬──────┘
       │                   │                    │                    │
       ▼                   ▼                    ▼                    ▼
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────────┐
│ AdmZip      │     │ AdmZip       │     │ AdmZip       │     │ fetch()     │
│ + XLSX      │     │ + csv-parse  │     │ + XLSX       │     │ JSON parse  │
│ parse       │     │ parse        │     │ parse        │     │             │
└──────┬──────┘     └──────┬───────┘     └──────┬───────┘     └──────┬──────┘
       │                   │                    │                    │
       ▼                   ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          scripts/seed.ts (orchestrator)                      │
│                                                                              │
│  1. ingestOnet()     → 1,016 occupations + buildSocIndex() (TF-IDF)         │
│  2. ingestFederalRegister() → 6+ policy documents                           │
│  3. ingestOflcWages() → 449K+ prevailing wage records (2025-26)             │
│  4. ingestOewsWages() → 141K+ market wage records (May 2024)                │
│                                                                              │
│  Run: npm run seed  (local only, not on serverless)                          │
└─────────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE TABLES                                 │
│                                                                              │
│  policy_document    ← Federal Register documents (RULE, PRORULE, NOTICE)    │
│  occupation         ← O*NET occupations (title, description, tasks, titles) │
│  soc_match_index    ← TF-IDF inverted index for SOC code matching           │
│  wages_oflc         ← DOL prevailing wages (Levels I-IV, hourly + annual)   │
│  wages_oews         ← BLS market wages (mean, p10-p90, employment)          │
│  ingest_run         ← Provenance tracking for each data import              │
│  data_refresh_log   ← Last updated timestamps per dataset                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## File Dictionary

### Root Configuration

| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts (`dev`, `build`, `seed`, `postinstall`) |
| `next.config.ts` | Next.js config — externalizes heavy packages, standalone output |
| `tsconfig.json` | TypeScript config — strict mode, path aliases (`@/*`) |
| `postcss.config.mjs` | PostCSS config — Tailwind v4 plugin |
| `components.json` | shadcn/ui configuration |
| `.env` | Environment variables (DATABASE_URL) |
| `.env.example` | Template for environment variables |
| `.gitignore` | Excludes node_modules, .next, data/, prisma/dev.db |
| `vercel.json` | Vercel deployment config + Cron schedule |

### Database

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema — 7 models, indexes, relations (PostgreSQL) |

### Source Code — App Pages

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout — Navigation, ThemeProvider, global styles |
| `src/app/page.tsx` | **Dashboard** — Policy feed, stage checklist, saved scenarios |
| `src/app/policy-radar/page.tsx` | **Policy Radar** — Federal Register feed with type/tag/search filters |
| `src/app/wage-strategy/page.tsx` | **Wage Strategy** — SOC matching, wage analysis, selection simulator |
| `src/app/resources/page.tsx` | **Resources** — Official links, definitions, FAQs, disclaimer |
| `src/app/globals.css` | Global styles — theme variables, component classes, animations |

### Source Code — API Routes

| File | Purpose |
|------|---------|
| `src/app/api/policies/route.ts` | `GET` — Query policy documents with filters (type, tags, search, pagination) |
| `src/app/api/wages/route.ts` | `GET` — Lookup OFLC prevailing wages + BLS OEWS market wages by SOC + area |
| `src/app/api/soc-match/route.ts` | `POST` — Match job title/description to SOC codes (title-first matching). `GET` for testing/debugging |
| `src/app/api/simulate/route.ts` | `POST` — Simulate H-1B selection weight based on salary and wage levels |
| `src/app/api/refresh/route.ts` | `POST` — Trigger data refresh (Federal Register). `GET` — Check data freshness status |

### Source Code — Components

| File | Purpose |
|------|---------|
| `src/components/Navigation.tsx` | Top navigation bar with logo, nav links, mobile menu button |
| `src/components/ThemeProvider.tsx` | Theme provider (locked to light mode) |
| `src/components/PolicyCard.tsx` | Policy document card — type badge, impact summary, tags, links |
| `src/components/WageLevelDisplay.tsx` | Side-by-side OFLC wage levels + BLS OEWS percentile visualization |
| `src/components/SelectionSimulator.tsx` | Interactive salary input → wage level determination → weight display |
| `src/components/AnimatedThemeToggler.tsx` | **DEPRECATED** — stubbed out (theme locked to light) |

### Source Code — Libraries

| File | Purpose |
|------|---------|
| `src/lib/db.ts` | Prisma client singleton (avoids multiple instances in dev) |
| `src/lib/utils.ts` | `cn()` utility — merges Tailwind classes with clsx + tailwind-merge |
| `src/lib/soc-matcher.ts` | Title-first SOC matching — string similarity against occupation titles, sample titles, descriptions, and tasks |
| `src/lib/selection-simulator.ts` | Selection weight math — pool composition, relative advantage calculations |
| `src/lib/locations.ts` | Location lookup — 50 US metro areas with CBSA codes, search function |

### Source Code — Data Ingestion

| File | Purpose |
|------|---------|
| `src/lib/ingest/federal-register.ts` | Fetches H-1B/F-1/OPT documents from Federal Register API, generates impact summaries, tags |
| `src/lib/ingest/oflc-wages.ts` | Parses OFLC ZIP (CSV format) — 449K+ prevailing wage records for all SOC/area combos |
| `src/lib/ingest/oews-wages.ts` | Parses OEWS ZIP (XLSX format) — 141K+ BLS market wage records by metro area |
| `src/lib/ingest/onet.ts` | Parses O*NET ZIP (40 XLSX files) — 1,016 occupations with tasks and alternate titles |

### Scripts

| File | Purpose |
|------|---------|
| `scripts/seed.ts` | **Main seed orchestrator** — runs all 4 ingestion pipelines in order |
| `scripts/check-db.ts` | Database record count checker |
| `scripts/test-db.ts` | TypeScript DB connection test |
| `scripts/test-js.js` | Quick DB connection test (Node.js, no TypeScript) |
| `scripts/clear-fr-cache.ts` | Clear Federal Register cache for re-fetch |

### Data Directory (not committed to git)

| Path | Contents |
|------|----------|
| `data/onet/` | O*NET Database ZIP (e.g., `db_30_2_excel.zip` — 47 MB) |
| `data/oflc/` | OFLC Wage ZIP (e.g., `OFLC_Wages_2025-26.zip` — 12 MB) |
| `data/oews/` | OEWS MSA ZIP (e.g., `oesm24ma.zip` — 40 MB) |

---

## API Reference

### `GET /api/policies`

Query policy documents from the Federal Register.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10, max: 100) |
| `type` | string | Filter by document type: `RULE`, `PRORULE`, `NOTICE` |
| `status` | string | Filter by status: `final`, `proposed`, `notice` |
| `tags` | string | Filter by tag (comma-separated) |
| `search` | string | Full-text search in title and abstract |

**Response:**
```json
{
  "items": [{ "id", "source", "docNumber", "title", "type", "status",
              "agencyNames", "publicationDate", "effectiveDate", "abstract",
              "officialUrl", "pdfUrl", "tags", "impactSummary", "fetchedAt", "sourceUrl" }],
  "pagination": { "page", "limit", "total", "totalPages" },
  "meta": { "lastUpdated", "status", "sourceUrl" }
}
```

### `GET /api/wages`

Look up prevailing and market wages for a given SOC code and area.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `socCode` | string | Yes | SOC code (e.g., `15-1252` or `151252`) |
| `areaCode` | string | Yes | CBSA/area code (e.g., `41860` for San Francisco) |
| `oewsAreaCode` | string | No | OEWS area code (defaults to areaCode) |

**Response:**
```json
{
  "socCode": "151252",
  "location": { "areaCode": "41860", "areaType": "msa", "displayName": "San Francisco-Oakland-Berkeley, CA" },
  "oflc": {
    "available": true, "wageYear": 2025,
    "levels": {
      "level1": { "hourly": 65.24, "annual": 135699 },
      "level2": { "hourly": 77.71, "annual": 161637 },
      "level3": { "hourly": 90.18, "annual": 187574 },
      "level4": { "hourly": 102.65, "annual": 213512 }
    },
    "sourceUrl": "https://flag.dol.gov/wage-data/wage-data-downloads",
    "ingestedAt": "2026-04-04T..."
  },
  "oews": {
    "available": true, "year": 2024,
    "wages": { "mean": 187840, "p10": 128140, "p25": 160060, "p50": 174910, "p75": 213420, "p90": null },
    "employment": 76900,
    "sourceUrl": "https://www.bls.gov/oes/tables.htm"
  },
  "disclaimer": "..."
}
```

### `POST /api/soc-match`

Match a job title and optional description to SOC codes using title-first string similarity.

**Request Body:**
```json
{ "jobTitle": "Software Engineer", "jobDescription": "optional description..." }
```

**Response:**
```json
{
  "matches": [
    { "socCode": "151252", "onetSocCode": "15-1252.00", "title": "Software Developers",
      "description": "...", "confidence": 85, "matchedKeywords": ["software", "engineer"],
      "matchSource": "title", "whyMatched": "Matched on: software, engineer" }
  ],
  "queryTerms": ["software", "engineer"],
  "gated": false,
  "meta": { "inputTitle": "Software Engineer", "hasDescription": false }
}
```

### `GET /api/soc-match` (testing)

Test matching directly in browser.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `q` or `title` | string | Job title to match |

**Response (with query):**
```json
{
  "query": "Software Engineer",
  "matches": [...],
  "queryTerms": ["software", "engineer"],
  "gated": false
}
```

**Response (no query — returns DB stats):**
```json
{
  "message": "Send a POST request with { jobTitle } to get SOC matches",
  "testUrl": "/api/soc-match?q=Software+Engineer",
  "dbStats": { "occupations": 1016, "indexEntries": 147334, "sampleTerms": [...] }
}
```

### `POST /api/simulate`

Simulate H-1B selection weight based on salary.

**Request Body:**
```json
{ "salary": 150000, "socCode": "15-1252", "areaCode": "41860" }
```

**Response:**
```json
{
  "simulation": {
    "userWageLevel": 2,
    "userRelativeWeight": 2,
    "userLevelExplanation": "...",
    "levelWeights": [
      { "level": 1, "entriesPerRegistration": 1, "poolPercent": 10.9, "relativeAdvantage": "43% of average" },
      { "level": 2, "entriesPerRegistration": 2, "poolPercent": 30.4, "relativeAdvantage": "87% of average" },
      { "level": 3, "entriesPerRegistration": 3, "poolPercent": 32.6, "relativeAdvantage": "1.3x average" },
      { "level": 4, "entriesPerRegistration": 4, "poolPercent": 26.1, "relativeAdvantage": "1.7x average" }
    ],
    "poolTotalEntries": 230
  },
  "disclaimer": "...",
  "effectiveDate": "2026-02-27",
  "warning": "...",
  "notLegalAdvice": "..."
}
```

### `POST /api/refresh`

Trigger data refresh for Federal Register. Clears cache and re-fetches.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `secret` | string | Optional — matches `REFRESH_SECRET` env var if set |

**Response:**
```json
{
  "success": true,
  "message": "Refreshed Federal Register data",
  "recordsProcessed": 6,
  "timestamp": "2026-04-04T20:00:09.487Z"
}
```

### `GET /api/refresh`

Check data freshness status for all datasets.

**Response:**
```json
{
  "datasets": [
    { "dataset": "oflc_wages", "lastChecked": "2026-04-04T...", "lastUpdated": "2026-04-04T...", "version": "2025", "status": "success" },
    { "dataset": "oews_wages", "lastChecked": "2026-04-04T...", "lastUpdated": "2026-04-04T...", "version": "2024", "status": "success" }
  ],
  "policyDocumentCount": 6,
  "timestamp": "2026-04-04T20:00:09.487Z"
}
```

---

## Database Schema

### Models

| Model | Records | Description |
|-------|---------|-------------|
| `PolicyDocument` | 6+ | Federal Register documents (H-1B, F-1, OPT, STEM OPT) |
| `Occupation` | 1,016 | O*NET occupations with title, description, tasks, sample titles |
| `SocMatchIndex` | 147K+ | TF-IDF inverted index for SOC code matching |
| `WagesOflc` | 449K+ | DOL prevailing wages (Levels I-IV) by SOC code and area |
| `WagesOews` | 141K+ | BLS market wages (mean, p10-p90) by SOC code and metro area |
| `IngestRun` | varies | Provenance tracking for each data import run |
| `DataRefreshLog` | 4 | Last updated timestamps per dataset |

### Key Relationships

```
Occupation 1──N SocMatchIndex
IngestRun 1──N PolicyDocument
IngestRun 1──N WagesOflc
IngestRun 1──N WagesOews
IngestRun 1──N Occupation
```

---

## Data Sources

| Source | Type | Cost | URL | Used For |
|--------|------|------|-----|----------|
| **Federal Register API** | REST API | Free | `https://www.federalregister.gov/api/v1` | Policy documents |
| **DOL FLAG** | ZIP download | Free | `https://flag.dol.gov/wage-data/wage-data-downloads` | Prevailing wages (OFLC) |
| **BLS OEWS** | ZIP download | Free | `https://www.bls.gov/oes/tables.htm` | Market wages |
| **O*NET Database** | ZIP download | Free (CC BY 4.0) | `https://www.onetcenter.org/database.html` | Occupation data, SOC codes |

### Data Refresh Schedule

| Dataset | Update Frequency | Method |
|---------|-----------------|--------|
| Federal Register | Daily | Vercel Cron → `POST /api/refresh` |
| OFLC Wages | Annually (July) | Download ZIP, run seed |
| OEWS Wages | Annually (May) | Download ZIP, run seed |
| O*NET | Annually | Download ZIP, run seed |

---

## Development Setup

### Prerequisites

- Node.js 18+ (tested on 24)
- npm
- PostgreSQL database (Neon recommended)

### Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
# Copy .env.example to .env and set DATABASE_URL

# 3. Set up database
npx prisma db push

# 4. Place data files (see Data Sources above)
#    data/onet/db_30_2_excel.zip
#    data/oflc/OFLC_Wages_2025-26.zip
#    data/oews/oesm24ma.zip

# 5. Seed the database
npm run seed

# 6. Start development server
npm run dev
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server (localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run seed` | Run data ingestion pipeline |

### Project Structure

```
h1b-compass/
├── data/                    # Data files (not committed)
│   ├── onet/                # O*NET ZIP files
│   ├── oflc/                # OFLC wage ZIP files
│   └── oews/                # OEWS wage ZIP files
├── prisma/
│   └── schema.prisma        # Database schema (PostgreSQL)
├── scripts/
│   ├── seed.ts              # Main seed orchestrator
│   ├── check-db.ts          # Database checker
│   ├── test-db.ts           # DB connection test
│   ├── test-js.js           # JS DB connection test
│   └── clear-fr-cache.ts    # Clear Federal Register cache
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Dashboard
│   │   ├── globals.css      # Global styles
│   │   ├── policy-radar/    # Policy Radar page
│   │   ├── wage-strategy/   # Wage Strategy page
│   │   ├── resources/       # Resource Library page
│   │   └── api/             # API routes
│   │       ├── policies/    # GET /api/policies
│   │       ├── wages/       # GET /api/wages
│   │       ├── soc-match/   # POST + GET /api/soc-match
│   │       ├── simulate/    # POST /api/simulate
│   │       └── refresh/     # POST + GET /api/refresh
│   ├── components/          # React components
│   └── lib/                 # Shared libraries
│       ├── db.ts            # Prisma client
│       ├── soc-matcher.ts   # Title-first SOC matching
│       ├── locations.ts     # Location lookup
│       ├── selection-simulator.ts  # Selection math
│       └── ingest/          # Data ingestion modules
├── public/                  # Static assets
├── next.config.ts           # Next.js configuration
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── vercel.json              # Vercel deployment config + Cron
└── .env                     # Environment variables
```

---

## Deployment Guide

### Vercel (Recommended)

1. **Database:** Set up a managed PostgreSQL (Neon, Supabase, or PlanetScale)
2. **Environment:** Add `DATABASE_URL` to Vercel environment variables
3. **Deploy:** Connect GitHub repo to Vercel — auto-detects Next.js
4. **Seed data:** Run `npm run seed` locally against the production database

```bash
# Seed production database
DATABASE_URL="postgresql://..." npx tsx scripts/seed.ts
```

### Auto-Refresh

The app includes a `/api/refresh` endpoint with Vercel Cron configured to run daily at noon UTC. This keeps Federal Register policy data fresh without manual intervention.

### Netlify

1. Same database setup as Vercel
2. The `output: 'standalone'` in `next.config.ts` enables Netlify compatibility
3. Build command: `prisma generate && next build`

### Environment Variables (Production)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | `postgresql://user:pass@host/db?sslmode=require` |
| `REFRESH_SECRET` | Optional secret to protect refresh endpoint | No | `your-secret-string` |

### Deployment Checklist

- [ ] PostgreSQL database created (Neon, Supabase, etc.)
- [ ] `DATABASE_URL` set in Vercel environment variables
- [ ] Database seeded with `npm run seed`
- [ ] Vercel Cron active (daily refresh)
- [ ] (Optional) `REFRESH_SECRET` set to protect refresh endpoint

---

## Known Limitations

1. **PostgreSQL required for production** — SQLite does not persist on serverless platforms.
2. **Seed script is local-only** — Requires manual execution against the production database.
3. **Large database size** — ~600K+ records across wage tables. Consider pagination or caching for high-traffic deployments.
4. **No authentication** — All data is public; no user accounts or personal data stored.
5. **Theme locked to light mode** — Dark mode support is stubbed out but not active.
6. **O*NET version detection** — Version string shows "unknown" for the ZIP format; cosmetic issue only.
7. **SOC matching accuracy** — Title-first string similarity works well for common job titles but may produce lower-confidence matches for niche roles. Adding a job description improves accuracy.

---

## Glossary

| Term | Definition |
|------|------------|
| **SOC Code** | Standard Occupational Classification — 6-digit code categorizing occupations |
| **O*NET-SOC** | Extended SOC with 2 additional decimal digits for specificity |
| **OFLC** | Office of Foreign Labor Certification — DOL office managing prevailing wages |
| **OEWS** | Occupational Employment and Wage Statistics — BLS market wage survey |
| **LCA** | Labor Condition Application — form filed with DOL before H-1B petition |
| **CBSA** | Core Based Statistical Area — geographic area definition for wage data |
| **MSA** | Metropolitan Statistical Area — type of CBSA |
| **TF-IDF** | Term Frequency-Inverse Document Frequency — algorithm for SOC code matching |
| **Wage-Based Selection** | H-1B selection method (effective Feb 27, 2026) where higher wage levels get more entries |
