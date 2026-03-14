'use client'

import { useEffect, useState, Suspense } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useExpenses, useSpendingAnalytics, useBudgets } from '@/hooks/useExpenses'
import { useMonthParam } from '@/hooks/useMonthParam'
import { MonthPicker } from '@/components/layout/MonthPicker'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Plus,
  BarChart3,
  Target,
  MapPin,
  Award,
  AlertTriangle,
  X,
  PiggyBank,
} from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { BudgetOverview } from '@/components/dashboard/BudgetOverview'
import { SystemHealth } from '@/components/dashboard/SystemHealth'
import { SpendingChart } from '@/components/analytics/SpendingChart'
import { AchievementBadge } from '@/components/gamification/AchievementBadge'

function DashboardContent() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [alertDismissed, setAlertDismissed] = useState(false)

  const { startDate, endDate, label: monthLabel, isCurrentMonth } = useMonthParam()

  const { data: expenseResponse } = useExpenses({ limit: 100, startDate, endDate })
  const { data: spendingResponse } = useSpendingAnalytics({ startDate, endDate, groupBy: 'day' })
  const { data: budgetsResponse } = useBudgets({ startDate, endDate })

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-violet-500" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  const expenses = expenseResponse?.data ?? []
  const totalTransactions = spendingResponse?.data?.transactionCount ?? expenseResponse?.pagination?.total ?? 0
  const totalSpent = spendingResponse?.data?.totalSpent ?? 0
  const trendData = spendingResponse?.data?.spendingTrend
  const budgets = budgetsResponse?.data ?? []
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0)
  // Use the filtered totalSpent (for selected month) against monthly budgets
  const budgetUsedPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0

  const stats = [
    {
      title: 'Total Spent',
      value: `$${totalSpent.toFixed(2)}`,
      change: monthLabel,
      changeType: 'neutral' as const,
      icon: DollarSign,
      color: 'text-red-400',
    },
    {
      title: 'Monthly Budget',
      value: totalBudget > 0 ? `$${totalBudget.toLocaleString()}` : 'Not set',
      change: totalBudget > 0 ? `${budgetUsedPct}% used` : 'Set a budget',
      changeType: 'neutral' as const,
      icon: Target,
      color: 'text-blue-400',
    },
    {
      title: 'Budget Left',
      value: totalBudget > 0 ? `$${Math.max(0, totalBudget - totalSpent).toFixed(2)}` : '—',
      change: totalBudget > 0
        ? budgetUsedPct >= 100 ? 'Over budget!' : `${100 - budgetUsedPct}% remaining`
        : 'No budget set',
      changeType: 'neutral' as const,
      icon: TrendingUp,
      color: budgetUsedPct >= 100 ? 'text-red-400' : budgetUsedPct >= 80 ? 'text-amber-400' : 'text-emerald-400',
    },
    {
      title: 'Transactions',
      value: totalTransactions.toString(),
      change: monthLabel,
      changeType: 'neutral' as const,
      icon: Calendar,
      color: 'text-purple-400',
    },
  ]

  return (
    <div className="flex min-h-screen bg-[#0A0A0F]">
      <Sidebar />

      <div className="flex-1 text-white overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Welcome + Month Picker */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
          >
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">
                Welcome back, {user?.name?.split(' ')[0]}
              </h1>
              <p className="text-gray-500">Here&apos;s your financial overview</p>
            </div>
            <MonthPicker />
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="flex flex-wrap gap-3 mb-6"
          >
            <Link
              href="/expenses/new"
              className="flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-cyan-500 text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition-all duration-200 shadow-[0_0_20px_rgba(124,58,237,0.3)] text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </Link>
            <Link
              href="/analytics"
              className="flex items-center space-x-2 bg-white/5 text-gray-300 px-5 py-2.5 rounded-lg border border-white/10 hover:bg-white/8 hover:text-white transition-colors text-sm font-medium"
            >
              <BarChart3 className="w-4 h-4" />
              <span>View Analytics</span>
            </Link>
            <Link
              href="/budgets"
              className="flex items-center space-x-2 bg-white/5 text-gray-300 px-5 py-2.5 rounded-lg border border-white/10 hover:bg-white/8 hover:text-white transition-colors text-sm font-medium"
            >
              <Target className="w-4 h-4" />
              <span>Set Budget</span>
            </Link>
            <Link
              href="/savings"
              className="flex items-center space-x-2 bg-white/5 text-gray-300 px-5 py-2.5 rounded-lg border border-white/10 hover:bg-white/8 hover:text-white transition-colors text-sm font-medium"
            >
              <PiggyBank className="w-4 h-4" />
              <span>Savings Goals</span>
            </Link>
            <Link
              href="/analytics"
              className="flex items-center space-x-2 bg-white/5 text-gray-300 px-5 py-2.5 rounded-lg border border-white/10 hover:bg-white/8 hover:text-white transition-colors text-sm font-medium"
            >
              <MapPin className="w-4 h-4" />
              <span>Location Insights</span>
            </Link>
          </motion.div>

          {/* Budget Alert Banner — only show for current month */}
          {isCurrentMonth && !alertDismissed && totalBudget > 0 && budgetUsedPct >= 80 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 flex items-center justify-between px-4 py-3 rounded-xl border text-sm ${
                budgetUsedPct >= 100
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {budgetUsedPct >= 100 ? (
                  <span>
                    Budget exceeded! You&apos;ve spent{' '}
                    <strong>${(totalSpent - totalBudget).toFixed(2)}</strong>{' '}
                    over your ${totalBudget.toLocaleString()} budget this period.
                  </span>
                ) : (
                  <span>
                    Approaching budget limit —{' '}
                    <strong>{budgetUsedPct}%</strong> of ${totalBudget.toLocaleString()} used this period.
                  </span>
                )}
              </div>
              <button
                onClick={() => setAlertDismissed(true)}
                className="ml-4 p-1 hover:opacity-60 transition-opacity shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8"
          >
            {stats.map((stat) => (
              <div
                key={stat.title}
                className="bg-white/[0.03] border border-white/8 rounded-xl p-5 hover:border-white/15 transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500">{stat.title}</p>
                    <p className="text-xl font-bold text-white mt-1">{stat.value}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">{stat.change}</p>
              </div>
            ))}
          </motion.div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart + Budget */}
            <div className="lg:col-span-2 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="bg-white/[0.03] border border-white/8 rounded-xl p-6"
              >
                <h2 className="text-base font-semibold text-white mb-5">
                  Spending Trend — {monthLabel}
                </h2>
                <SpendingChart
                  trendData={trendData}
                  expenses={expenses}
                  budgetAmount={totalBudget > 0 ? totalBudget : undefined}
                  startDate={startDate}
                  endDate={endDate}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <BudgetOverview budgets={budgets} totalSpentOverride={totalSpent} />
              </motion.div>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
              >
                <RecentTransactions expenses={expenses} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="bg-white/[0.03] border border-white/8 rounded-xl p-6"
              >
                <div className="flex items-center space-x-2 mb-4">
                  <Award className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-semibold text-white">Achievements</h3>
                </div>
                {totalTransactions === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">
                    Add your first expense to unlock achievements
                  </p>
                ) : (
                  <div className="space-y-3">
                    <AchievementBadge
                      achievement={{
                        id: '1',
                        name: 'Getting Started',
                        description: 'Added your first expense',
                        icon: '🎯',
                        unlockedAt: new Date(),
                        progress: 100,
                        maxProgress: 100,
                      }}
                    />
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
              >
                <SystemHealth />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-violet-500" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
