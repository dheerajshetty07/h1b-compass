// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import { Navigation } from '@/components/Navigation'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'H1B Compass - Policy Tracker & Wage Strategy',
  description: 'Track official H-1B policy changes and plan your wage/role strategy using verified government data sources.',
  keywords: 'H-1B, F-1, OPT, STEM OPT, prevailing wage, immigration, visa',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <div className="min-h-screen flex flex-col bg-background text-foreground">
            <Navigation />
            <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
              {children}
            </main>
            <footer className="border-t border-[var(--border)] py-6 mt-12">
              <div className="container mx-auto px-4 max-w-7xl">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
                  <p>
                    <span className="text-foreground">H1B Compass</span> •
                    Data from official government sources only
                  </p>
                  <p className="text-xs text-foreground-subtle">
                    Not legal advice. Consult an immigration attorney for guidance.
                  </p>
                </div>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
