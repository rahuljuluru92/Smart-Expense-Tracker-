'use client'

import { useEffect, Suspense } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useExpenses, useSpendingAnalytics } from '@/hooks/useExpenses'
import { useMonthParam } from '@/hooks/useMonthParam'
import { MonthPicker } from '@/components/layout/MonthPicker'
import { motion } from 'framer-motion'
import { BarChart3, Loader2 } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { SpendingOverview } from '@/components/dashboard/SpendingOverview'
import { SpendingChart } from '@/components/analytics/SpendingChart'

function AnalyticsContent() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  const { startDate, endDate, label: monthLabel } = useMonthParam()

  const { data: spendingResponse, isLoading: loadingSpending } = useSpendingAnalytics({ startDate, endDate, groupBy: 'day' })
  const { data: expenseResponse } = useExpenses({ limit: 200, startDate, endDate })

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login')
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-violet-500" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  const spending = spendingResponse?.data
  const totalTransactions = spending?.transactionCount ?? 0
  const trendData = spending?.spendingTrend
  const expenses = expenseResponse?.data ?? []
  const topCategory =
    spending?.categorySpending?.sort((a, b) => b.amount - a.amount)[0]?.category?.name

  return (
    <div className="flex min-h-screen bg-[#0A0A0F]">
      <Sidebar />

      <div className="flex-1 text-white overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
          >
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <BarChart3 className="w-6 h-6 text-violet-400" />
                <h1 className="text-3xl font-bold text-white">Analytics</h1>
              </div>
              <p className="text-gray-500">Your spending breakdown</p>
            </div>
            <MonthPicker />
          </motion.div>

          {loadingSpending ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary cards */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                <SpendingOverview
                  totalSpent={spending?.totalSpent ?? 0}
                  averageDaily={spending?.averageDaily ?? 0}
                  transactionCount={totalTransactions}
                  changePercentage={spending?.monthlyComparison?.changePercentage ?? 0}
                  topCategory={topCategory}
                  periodLabel={monthLabel}
                />
              </motion.div>

              {/* Chart */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/[0.03] border border-white/8 rounded-xl p-6"
              >
                <h2 className="text-base font-semibold text-white mb-5">
                  Spending Trend — {monthLabel}
                </h2>
                <SpendingChart
                  trendData={trendData}
                  expenses={expenses}
                  startDate={startDate}
                  endDate={endDate}
                />
              </motion.div>

              {/* Category breakdown */}
              {(spending?.categorySpending?.length ?? 0) > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="bg-white/[0.03] border border-white/8 rounded-xl p-6"
                >
                  <h2 className="text-base font-semibold text-white mb-5">By Category</h2>
                  <div className="space-y-3">
                    {spending?.categorySpending
                      ?.sort((a, b) => b.amount - a.amount)
                      .map((item, index) => {
                        const pct =
                          spending.totalSpent > 0
                            ? Math.round((item.amount / spending.totalSpent) * 100)
                            : 0
                        return (
                          <div key={index} className="flex items-center space-x-3">
                            <span className="text-lg w-7 shrink-0">
                              {item.category?.icon ?? '💳'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between mb-1">
                                <span className="text-sm text-gray-300">
                                  {item.category?.name ?? 'Unknown'}
                                </span>
                                <span className="text-sm font-semibold text-white">
                                  ${item.amount.toFixed(2)}
                                </span>
                              </div>
                              <div className="w-full bg-white/10 rounded-full h-1.5">
                                <div
                                  className="h-1.5 rounded-full bg-violet-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-xs text-gray-500 w-8 text-right shrink-0">
                              {pct}%
                            </span>
                          </div>
                        )
                      })}
                  </div>
                </motion.div>
              )}

              {/* Empty state */}
              {!spending?.totalSpent && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <BarChart3 className="w-14 h-14 text-gray-700 mb-4" />
                  <h2 className="text-lg font-semibold text-gray-400 mb-2">No data for {monthLabel}</h2>
                  <p className="text-gray-600">Add expenses to see your analytics</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-violet-500" />
        </div>
      }
    >
      <AnalyticsContent />
    </Suspense>
  )
}
