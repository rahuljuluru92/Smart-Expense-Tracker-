'use client'

import { useAuth } from '@/hooks/useAuth'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, ScanLine, Target, TrendingUp, ShieldCheck, UploadCloud, Sparkles, PieChart } from 'lucide-react'

// ── Inline mock dashboard ─────────────────────────────────────────────────────
function DashboardMock() {
  return (
    <div className="w-full bg-[#0F1320] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.06]">
        <div className="w-2 h-2 rounded-full bg-red-500/50" />
        <div className="w-2 h-2 rounded-full bg-amber-500/50" />
        <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
        <span className="ml-auto text-[10px] text-white/20 font-medium tracking-wide">Dashboard</span>
      </div>
      <div className="p-4 space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'SPENT', value: '$1,240', color: 'text-red-400' },
            { label: 'BUDGET', value: '$2,000', color: 'text-white' },
            { label: 'LEFT', value: '$760', color: 'text-emerald-400' },
          ].map(s => (
            <div key={s.label} className="bg-white/[0.04] rounded-lg p-2.5">
              <p className="text-[9px] font-semibold text-white/25 tracking-widest mb-1">{s.label}</p>
              <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
        {/* Chart */}
        <div className="bg-white/[0.03] rounded-xl p-3">
          <p className="text-[10px] text-white/25 mb-2 font-medium">May 2026</p>
          <svg viewBox="0 0 240 60" className="w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,50 C30,46 50,38 70,32 C90,26 100,28 120,22 C140,16 160,12 180,10 C200,8 220,14 240,12 L240,60 L0,60 Z" fill="url(#chartGrad)" />
            <path d="M0,50 C30,46 50,38 70,32 C90,26 100,28 120,22 C140,16 160,12 180,10 C200,8 220,14 240,12" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="0" y1="42" x2="240" y2="42" stroke="#EF4444" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.4"/>
          </svg>
        </div>
        {/* Transactions */}
        <div className="space-y-1.5">
          {[
            { icon: '🛒', name: 'Whole Foods', amount: '-$87', cat: 'Groceries' },
            { icon: '🚗', name: 'Uber', amount: '-$24', cat: 'Transport' },
            { icon: '☕', name: 'Blue Bottle', amount: '-$6', cat: 'Food' },
          ].map(t => (
            <div key={t.name} className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-white/[0.04] rounded-lg flex items-center justify-center text-xs shrink-0">{t.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/80 truncate">{t.name}</p>
                <p className="text-[9px] text-white/25">{t.cat}</p>
              </div>
              <span className="text-xs font-semibold text-red-400 shrink-0">{t.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated && !isLoading) router.push('/dashboard')
  }, [isAuthenticated, isLoading, router])

  return (
    <div className="min-h-screen bg-[#080B13] text-white selection:bg-amber-500/30">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center shadow-[0_0_14px_rgba(245,158,11,0.4)]">
            <span className="text-sm font-black text-[#080B13]">C</span>
          </div>
          <span className="text-[15px] font-bold tracking-tight">
            Control<span className="text-amber-400">Spending</span>
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-7 text-[13px] text-white/45">
          <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="text-[13px] text-white/45 hover:text-white transition-colors px-3 py-2">
            Login
          </Link>
          <Link
            href="/register"
            className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-[#080B13] font-bold text-[13px] px-5 py-2 rounded-xl transition-all duration-200 shadow-[0_0_14px_rgba(245,158,11,0.3)]"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid lg:grid-cols-[1fr_420px] gap-14 items-center">
        {/* left */}
        <div>
          <p className="inline-flex items-center gap-2 text-amber-400 text-[11px] font-bold tracking-[0.15em] uppercase mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Personal Finance · AI-powered
          </p>

          <h1 className="text-[52px] lg:text-[60px] font-extrabold leading-[1.06] tracking-tight mb-6">
            Simple way to<br />
            manage{' '}
            <span className="text-amber-400">personal</span>
            <br />
            finances
          </h1>

          <p className="text-[17px] text-white/45 leading-relaxed mb-10 max-w-[400px]">
            Add expenses in seconds, scan receipts with AI, and see
            exactly where your money goes — with no spreadsheets.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-[#080B13] font-bold px-8 py-4 rounded-xl transition-all duration-200 text-[15px] shadow-[0_0_24px_rgba(245,158,11,0.35)]"
            >
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center border border-white/10 hover:border-white/25 text-white/60 hover:text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 text-[15px]"
            >
              Sign in
            </Link>
          </div>

          {/* honest trust line */}
          <p className="mt-7 text-xs text-white/20 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/60" />
            Free to use · No credit card · Your data stays private
          </p>
        </div>

        {/* right — mock UI */}
        <div>
          <DashboardMock />
        </div>
      </section>

      {/* ── Trust tiles (honest) ─────────────────────────────────────────────── */}
      <div className="border-y border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: ShieldCheck, label: '100% private', sub: 'Your data never sold', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { icon: ScanLine,    label: 'AI receipt scan', sub: 'OCR + LLM pipeline', color: 'text-amber-400',   bg: 'bg-amber-500/10' },
            { icon: Target,      label: '15 categories', sub: 'Auto-classified',       color: 'text-blue-400',   bg: 'bg-blue-500/10' },
            { icon: TrendingUp,  label: 'Month picker',  sub: 'Full history view',    color: 'text-violet-400', bg: 'bg-violet-500/10' },
          ].map(t => (
            <div key={t.label} className="flex flex-col items-center text-center gap-3">
              <div className={`w-12 h-12 ${t.bg} rounded-2xl flex items-center justify-center`}>
                <t.icon className={`w-5 h-5 ${t.color}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{t.label}</p>
                <p className="text-xs text-white/30 mt-0.5">{t.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold tracking-tight mb-3">How it works</h2>
          <p className="text-white/40 text-lg">Three steps to get your finances under control</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 relative">
          {/* connector line (desktop) */}
          <div className="hidden md:block absolute top-10 left-[calc(16.67%+16px)] right-[calc(16.67%+16px)] h-px bg-white/[0.06]" />

          {[
            {
              step: '01',
              icon: UploadCloud,
              title: 'Add your expenses',
              desc: 'Type in a transaction manually or snap a receipt photo — our AI fills in the merchant, amount, and category for you.',
            },
            {
              step: '02',
              icon: Target,
              title: 'Set a budget',
              desc: 'Create daily, weekly, or monthly spending limits. Get a visual warning before you hit the edge.',
            },
            {
              step: '03',
              icon: Sparkles,
              title: 'See the patterns',
              desc: 'Browse any past month with the time picker. Spot your top categories and daily spending rhythm in seconds.',
            },
          ].map((s, i) => (
            <div key={i} className="bg-[#0F1320] border border-white/[0.07] rounded-2xl p-6 relative">
              <span className="text-[11px] font-black text-amber-500/50 tracking-widest">{s.step}</span>
              <div className="w-10 h-10 bg-amber-500/12 rounded-xl flex items-center justify-center mt-3 mb-4">
                <s.icon className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">{s.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features grid ────────────────────────────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-2 gap-5">
          {/* big feature card */}
          <div className="bg-[#0F1320] border border-white/[0.07] rounded-2xl p-7 flex flex-col justify-between min-h-[200px] md:row-span-2">
            <div>
              <div className="w-11 h-11 bg-amber-500/12 rounded-xl flex items-center justify-center mb-5">
                <ScanLine className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">AI receipt scanning</h3>
              <p className="text-white/40 text-sm leading-relaxed">
                Upload a receipt image — Tesseract OCR reads the text, then a language model extracts
                the merchant, total amount, date, and picks the right category automatically.
                No manual data entry.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs text-amber-400/70">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-pulse" />
              Async job queue — never blocks the UI
            </div>
          </div>

          {[
            {
              icon: PieChart,
              color: 'text-blue-400',
              bg: 'bg-blue-500/12',
              title: 'Spending breakdown',
              desc: 'Category-level pie chart, daily trend line, and month-over-month comparison.',
            },
            {
              icon: Target,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/12',
              title: 'Live budget tracking',
              desc: 'Budgets recalculate in real time as you log expenses. Colour-coded status bars show your health at a glance.',
            },
            {
              icon: TrendingUp,
              color: 'text-violet-400',
              bg: 'bg-violet-500/12',
              title: 'Month navigation',
              desc: 'Jump to any past month with the date picker. All charts, budgets, and stats update to match.',
            },
          ].map(f => (
            <div key={f.title} className="bg-[#0F1320] border border-white/[0.07] rounded-2xl p-6 hover:border-white/15 transition-colors">
              <div className={`w-9 h-9 ${f.bg} rounded-xl flex items-center justify-center mb-4`}>
                <f.icon className={`w-4 h-4 ${f.color}`} />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">{f.title}</h3>
              <p className="text-sm text-white/35 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="bg-[#0F1320] border border-amber-500/15 rounded-2xl px-8 py-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.04] to-transparent pointer-events-none" />
          <div className="relative">
            <h2 className="text-3xl font-extrabold tracking-tight mb-3">
              Ready to take control?
            </h2>
            <p className="text-white/35 mb-8 text-base max-w-sm mx-auto">
              Free to use, no card needed. Start tracking in under a minute.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-[#080B13] font-bold px-10 py-4 rounded-xl transition-all duration-200 text-[15px] shadow-[0_0_24px_rgba(245,158,11,0.3)]"
            >
              Create free account
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
              <span className="text-xs font-black text-[#080B13]">C</span>
            </div>
            <span className="text-sm font-bold">Control<span className="text-amber-400">Spending</span></span>
          </div>
          <p className="text-xs text-white/20">A personal finance tracker — built for clarity, not clutter.</p>
          <div className="flex gap-5 text-xs text-white/25">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
