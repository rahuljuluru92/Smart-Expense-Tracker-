'use client'

import { useEffect, useState, Suspense } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useBudgets, useCreateBudget, useDeleteBudget, useUpdateBudget } from '@/hooks/useExpenses'
import { useMonthParam } from '@/hooks/useMonthParam'
import { MonthPicker } from '@/components/layout/MonthPicker'
import type { BudgetItem } from '@/lib/expensesApi'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target, Loader2, AlertTriangle, CheckCircle, Plus, X, Trash2, ChevronDown, Pencil, Check,
} from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import toast from 'react-hot-toast'

const PERIODS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

const inputClass =
  'w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors'

const smallInputClass =
  'w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors text-sm'

interface EditState { id: string; amount: string; period: string }

function BudgetsContent() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const { startDate, endDate, label: monthLabel } = useMonthParam()
  const { data: budgetsResponse, isLoading: loadingBudgets } = useBudgets({ startDate, endDate })
  const createBudget = useCreateBudget()
  const deleteBudget = useDeleteBudget()
  const updateBudget = useUpdateBudget()

  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [period, setPeriod] = useState('monthly')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)

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

  const budgets = budgetsResponse?.data ?? []

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (!amount || isNaN(parsed) || parsed <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    try {
      await createBudget.mutateAsync({ amount: parsed, period })
      toast.success(`${period.charAt(0).toUpperCase() + period.slice(1)} budget of $${parsed.toLocaleString()} created`)
      setAmount('')
      setPeriod('monthly')
      setShowForm(false)
    } catch {
      toast.error('Failed to create budget')
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteBudget.mutateAsync(id)
      toast.success('Budget removed')
    } catch {
      toast.error('Failed to remove budget')
    } finally {
      setDeletingId(null)
    }
  }

  const startEdit = (budget: BudgetItem) => {
    setEditState({ id: budget.id, amount: budget.amount.toString(), period: budget.period })
  }

  const handleSaveEdit = async () => {
    if (!editState) return
    const parsed = parseFloat(editState.amount)
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    try {
      await updateBudget.mutateAsync({ id: editState.id, body: { amount: parsed, period: editState.period } })
      toast.success('Budget updated')
      setEditState(null)
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.errors?.[0]?.msg || 'Failed to update budget'
      toast.error(msg)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0F]">
      <Sidebar />

      <div className="flex-1 text-white overflow-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <Target className="w-6 h-6 text-violet-400" />
                <h1 className="text-3xl font-bold text-white">Budgets</h1>
              </div>
              <p className="text-gray-500">Spending vs limits — {monthLabel}</p>
            </div>
            <div className="flex items-center gap-3">
              <MonthPicker />
              <button
                onClick={() => { setShowForm(!showForm); setEditState(null) }}
                className="flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-cyan-500 text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition-all text-sm font-medium shadow-[0_0_20px_rgba(124,58,237,0.3)] whitespace-nowrap"
              >
                {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{showForm ? 'Cancel' : 'New Budget'}</span>
              </button>
            </div>
          </motion.div>

          {/* Create form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden"
              >
                <form
                  onSubmit={handleCreate}
                  className="bg-white/[0.04] border border-violet-500/30 rounded-xl p-6 space-y-4"
                >
                  <h2 className="text-base font-semibold text-white">Create a new budget</h2>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Amount (USD)</label>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="e.g. 500"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className={inputClass}
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Period</label>
                      <div className="relative">
                        <select
                          value={period}
                          onChange={e => setPeriod(e.target.value)}
                          className={`${inputClass} appearance-none cursor-pointer pr-10`}
                        >
                          {PERIODS.map(p => (
                            <option key={p.value} value={p.value} className="bg-[#0D0D14]">
                              {p.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 pt-1">
                    <button
                      type="submit"
                      disabled={createBudget.isPending}
                      className="flex-1 bg-gradient-to-r from-violet-600 to-cyan-500 text-white py-2.5 rounded-lg font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {createBudget.isPending ? 'Creating…' : 'Create Budget'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2.5 text-gray-400 hover:text-white border border-white/10 rounded-lg text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Budget list */}
          {loadingBudgets ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
          ) : budgets.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
                <Target className="w-8 h-8 text-gray-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-400 mb-2">No budgets yet</h2>
              <p className="text-gray-600 max-w-sm text-sm mb-6">
                Create a budget to set spending limits and get notified when you&apos;re close to the edge.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-cyan-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create your first budget</span>
              </button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {budgets.map((budget, index) => {
                const pct = Math.min(Math.round(budget.spentPercentage), 100)
                const isDeleting = deletingId === budget.id
                const isEditing = editState?.id === budget.id

                const barColor =
                  budget.status === 'critical' ? 'bg-red-500' :
                  budget.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'

                const StatusIcon = budget.status === 'good' ? CheckCircle : AlertTriangle
                const statusColor =
                  budget.status === 'critical' ? 'text-red-400' :
                  budget.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'

                return (
                  <motion.div
                    key={budget.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white/[0.03] border border-white/8 rounded-xl p-6 hover:border-white/15 transition-all group"
                  >
                    <AnimatePresence mode="wait">
                      {isEditing ? (
                        <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <h3 className="text-sm font-semibold text-white mb-4">Edit budget</h3>
                          <div className="grid sm:grid-cols-2 gap-3 mb-4">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Amount (USD)</label>
                              <input
                                type="number"
                                min="1"
                                step="0.01"
                                value={editState.amount}
                                onChange={e => setEditState({ ...editState, amount: e.target.value })}
                                className={smallInputClass}
                                autoFocus
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Period</label>
                              <div className="relative">
                                <select
                                  value={editState.period}
                                  onChange={e => setEditState({ ...editState, period: e.target.value })}
                                  className={`${smallInputClass} appearance-none cursor-pointer pr-8`}
                                >
                                  {PERIODS.map(p => (
                                    <option key={p.value} value={p.value} className="bg-[#0D0D14]">{p.label}</option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={handleSaveEdit}
                              disabled={updateBudget.isPending}
                              className="flex items-center space-x-1.5 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              {updateBudget.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              <span>Save</span>
                            </button>
                            <button
                              onClick={() => setEditState(null)}
                              className="flex items-center space-x-1.5 text-gray-400 hover:text-white border border-white/10 px-4 py-2 rounded-lg text-sm transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <div className="flex items-start justify-between mb-5">
                            <div>
                              <div className="flex items-center space-x-2 mb-0.5">
                                <span className="text-base font-semibold text-white capitalize">
                                  {budget.period} budget
                                </span>
                                {budget.isActive && (
                                  <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5 font-medium">
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">
                                ${budget.spent.toLocaleString()} spent of ${budget.amount.toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className={`flex items-center space-x-1.5 ${statusColor}`}>
                                <StatusIcon className="w-4 h-4" />
                                <span className="text-sm font-semibold">{pct}%</span>
                              </div>
                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => startEdit(budget)}
                                  className="p-1.5 text-gray-600 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all"
                                  title="Edit budget"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(budget.id)}
                                  disabled={isDeleting}
                                  className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                                  title="Delete budget"
                                >
                                  {isDeleting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="w-full bg-white/10 rounded-full h-2 mb-4 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.05 }}
                              className={`h-2 rounded-full ${barColor}`}
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-3 bg-white/[0.02] rounded-lg">
                              <p className="text-[11px] text-gray-500 mb-1">Budget</p>
                              <p className="text-sm font-semibold text-white">${budget.amount.toLocaleString()}</p>
                            </div>
                            <div className="text-center p-3 bg-white/[0.02] rounded-lg">
                              <p className="text-[11px] text-gray-500 mb-1">Spent</p>
                              <p className="text-sm font-semibold text-red-400">${budget.spent.toLocaleString()}</p>
                            </div>
                            <div className="text-center p-3 bg-white/[0.02] rounded-lg">
                              <p className="text-[11px] text-gray-500 mb-1">Remaining</p>
                              <p className="text-sm font-semibold text-emerald-400">${budget.remaining.toLocaleString()}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BudgetsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-violet-500" />
        </div>
      }
    >
      <BudgetsContent />
    </Suspense>
  )
}
