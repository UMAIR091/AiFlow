'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Zap, LayoutDashboard, Plug, Globe, LogOut } from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/builder', label: 'Builder', icon: Zap },
  { href: '/connect', label: 'Connections', icon: Plug },
  { href: '/generate-site', label: 'Sites', icon: Globe },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="h-16 bg-surface border-b border-border flex items-center px-6 gap-6 sticky top-0 z-50">
      <Link href="/dashboard" className="flex items-center gap-2 mr-4">
        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-white">AutoFlow</span>
      </Link>

      <div className="flex items-center gap-1 flex-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                active ? 'bg-accent/15 text-accent-light' : 'text-muted hover:text-white hover:bg-surface-2'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 rounded-lg bg-accent/10"
                  style={{ position: 'absolute' }}
                />
              )}
            </Link>
          )
        })}
      </div>

      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 text-sm text-muted hover:text-white transition-colors ml-auto"
      >
        <LogOut className="w-4 h-4" />
        Sign out
      </button>
    </nav>
  )
}
