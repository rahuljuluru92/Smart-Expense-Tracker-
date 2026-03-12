'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Receipt, BarChart3, Target, LogOut, User, PiggyBank } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/expenses', icon: Receipt, label: 'Expenses' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/budgets', icon: Target, label: 'Budgets' },
  { href: '/savings', icon: PiggyBank, label: 'Savings' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { logout, user } = useAuth()

  return (
    <aside className="w-60 bg-[#0B0D15] border-r border-white/[0.06] flex flex-col min-h-screen sticky top-0 shrink-0">
      {/* Logo */}
      <div className="px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(245,158,11,0.4)]">
            <span className="text-base font-black text-[#080B13]">C</span>
          </div>
          <span className="text-base font-bold text-white tracking-tight leading-none">
            Control<span className="text-amber-400">Spending</span>
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-amber-500/12 text-amber-400'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
              }`}
            >
              <item.icon className={`w-4.5 h-4.5 shrink-0 ${active ? 'text-amber-400' : ''}`} style={{ width: 18, height: 18 }} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
          <div className="w-7 h-7 bg-amber-500/20 border border-amber-500/30 rounded-lg flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="text-xs text-white/50 truncate flex-1">{user?.name}</span>
          <button
            onClick={() => logout()}
            className="p-1 text-white/25 hover:text-red-400 transition-colors shrink-0"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
