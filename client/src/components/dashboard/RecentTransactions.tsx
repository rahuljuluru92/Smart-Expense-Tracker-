'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Clock, TrendingDown, Receipt } from 'lucide-react'
import { ExpenseItem } from '@/lib/expensesApi'

interface RecentTransactionsProps {
  expenses: ExpenseItem[]
}

const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr)
  const diffInHours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60))
  if (diffInHours < 1) return 'Just now'
  if (diffInHours < 24) return `${diffInHours}h ago`
  return `${Math.floor(diffInHours / 24)}d ago`
}

export function RecentTransactions({ expenses }: RecentTransactionsProps) {
  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold text-white">Recent Transactions</h3>
        <Link href="/expenses" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
          View all →
        </Link>
      </div>

      {expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Receipt className="w-10 h-10 text-gray-600 mb-3" />
          <p className="text-sm text-gray-500">No expenses yet</p>
          <Link
            href="/expenses/new"
            className="mt-3 text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            Add your first expense →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.slice(0, 5).map((expense, index) => (
            <motion.div
              key={expense.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.07 }}
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                <span className="text-base">{expense.category.icon ?? '💳'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{expense.description}</p>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-xs text-gray-500">{expense.category.name}</span>
                  <span className="text-gray-700">•</span>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-gray-600" />
                    <span className="text-xs text-gray-500">{formatTimeAgo(expense.date)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1 shrink-0">
                <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                <span className="text-sm font-semibold text-red-400">
                  -{expense.currency === 'USD' ? '$' : expense.currency}{expense.amount.toFixed(2)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
