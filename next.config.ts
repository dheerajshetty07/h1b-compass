import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Externalize heavy server-only packages to prevent bundling into serverless functions
  serverExternalPackages: ['adm-zip', 'xlsx', 'csv-parse'],

  // Standalone output for easier deployment on Netlify/Docker
  // Vercel auto-detects Next.js so this is optional there
  output: 'standalone',
};

export default nextConfig;
