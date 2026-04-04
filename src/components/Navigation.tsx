// src/components/Navigation.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, Menu, X, ChevronRight } from 'lucide-react'

const navItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/policy-radar', label: 'Policy Radar' },
    { href: '/wage-strategy', label: 'Wage Strategy' },
    { href: '/resources', label: 'Resources' },
]

export function Navigation() {
    const pathname = usePathname()
    const [mobileOpen, setMobileOpen] = useState(false)

    // Close mobile menu on navigation
    useEffect(() => {
        setMobileOpen(false)
    }, [pathname])

    // Prevent body scroll when menu is open
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [mobileOpen])

    return (
        <>
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
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
                        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                    >
                        {mobileOpen
                            ? <X className="h-5 w-5" strokeWidth={1.5} />
                            : <Menu className="h-5 w-5" strokeWidth={1.5} />
                        }
                    </button>
                </div>
            </header>

            {/* Mobile Navigation Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile Navigation Panel */}
            <div
                className={`fixed inset-x-0 top-14 z-40 bg-background border-b border-border/60 shadow-lg transition-all duration-300 ease-in-out md:hidden ${
                    mobileOpen
                        ? 'translate-y-0 opacity-100'
                        : '-translate-y-full opacity-0 pointer-events-none'
                }`}
            >
                <nav className="px-4 py-4 space-y-1">
                    {navItems.map((item, i) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-all ${
                                    isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                }`}
                                style={{
                                    animationDelay: `${i * 50}ms`,
                                    animation: mobileOpen ? 'slideIn 0.2s ease-out forwards' : 'none'
                                }}
                            >
                                <ChevronRight className={`h-4 w-4 transition-transform ${isActive ? 'rotate-90 text-primary' : ''}`} />
                                {item.label}
                                {isActive && (
                                    <span className="ml-auto h-2 w-2 rounded-full bg-primary" />
                                )}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            {/* Mobile menu animation keyframes */}
            <style>{`
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateX(-8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
            `}</style>
        </>
    )
}
