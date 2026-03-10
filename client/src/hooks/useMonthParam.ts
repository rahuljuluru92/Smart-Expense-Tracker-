'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

function todayMonthStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function monthBounds(month: string): { startDate: string; endDate: string } {
  const [y, m] = month.split('-').map(Number)
  const start = `${month}-01`
  // new Date(y, m, 0) = last day of month m (month is 1-based here, so Date treats m as next month, day 0 = last of current)
  const lastDay = new Date(y, m, 0).getDate()
  const end = `${month}-${String(lastDay).padStart(2, '0')}`
  return { startDate: start, endDate: end }
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function useMonthParam() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const month = searchParams.get('month') ?? todayMonthStr()
  const { startDate, endDate } = monthBounds(month)

  const setMonth = useCallback(
    (m: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('month', m)
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const goToPrev = useCallback(() => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 2, 1) // step back one month
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }, [month, setMonth])

  const goToNext = useCallback(() => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m, 1) // step forward one month
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (next <= todayMonthStr()) setMonth(next)
  }, [month, setMonth])

  const goToCurrent = useCallback(() => setMonth(todayMonthStr()), [setMonth])

  const isCurrentMonth = month === todayMonthStr()
  const label = monthLabel(month)

  return { month, startDate, endDate, setMonth, goToPrev, goToNext, goToCurrent, isCurrentMonth, label }
}
