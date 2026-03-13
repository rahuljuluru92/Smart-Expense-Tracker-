'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Target, AlertTriangle, CheckCircle, PlusCircle } from 'lucide-react'
import { BudgetItem } from '@/lib/expensesApi'

interface BudgetOverviewProps {
  budgets: BudgetItem[]
  totalSpentOverride?: number
}

const statusIcon = (status: BudgetItem['status']) => {
  if (status === 'critical') return <AlertTriangle className="w-4 h-4 text-red-400" />
  if (status === 'warning') return <AlertTriangle className="w-4 h-4 text-yellow-400" />
  return <CheckCircle className="w-4 h-4 text-emerald-400" />
}

const barColor = (status: BudgetItem['status']) => {
  if (status === 'critical') return 'bg-red-500'
  if (status === 'warning') return 'bg-yellow-500'
  return 'bg-emerald-500'
}

export function BudgetOverview({ budgets, totalSpentOverride }: BudgetOverviewProps) {
  if (budgets.length === 0) {
    return (
      <div className="bg-white/[0.03] border border-white/8 rounded-xl p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Target className="w-5 h-5 text-violet-400" />
          <h2 className="text-base font-semibold text-white">Budget Overview</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Target className="w-10 h-10 text-gray-600 mb-3" />
          <p className="text-sm text-gray-500">No budgets set yet</p>
          <Link
            href="/budgets"
            className="mt-3 text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            Set your first budget →
          </Link>
        </div>
      </div>
    )
  }

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0)
  const totalSpent = totalSpentOverride ?? budgets[0]?.spent ?? 0
  const totalPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0

  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Target className="w-5 h-5 text-violet-400" />
          <h2 className="text-base font-semibold text-white">Budget Overview</h2>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Total Budget</p>
          <p className="text-sm font-semibold text-white">${totalBudget.toLocaleString()}</p>
        </div>
      </div>

      {/* Overall progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Overall</span>
          <span className="text-xs font-semibold text-gray-300">{totalPct}%</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(totalPct, 100)}%` }}
            transition={{ duration: 0.8 }}
            className={`h-2 rounded-full ${totalPct >= 90 ? 'bg-red-500' : totalPct >= 75 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-gray-500">
          <span>Spent: ${totalSpent.toLocaleString()}</span>
          <span>Left: ${(totalBudget - totalSpent).toLocaleString()}</span>
        </div>
      </div>

      {/* Per-budget breakdown */}
      <div className="space-y-3">
        {budgets.map((budget, index) => (
          <motion.div
            key={budget.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="p-3 rounded-lg bg-white/[0.02] border border-white/5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300 capitalize">{budget.period} budget</span>
              <div className="flex items-center space-x-1.5">
                {statusIcon(budget.status)}
                <span className="text-xs text-gray-400">{Math.round(budget.spentPercentage)}%</span>
              </div>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(budget.spentPercentage, 100)}%` }}
                transition={{ duration: 0.6, delay: index * 0.08 }}
                className={`h-1.5 rounded-full ${barColor(budget.status)}`}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-gray-500">
              <span>${budget.spent} / ${budget.amount}</span>
              <span>${budget.remaining} left</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-white/8">
        <Link
          href="/budgets"
          className="flex items-center justify-center space-x-2 w-full text-xs text-violet-400 hover:text-violet-300 transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Manage budgets</span>
        </Link>
      </div>
    </div>
  )
}
