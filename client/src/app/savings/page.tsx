'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useSavingsGoals, useCreateSavingsGoal, useUpdateSavingsGoal, useDeleteSavingsGoal } from '@/hooks/useExpenses'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PiggyBank, Plus, X, Trash2, Loader2, Target, TrendingUp,
  ChevronDown, CheckCircle, PlusCircle, Calendar,
} from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import toast from 'react-hot-toast'
import type { SavingsGoal } from '@/lib/expensesApi'

const GOAL_TYPES = [
  { value: 'fd', label: 'Fixed Deposit', emoji: '🏦', description: 'Bank FD / Term deposit' },
  { value: 'stocks', label: 'Stocks', emoji: '📈', description: 'Equity investments' },
  { value: 'real_estate', label: 'Real Estate', emoji: '🏠', description: 'Property purchase' },
  { value: 'emergency_fund', label: 'Emergency Fund', emoji: '🛡️', description: '3-6 months expenses' },
  { value: 'crypto', label: 'Crypto', emoji: '₿', description: 'Cryptocurrency' },
  { value: 'travel', label: 'Travel', emoji: '✈️', description: 'Vacation fund' },
  { value: 'other', label: 'Other', emoji: '💰', description: 'Custom goal' },
]

const inputClass = 'w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors text-sm'

function getGoalType(type: string) {
  return GOAL_TYPES.find(t => t.value === type) ?? GOAL_TYPES[6]
}

