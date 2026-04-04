# H1B Compass

> Your H-1B Command Center -- Track policy changes, analyze prevailing wages, and plan your immigration strategy using verified government data.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-Private-green)]()

---

## Features

- **Policy Radar** -- Real-time tracking of Federal Register documents related to H-1B, F-1, OPT, and STEM OPT. Auto-refreshes daily via Vercel Cron.
- **Wage Strategy** -- Title-first SOC code matching, OFLC prevailing wage lookup, BLS OEWS market wage comparison, and selection weight simulator
- **Selection Simulator** -- Visualizes the wage-based H-1B selection weight system (effective Feb 27, 2026)
- **Resource Library** -- Curated official government links, key definitions, and FAQs

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript
- **Database:** PostgreSQL (Neon)
- **ORM:** Prisma
- **Styling:** Tailwind CSS v4
- **Deployment:** Vercel (with Cron for auto-refresh)

## Quick Start

### Prerequisites

- Node.js 18+
- npm
- PostgreSQL database (Neon, Supabase, or similar)

### Installation

```bash
# Clone the repository
git clone https://github.com/dheerajshetty07/h1b-compass.git
cd h1b-compass

# Install dependencies
npm install

# Set up environment variables
# Copy .env.example to .env and set your DATABASE_URL

# Set up the database
npx prisma db push

# Seed the database (see Data Sources below)
npm run seed

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Data Sources

All data comes from free, public government sources. No API keys required.

| Source | Type | URL |
|--------|------|-----|
| Federal Register | REST API | <https://www.federalregister.gov/api/v1> |
| DOL FLAG (OFLC) | ZIP download | <https://flag.dol.gov/wage-data/wage-data-downloads> |
| BLS OEWS | ZIP download | <https://www.bls.gov/oes/tables.htm> |
| O*NET Database | ZIP download | <https://www.onetcenter.org/database.html> |

### Seeding Data

Place the downloaded files in the following directories, then run `npm run seed`:

```
data/
  onet/    -- O*NET Database ZIP (e.g., db_30_2_excel.zip)
  oflc/    -- OFLC Wage ZIP (e.g., OFLC_Wages_2025-26.zip)
  oews/    -- OEWS MSA ZIP (e.g., oesm24ma.zip)
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run seed` | Run data ingestion pipeline |
| `npm run lint` | Run ESLint |

## Project Structure

```
h1b-compass/
  src/
    app/                  # Next.js App Router
      api/                # API routes
        policies/         # GET - Query Federal Register documents
        wages/            # GET - Lookup OFLC + OEWS wages
        soc-match/        # POST/GET - SOC code matching
        simulate/         # POST - Selection weight simulation
        refresh/          # POST/GET - Data refresh endpoint + status
      policy-radar/       # Policy tracking page
      wage-strategy/      # Wage analysis page
      resources/          # Resource library page
    components/           # React components
    lib/                  # Shared libraries
      ingest/             # Data ingestion modules (OFLC, OEWS, O*NET, Federal Register)
      soc-matcher.ts      # Title-first SOC matching engine
      locations.ts        # US metro area lookup
      selection-simulator.ts  # Selection weight calculations
  prisma/                 # Database schema
  scripts/                # Seed and utility scripts
  data/                   # Data files (not committed)
```

See [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) for the complete architecture reference.

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repo to Vercel
2. Set up a managed PostgreSQL (Neon, Supabase, or PlanetScale)
3. Add `DATABASE_URL` to Vercel environment variables
4. Deploy -- Vercel auto-detects Next.js
5. Seed the production database: `DATABASE_URL="your-url" npx tsx scripts/seed.ts`

### Auto-Refresh

The app includes a `/api/refresh` endpoint with Vercel Cron configured to run daily at noon UTC. This keeps Federal Register policy data fresh without manual intervention.

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REFRESH_SECRET` | Optional secret to protect refresh endpoint | No |

```
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
```

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/policies` | GET | Query Federal Register documents with filters |
| `/api/wages` | GET | Lookup OFLC prevailing wages + BLS OEWS market wages |
| `/api/soc-match` | POST | Match job title to SOC codes (title-first matching) |
| `/api/soc-match` | GET | Test matching or view DB stats |
| `/api/simulate` | POST | Simulate H-1B selection weight based on salary |
| `/api/refresh` | POST | Trigger data refresh (Federal Register) |
| `/api/refresh` | GET | Check data freshness status |

## Disclaimer

This tool is for informational purposes only and does not constitute legal advice. Always consult a qualified immigration attorney for guidance on your specific situation.

## License

Private. All rights reserved.
