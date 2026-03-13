'use client'

import { useRef, useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartDataset,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import type { ExpenseItem } from '@/lib/expensesApi'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface SpendingChartProps {
  /**
   * Pre-bucketed daily totals from the analytics endpoint (preferred — keeps
   * chart and stats in sync since they share the same API response).
   * Each entry: { period: 'YYYY-MM-DD', total_amount: number }
   */
  trendData?: { period: string; total_amount: number }[]
  /**
   * Raw expenses — used as fallback when trendData is not provided.
   */
  expenses?: ExpenseItem[]
  /** Monthly budget cap — renders a dashed red daily-budget line. */
  budgetAmount?: number
  /** ISO date string — first day of the range (e.g. "2026-05-01") */
  startDate?: string
  /** ISO date string — last day of the range (e.g. "2026-05-31") */
  endDate?: string
}

const pad = (n: number) => String(n).padStart(2, '0')
const localKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Build an ordered array of YYYY-MM-DD strings covering every day in the range. */
function buildDayRange(startDate: string, endDate: string): string[] {
  const days: string[] = []
  const cur = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  while (cur <= end) {
    days.push(localKey(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

/** Last-30-days range as YYYY-MM-DD strings. */
function buildLast30Days(): string[] {
  const days: string[] = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    days.push(localKey(d))
  }
  return days
}

function dayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function SpendingChart({
  trendData,
  expenses = [],
  budgetAmount,
  startDate,
  endDate,
}: SpendingChartProps) {
  const chartRef = useRef<ChartJS<'line'> | null>(null)

  const { labels, spendingData, budgetLine } = useMemo(() => {
    // Determine the day range we're charting
    const dayKeys =
      startDate && endDate
        ? buildDayRange(startDate, endDate)
        : buildLast30Days()

    let totals: number[]

    if (trendData && trendData.length > 0) {
      // Build a lookup from period key → total (server pre-bucketed)
      const byPeriod = new Map(trendData.map(t => [t.period, t.total_amount]))
      // Fill every day — zero for days with no spending
      totals = dayKeys.map(k => byPeriod.get(k) ?? 0)
    } else {
      // Fallback: aggregate raw expenses client-side
      totals = dayKeys.map(key =>
        expenses
          .filter(e => e.date.slice(0, 10) === key)
          .reduce((sum, e) => sum + e.amount, 0)
      )
    }

    const dailyBudget = budgetAmount != null ? budgetAmount / dayKeys.length : null
    const budgetLine =
      dailyBudget != null ? dayKeys.map(() => parseFloat(dailyBudget.toFixed(2))) : null

    return {
      labels: dayKeys.map(dayLabel),
      spendingData: totals,
      budgetLine,
    }
  }, [trendData, expenses, budgetAmount, startDate, endDate])

  const hasData = spendingData.some(v => v > 0)

  const datasets: ChartDataset<'line', number[]>[] = [
    {
      label: 'Spending',
      data: spendingData,
      fill: true,
      borderColor: 'rgb(124, 58, 237)',
      backgroundColor: 'rgba(124, 58, 237, 0.1)',
      tension: 0.4,
    },
  ]

  if (budgetLine) {
    datasets.push({
      label: 'Daily Budget',
      data: budgetLine,
      fill: false,
      borderColor: 'rgb(239, 68, 68)',
      borderDash: [5, 5],
      tension: 0,
      pointRadius: 0,
    })
  }

  const data = { labels, datasets }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#9ca3af', font: { size: 12 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number } }) =>
            `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#6b7280',
          maxTicksLimit: 10,
        },
        grid: { color: 'rgba(255,255,255,0.05)' },
      },
      y: {
        ticks: {
          color: '#6b7280',
          callback: (value: number | string) => `$${value}`,
        },
        grid: { color: 'rgba(255,255,255,0.05)' },
        beginAtZero: true,
      },
    },
  }

  if (!hasData) {
    return (
      <div className="h-80 flex flex-col items-center justify-center text-gray-500">
        <p className="text-sm">No spending data for this period.</p>
        <p className="text-xs mt-1">Add expenses to see your trend here.</p>
      </div>
    )
  }

  return (
    <div className="h-80">
      <Line ref={chartRef} data={data} options={options as never} />
    </div>
  )
}