function daysLeft(deadline: string): number {
  const diff = new Date(deadline).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function SavingsPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const { data: goalsResponse, isLoading: loadingGoals } = useSavingsGoals()
  const createGoal = useCreateSavingsGoal()
  const updateGoal = useUpdateSavingsGoal()
  const deleteGoal = useDeleteSavingsGoal()

  const [showForm, setShowForm] = useState(false)
  const [addFundsGoal, setAddFundsGoal] = useState<SavingsGoal | null>(null)
  const [addAmount, setAddAmount] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [form, setForm] = useState({ name: '', type: 'emergency_fund', targetAmount: '', savedAmount: '', deadline: '', notes: '' })

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login')
  }, [isAuthenticated, isLoading, router])

  if (isLoading) return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-violet-500" />
    </div>
  )
  if (!isAuthenticated) return null

  const goals = goalsResponse?.data ?? []
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0)
  const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0)
  const overallPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const target = parseFloat(form.targetAmount)
    const saved = parseFloat(form.savedAmount || '0')
    if (!form.name.trim() || isNaN(target) || target <= 0) { toast.error('Name and target amount are required'); return }
    try {
      await createGoal.mutateAsync({
        name: form.name.trim(), type: form.type, targetAmount: target,
        savedAmount: saved || 0,
        deadline: form.deadline || undefined, notes: form.notes || undefined,
      })
      toast.success('Savings goal created!')
      setForm({ name: '', type: 'emergency_fund', targetAmount: '', savedAmount: '', deadline: '', notes: '' })
      setShowForm(false)
    } catch { toast.error('Failed to create goal') }
  }

  const handleAddFunds = async () => {
    if (!addFundsGoal) return
    const amount = parseFloat(addAmount)
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); return }
    try {
      await updateGoal.mutateAsync({ id: addFundsGoal.id, body: { savedAmount: addFundsGoal.savedAmount + amount } })
      toast.success(`Added $${amount.toFixed(2)} to ${addFundsGoal.name}`)
      setAddFundsGoal(null); setAddAmount('')
    } catch { toast.error('Failed to update goal') }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteGoal.mutateAsync(id)
      toast.success('Goal removed')
    } catch { toast.error('Failed to remove goal') }
    finally { setDeletingId(null) }
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0F]">
      <Sidebar />
      <div className="flex-1 text-white overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <PiggyBank className="w-6 h-6 text-emerald-400" />
                <h1 className="text-3xl font-bold text-white">Savings Goals</h1>
              </div>
              <p className="text-gray-500">Track your financial goals — FD, stocks, real estate and more</p>
            </div>
            <button onClick={() => setShowForm(!showForm)} className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-500 text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition-all text-sm font-medium shadow-[0_0_20px_rgba(16,185,129,0.25)]">
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{showForm ? 'Cancel' : 'New Goal'}</span>
            </button>
          </motion.div>

          {/* Summary */}
          {goals.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Total Target', value: `$${totalTarget.toLocaleString()}`, color: 'text-white' },
                { label: 'Total Saved', value: `$${totalSaved.toLocaleString()}`, color: 'text-emerald-400' },
                { label: 'Overall Progress', value: `${overallPct}%`, color: overallPct >= 100 ? 'text-emerald-400' : overallPct >= 50 ? 'text-amber-400' : 'text-gray-400' },
              ].map(s => (
                <div key={s.label} className="bg-white/[0.03] border border-white/8 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </motion.div>
          )}

          {/* Create form */}
          <AnimatePresence>
            {showForm && (
              <motion.form key="form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleCreate} className="overflow-hidden mb-6">
                <div className="bg-white/[0.04] border border-emerald-500/30 rounded-xl p-6 space-y-4">
                  <h2 className="text-base font-semibold text-white">Create savings goal</h2>

                  {/* Goal type picker */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Goal Type</label>
                    <div className="grid grid-cols-4 gap-2">
                      {GOAL_TYPES.map(t => (
                        <button key={t.value} type="button" onClick={() => setForm(f => ({ ...f, type: t.value }))}
                          className={`flex flex-col items-center p-3 rounded-lg border text-center transition-all ${form.type === t.value ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-white/8 bg-white/[0.02] hover:border-white/20'}`}>
                          <span className="text-2xl mb-1">{t.emoji}</span>
                          <span className="text-[11px] text-gray-300 font-medium">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Goal Name</label>
                      <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={`e.g. ${getGoalType(form.type).description}`} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Target Amount ($)</label>
                      <input type="number" min="1" step="0.01" value={form.targetAmount} onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))} placeholder="50000" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Already Saved ($) <span className="text-gray-600">optional</span></label>
                      <input type="number" min="0" step="0.01" value={form.savedAmount} onChange={e => setForm(f => ({ ...f, savedAmount: e.target.value }))} placeholder="0" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Target Date <span className="text-gray-600">optional</span></label>
                      <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className={`${inputClass} [color-scheme:dark]`} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Notes <span className="text-gray-600">optional</span></label>
                    <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. HDFC Bank FD at 7.1% for 3 years" className={inputClass} />
                  </div>
                  <button type="submit" disabled={createGoal.isPending} className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white py-2.5 rounded-lg font-medium hover:opacity-90 transition-all disabled:opacity-50 text-sm">
                    {createGoal.isPending ? 'Creating…' : 'Create Goal'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Add Funds modal */}
          <AnimatePresence>
            {addFundsGoal && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#111118] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-white">Add funds to &ldquo;{addFundsGoal.name}&rdquo;</h3>
                    <button onClick={() => { setAddFundsGoal(null); setAddAmount('') }} className="p-1.5 text-gray-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-3">Currently saved: <span className="text-white font-medium">${addFundsGoal.savedAmount.toLocaleString()}</span></p>
                    <input type="number" min="0.01" step="0.01" placeholder="Amount to add" value={addAmount} onChange={e => setAddAmount(e.target.value)} className={inputClass} autoFocus />
                  </div>
                  <div className="flex space-x-3 mt-4">
                    <button onClick={handleAddFunds} disabled={updateGoal.isPending} className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 text-white py-2.5 rounded-lg font-medium hover:opacity-90 transition-all disabled:opacity-50 text-sm">
                      {updateGoal.isPending ? 'Saving…' : 'Add Funds'}
                    </button>
                    <button onClick={() => { setAddFundsGoal(null); setAddAmount('') }} className="px-4 py-2.5 border border-white/10 text-gray-400 hover:text-white rounded-lg text-sm transition-colors">Cancel</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Goals list */}
          {loadingGoals ? (
            <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
          ) : goals.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24 text-center">
              <div className="text-5xl mb-4">🐷</div>
              <h2 className="text-lg font-semibold text-gray-400 mb-2">No savings goals yet</h2>
              <p className="text-gray-600 text-sm max-w-sm mb-6">Start tracking your financial goals — fixed deposits, investments, emergency fund, and more.</p>
              <button onClick={() => setShowForm(true)} className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-all">
                <Plus className="w-4 h-4" /><span>Add your first goal</span>
              </button>
            </motion.div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {goals.map((goal, index) => {
                const gt = getGoalType(goal.type)
                const pct = goal.targetAmount > 0 ? Math.min(Math.round((goal.savedAmount / goal.targetAmount) * 100), 100) : 0
                const isComplete = pct >= 100
                const remaining = Math.max(0, goal.targetAmount - goal.savedAmount)
                const days = goal.deadline ? daysLeft(goal.deadline) : null
                const isDeleting = deletingId === goal.id

                return (
                  <motion.div key={goal.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                    className="bg-white/[0.03] border border-white/8 rounded-xl p-5 hover:border-white/15 transition-all group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-xl">{gt.emoji}</div>
                        <div>
                          <h3 className="text-sm font-semibold text-white">{goal.name}</h3>
                          <p className="text-xs text-gray-500">{gt.label}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setAddFundsGoal(goal); setAddAmount('') }} className="p-1.5 text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all" title="Add funds">
                          <PlusCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(goal.id)} disabled={isDeleting} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50">
                          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-500">${goal.savedAmount.toLocaleString()} saved</span>
                        <span className={`font-semibold ${isComplete ? 'text-emerald-400' : 'text-gray-300'}`}>{pct}%</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.05 }}
                          className={`h-2 rounded-full ${isComplete ? 'bg-emerald-500' : pct >= 75 ? 'bg-teal-500' : 'bg-emerald-600'}`} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-gray-500">Target: </span>
                        <span className="text-white font-medium">${goal.targetAmount.toLocaleString()}</span>
                        {!isComplete && <span className="text-gray-600"> · ${remaining.toLocaleString()} to go</span>}
                      </div>
                      {isComplete && <span className="flex items-center space-x-1 text-emerald-400"><CheckCircle className="w-3.5 h-3.5" /><span>Complete!</span></span>}
                      {!isComplete && days !== null && (
                        <span className={`flex items-center space-x-1 ${days < 30 ? 'text-amber-400' : 'text-gray-500'}`}>
                          <Calendar className="w-3 h-3" />
                          <span>{days > 0 ? `${days}d left` : 'Overdue'}</span>
                        </span>
                      )}
                    </div>

                    {goal.notes && <p className="mt-3 text-xs text-gray-600 border-t border-white/5 pt-3">{goal.notes}</p>}
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
