'use client'

import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { useMonthParam } from '@/hooks/useMonthParam'

export function MonthPicker() {
  const { label, goToPrev, goToNext, goToCurrent, isCurrentMonth } = useMonthParam()

  return (
    <div className="flex items-center bg-white/[0.04] border border-white/8 rounded-lg overflow-hidden">
      <button
        onClick={goToPrev}
        className="p-2 text-gray-400 hover:text-white hover:bg-white/8 transition-colors border-r border-white/8"
        title="Previous month"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <button
        onClick={isCurrentMonth ? undefined : goToCurrent}
        className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
          isCurrentMonth
            ? 'text-white cursor-default'
            : 'text-violet-300 hover:text-white hover:bg-white/8 cursor-pointer'
        }`}
        title={isCurrentMonth ? 'Current month' : 'Back to current month'}
      >
        <CalendarDays className="w-3.5 h-3.5 shrink-0" />
        <span className="whitespace-nowrap">{label}</span>
      </button>

      <button
        onClick={goToNext}
        disabled={isCurrentMonth}
        className="p-2 text-gray-400 hover:text-white hover:bg-white/8 transition-colors border-l border-white/8 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Next month"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
