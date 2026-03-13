'use client'

import { useEffect, useState } from 'react'
import { Activity, Database, Cpu, Clock } from 'lucide-react'

interface Metrics {
  cache: { hits: number; misses: number; hitRate: number; total: number }
  queue: { depth: number }
  uptime: number
  timestamp: string
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`
}

export function SystemHealth() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Strip trailing /api so this works whether env has it or not
    const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '')

    const fetchMetrics = async () => {
      try {
        const res = await fetch(`${API}/api/admin/metrics`)
        if (!res.ok) throw new Error('unavailable')
        const json = await res.json()
        setMetrics(json.data)
        setError(false)
      } catch {
        setError(true)
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 5000)
    return () => clearInterval(interval)
  }, [])

  const hitRateColor =
    !metrics ? 'text-gray-400'
    : metrics.cache.hitRate >= 80 ? 'text-emerald-400'
    : metrics.cache.hitRate >= 50 ? 'text-amber-400'
    : 'text-red-400'

  const queueColor =
    !metrics ? 'text-gray-400'
    : metrics.queue.depth === 0 ? 'text-emerald-400'
    : metrics.queue.depth < 10 ? 'text-amber-400'
    : 'text-red-400'

  return (
    <div className="bg-[#0F0F1A] border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-violet-400" />
          <h3 className="text-sm font-semibold text-white">System Health</h3>
        </div>
        {!error && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        )}
        {error && (
          <span className="text-xs text-red-400">Unavailable</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Cache Hit Rate */}
        <div className="bg-white/5 border border-white/8 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-gray-400">Cache Hit Rate</span>
          </div>
          <p className={`text-2xl font-bold ${hitRateColor}`}>
            {metrics ? `${metrics.cache.hitRate}%` : '—'}
          </p>
          {metrics && (
            <p className="text-xs text-gray-500 mt-1">
              {metrics.cache.hits.toLocaleString()} hits · {metrics.cache.misses.toLocaleString()} misses
            </p>
          )}
        </div>

        {/* AI Queue Depth */}
        <div className="bg-white/5 border border-white/8 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-gray-400">AI Job Queue</span>
          </div>
          <p className={`text-2xl font-bold ${queueColor}`}>
            {metrics ? metrics.queue.depth : '—'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {metrics?.queue.depth === 0 ? 'All workers idle' : 'Jobs pending'}
          </p>
        </div>

        {/* Total Requests */}
        <div className="bg-white/5 border border-white/8 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-gray-400">Total Requests</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {metrics ? metrics.cache.total.toLocaleString() : '—'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Since last restart</p>
        </div>

        {/* Uptime */}
        <div className="bg-white/5 border border-white/8 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-gray-400">API Uptime</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {metrics ? formatUptime(metrics.uptime) : '—'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Node.js server</p>
        </div>
      </div>

      {/* Redis cache bar */}
      {metrics && metrics.cache.total > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Cache efficiency</span>
            <span>{metrics.cache.hitRate}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all duration-700"
              style={{ width: `${metrics.cache.hitRate}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
