// src/components/Navigation.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, Menu } from 'lucide-react'

const navItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/policy-radar', label: 'Policy Radar' },
    { href: '/wage-strategy', label: 'Wage Strategy' },
    { href: '/resources', label: 'Resources' },
]

export function Navigation() {
    const pathname = usePathname()

    return (
        <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                {/* Logo */}
                <Link
                    href="/"
                    className="group flex items-center gap-2.5"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary transition-colors group-hover:bg-primary-hover">
                        <Compass className="h-4.5 w-4.5 text-primary-foreground" strokeWidth={2} />
                    </div>
                    <span className="text-base font-semibold tracking-tight text-foreground">
                        H1B<span className="text-primary">Compass</span>
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-1">
                    {navItems.map(item => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`relative rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                    isActive
                                        ? 'text-primary'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {isActive && (
                                    <span className="absolute inset-x-1 -bottom-px h-px bg-gradient-to-r from-primary/0 via-primary to-primary/0" />
                                )}
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                {/* Mobile Menu Button */}
                <button
                    className="flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
                    aria-label="Open menu"
                >
                    <Menu className="h-5 w-5" strokeWidth={1.5} />
                </button>
            </div>
        </header>
    )
}
