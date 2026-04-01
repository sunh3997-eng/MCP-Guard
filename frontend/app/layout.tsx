import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'
import { Shield, LayoutDashboard, Wrench, Bell } from 'lucide-react'

export const metadata: Metadata = {
  title: 'MCP-Guard — MCP Security Audit',
  description: 'Security audit platform for Model Context Protocol tools',
}

const navLinks = [
  { href: '/',        label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tools',   label: 'Tools',     icon: Wrench },
  { href: '/alerts',  label: 'Alerts',    icon: Bell },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-900 text-slate-100">
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 border-b border-slate-700/60 bg-slate-900/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            {/* Brand */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 shadow-lg shadow-brand-600/30 transition-transform group-hover:scale-105">
                <Shield className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                MCP<span className="text-brand-400">-Guard</span>
              </span>
            </Link>

            {/* Nav */}
            <nav className="flex items-center gap-1">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        {/* ── Main ───────────────────────────────────────────────────────────── */}
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <footer className="mt-16 border-t border-slate-800 py-6 text-center text-xs text-slate-500">
          MCP-Guard &mdash; MCP Security Audit Platform
        </footer>
      </body>
    </html>
  )
}
