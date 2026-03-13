'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, DollarSign, Calendar, BarChart2 } from 'lucide-react'

interface SpendingOverviewProps {
  totalSpent: number
  averageDaily: number
  transactionCount: number
  changePercentage: number
  topCategory?: string
  /** Human-readable period label e.g. "May 2026" */
  periodLabel?: string
}

export function SpendingOverview({
  totalSpent,
  averageDaily,
  transactionCount,
  changePercentage,
  topCategory,
  periodLabel,
}: SpendingOverviewProps) {
  const isIncrease = changePercentage >= 0
  const periodText = periodLabel ?? 'This period'

  const cards = [
    {
      label: 'Total Spending',
      value: `$${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      accent: 'text-violet-400',
      bg: 'from-violet-600/10 to-violet-600/5',
      footer: (
        <div className="flex items-center mt-2">
          {isIncrease ? (
            <TrendingUp className="w-3.5 h-3.5 text-red-400 mr-1" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-emerald-400 mr-1" />
          )}
          <span className={`text-xs font-medium ${isIncrease ? 'text-red-400' : 'text-emerald-400'}`}>
            {isIncrease ? '+' : ''}{changePercentage.toFixed(1)}% vs last month
          </span>
        </div>
      ),
    },
    {
      label: 'Avg. Daily',
      value: `$${averageDaily.toFixed(2)}`,
      icon: TrendingUp,
      accent: 'text-cyan-400',
      bg: 'from-cyan-600/10 to-cyan-600/5',
      footer: <p className="text-xs text-gray-500 mt-2">Per day average</p>,
    },
    {
      label: 'Transactions',
      value: transactionCount.toString(),
      icon: Calendar,
      accent: 'text-purple-400',
      bg: 'from-purple-600/10 to-purple-600/5',
      footer: <p className="text-xs text-gray-500 mt-2">{periodText}</p>,
    },
    {
      label: 'Top Category',
      value: topCategory ?? '—',
      icon: BarChart2,
      accent: 'text-amber-400',
      bg: 'from-amber-600/10 to-amber-600/5',
      footer: <p className="text-xs text-gray-500 mt-2">Highest spend</p>,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className={`bg-gradient-to-br ${card.bg} border border-white/8 rounded-xl p-4`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium ${card.accent}`}>{card.label}</p>
              <p className="text-xl font-bold text-white mt-1">{card.value}</p>
            </div>
            <card.icon className={`w-7 h-7 ${card.accent}`} />
          </div>
          {card.footer}
        </motion.div>
      ))}
    </div>
  )
}
