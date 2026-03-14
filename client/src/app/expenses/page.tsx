'use client'

import { useEffect, useState, Suspense } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useExpenses, useDeleteExpense, useUpdateExpense } from '@/hooks/useExpenses'
import { useMonthParam } from '@/hooks/useMonthParam'
import { MonthPicker } from '@/components/layout/MonthPicker'
import type { ExpenseItem } from '@/lib/expensesApi'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Receipt, Trash2, Loader2, Pencil, X, Check } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import toast from 'react-hot-toast'

const CATEGORIES = [
  'Food & Dining', 'Transportation', 'Entertainment', 'Shopping',
  'Utilities', 'Health', 'Housing', 'Education', 'Travel', 'Other',
]

const inputClass =
  'w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors text-sm'

interface EditState {
  id: string
  amount: string
  description: string
  categoryName: string
  date: string
}

function ExpensesContent() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  const { startDate, endDate, label: monthLabel } = useMonthParam()

  const { data: expenseResponse, isLoading: loadingExpenses } = useExpenses({
    limit: 100,
    startDate,
    endDate,
  })
  const deleteExpense = useDeleteExpense()
  const updateExpense = useUpdateExpense()

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

  const expenses = expenseResponse?.data ?? []
  const total = expenseResponse?.pagination?.total ?? 0

  const handleDelete = async (id: string) => {
    try {
      await deleteExpense.mutateAsync(id)
      toast.success('Expense deleted')
    } catch {
      toast.error('Failed to delete expense')
    }
  }

  const startEdit = (expense: ExpenseItem) => {
    setEditState({
      id: expense.id,
      amount: expense.amount.toString(),
      description: expense.description,
      categoryName: expense.category.name,
      date: expense.date.slice(0, 10),
    })
  }

  const handleSave = async () => {
    if (!editState) return
    const parsed = parseFloat(editState.amount)
    if (!editState.description.trim() || isNaN(parsed) || parsed <= 0) {
      toast.error('Please fill in all fields correctly')
      return
    }
    try {
      await updateExpense.mutateAsync({
        id: editState.id,
        body: {
          amount: parsed,
          description: editState.description.trim(),
          categoryName: editState.categoryName,
          date: editState.date,
        },
      })
      toast.success('Expense updated')
      setEditState(null)
    } catch {
      toast.error('Failed to update expense')
    }
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0F]">
      <Sidebar />

      <div className="flex-1 text-white overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
          >
            <div>
              <h1 className="text-3xl font-bold text-white">Expenses</h1>
              <p className="text-gray-500 mt-1">
                {total} transaction{total !== 1 ? 's' : ''} in {monthLabel}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <MonthPicker />
              <Link
                href="/expenses/new"
                className="flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-cyan-500 text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition-all duration-200 shadow-[0_0_20px_rgba(124,58,237,0.3)] text-sm font-medium whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Add Expense</span>
              </Link>
            </div>
          </motion.div>

          {/* Expense list */}
          {loadingExpenses ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
          ) : expenses.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <Receipt className="w-14 h-14 text-gray-700 mb-4" />
              <h2 className="text-lg font-semibold text-gray-400 mb-2">No expenses in {monthLabel}</h2>
              <p className="text-gray-600 mb-6">Add an expense or browse a different month</p>
              <Link
                href="/expenses/new"
                className="flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-cyan-500 text-white px-6 py-3 rounded-lg hover:opacity-90 transition-all duration-200 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Add expense</span>
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {expenses.map((expense, index) => {
                const isEditing = editState?.id === expense.id
                return (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="bg-white/[0.03] border border-white/8 rounded-xl hover:border-white/15 transition-all group"
                  >
                    <AnimatePresence mode="wait">
                      {isEditing ? (
                        <motion.div
                          key="edit"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="px-5 py-4 space-y-3"
                        >
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Amount ($)</label>
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={editState.amount}
                                onChange={e => setEditState({ ...editState, amount: e.target.value })}
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Date</label>
                              <input
                                type="date"
                                value={editState.date}
                                onChange={e => setEditState({ ...editState, date: e.target.value })}
                                className={inputClass}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Description</label>
                            <input
                              type="text"
                              value={editState.description}
                              onChange={e => setEditState({ ...editState, description: e.target.value })}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Category</label>
                            <select
                              value={editState.categoryName}
                              onChange={e => setEditState({ ...editState, categoryName: e.target.value })}
                              className={`${inputClass} cursor-pointer`}
                            >
                              {CATEGORIES.map(c => (
                                <option key={c} value={c} className="bg-[#0D0D14]">{c}</option>
                              ))}
                              {!CATEGORIES.includes(editState.categoryName) && (
                                <option value={editState.categoryName} className="bg-[#0D0D14]">
                                  {editState.categoryName}
                                </option>
                              )}
                            </select>
                          </div>
                          <div className="flex items-center space-x-2 pt-1">
                            <button
                              onClick={handleSave}
                              disabled={updateExpense.isPending}
                              className="flex items-center space-x-1.5 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              {updateExpense.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
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
                        <motion.div
                          key="view"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center space-x-4 px-5 py-4"
                        >
                          <div className="w-10 h-10 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                            <span className="text-lg">{expense.category.icon ?? '💳'}</span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{expense.description}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {expense.category.name} · {new Date(expense.date).toLocaleDateString()}
                            </p>
                          </div>

                          <span className="text-sm font-semibold text-red-400 shrink-0">
                            -${expense.amount.toFixed(2)}
                          </span>

                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEdit(expense)}
                              className="p-1.5 text-gray-600 hover:text-violet-400 transition-colors"
                              title="Edit expense"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(expense.id)}
                              className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
                              title="Delete expense"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

export default function ExpensesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-violet-500" />
        </div>
      }
    >
      <ExpensesContent />
    </Suspense>
  )
}
