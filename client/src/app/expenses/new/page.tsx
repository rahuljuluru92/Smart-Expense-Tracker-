'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useCreateExpense } from '@/hooks/useExpenses'
import { expensesApi, type ReceiptResult } from '@/lib/expensesApi'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, AlertCircle, Upload, FileImage, Loader2, CheckCircle,
  Sparkles, X, DollarSign, AlignLeft, Tag, Calendar,
} from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import toast from 'react-hot-toast'

const CATEGORIES = [
  'Food & Dining', 'Transportation', 'Entertainment', 'Shopping',
  'Utilities', 'Health', 'Housing', 'Education', 'Travel', 'Other',
]

const inputClass =
  'w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors'

type Tab = 'manual' | 'receipt'
type ScanState = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const e = err as { response?: { data?: { message?: string; errors?: { msg: string }[] } } }
    return (
      e.response?.data?.message ??
      e.response?.data?.errors?.[0]?.msg ??
      'Request failed'
    )
  }
  return 'Network error — is the server running?'
}

export default function NewExpensePage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const createExpense = useCreateExpense()

  // Tab
  const [tab, setTab] = useState<Tab>('manual')

  // Manual form
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryName, setCategoryName] = useState('')
  // Use local date (not UTC) so the default matches the user's actual calendar day
  const [date, setDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Receipt scan
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [scanError, setScanError] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [receiptResult, setReceiptResult] = useState<ReceiptResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login')
  }, [isAuthenticated, isLoading, router])

  // Cleanup poll on unmount
  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current) }, [])

  // ── ALL useCallback hooks MUST be before any early returns ───────────────────

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPG, PNG, WEBP)')
      return
    }
    setSelectedFile(file)
    setReceiptResult(null)
    setScanState('idle')
    setScanError('')
    const url = URL.createObjectURL(file)
    setPreview(url)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const pollJob = useCallback(async (jobId: string) => {
    try {
      const job = await expensesApi.getReceiptJob(jobId)
      if (job.status === 'done' && job.result) {
        setScanState('done')
        setReceiptResult(job.result)
        setAmount(String(job.result.total_amount ?? ''))
        setDescription(job.result.merchant_name ?? '')
        setCategoryName(
          CATEGORIES.find(c => c.toLowerCase().includes((job.result!.category ?? '').toLowerCase())) ?? ''
        )
        if (job.result.date) setDate(job.result.date)
        toast.success('Receipt analyzed! Review the pre-filled form.')
      } else if (job.status === 'failed') {
        setScanState('error')
        setScanError(job.error ?? 'Receipt analysis failed')
      } else {
        pollRef.current = setTimeout(() => pollJob(jobId), 2000)
      }
    } catch {
      setScanState('error')
      setScanError("Could not reach AI service — make sure it's running on port 8000")
    }
  }, [])

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return
    setScanState('uploading')
    setScanError('')
    try {
      const { job_id } = await expensesApi.uploadReceipt(selectedFile)
      setScanState('processing')
      pollJob(job_id)
    } catch {
      setScanState('error')
      setScanError("Could not reach AI service — make sure it's running on port 8000")
    }
  }, [selectedFile, pollJob])

  const resetScan = useCallback(() => {
    setScanState('idle')
    setScanError('')
    setPreview(null)
    setSelectedFile(null)
    setReceiptResult(null)
    if (pollRef.current) clearTimeout(pollRef.current)
  }, [])

  // ── Early returns (AFTER all hooks) ─────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-violet-500" />
      </div>
    )
  }
  if (!isAuthenticated) return null

  // ── Helpers (not hooks — safe after returns) ─────────────────────────────────

  const validateForm = () => {
    const errs: Record<string, string> = {}
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)
      errs.amount = 'Enter a valid positive amount'
    if (!description.trim()) errs.description = 'Description is required'
    if (!categoryName) errs.categoryName = 'Please select a category'
    if (!date) errs.date = 'Date is required'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    try {
      await createExpense.mutateAsync({
        amount: parseFloat(amount),
        description: description.trim(),
        categoryName,
        date: new Date(date).toISOString(),
      })
      toast.success('Expense added!')
      router.push('/expenses')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const useReceiptData = () => setTab('manual')

  return (
    <div className="flex min-h-screen bg-[#0A0A0F]">
      <Sidebar />

      <div className="flex-1 text-white overflow-auto">
        <div className="max-w-xl mx-auto px-6 py-8">
          {/* Back */}
          <Link
            href="/expenses"
            className="inline-flex items-center space-x-2 text-gray-500 hover:text-white transition-colors mb-6 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to expenses</span>
          </Link>

          <h1 className="text-2xl font-bold text-white mb-6">Add Expense</h1>

          {/* Tabs */}
          <div className="flex bg-white/5 rounded-lg p-1 mb-6 border border-white/8">
            <button
              onClick={() => setTab('manual')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-md text-sm font-medium transition-all ${
                tab === 'manual'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <AlignLeft className="w-4 h-4" />
              <span>Manual Entry</span>
            </button>
            <button
              onClick={() => setTab('receipt')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-md text-sm font-medium transition-all ${
                tab === 'receipt'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Scan Receipt</span>
              <span className="text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-full px-1.5 py-0.5">AI</span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            {tab === 'manual' ? (
              <motion.form
                key="manual"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                {receiptResult && (
                  <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-sm text-emerald-400">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>Form pre-filled from receipt — review and submit</span>
                  </div>
                )}

                {/* Amount */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center space-x-1.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Amount (USD)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className={inputClass}
                  />
                  {formErrors.amount && (
                    <p className="flex items-center mt-1.5 text-xs text-red-400 space-x-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{formErrors.amount}</span>
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center space-x-1.5">
                    <AlignLeft className="w-3.5 h-3.5" />
                    <span>Description</span>
                  </label>
                  <input
                    type="text"
                    placeholder="What was this for?"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className={inputClass}
                  />
                  {formErrors.description && (
                    <p className="flex items-center mt-1.5 text-xs text-red-400 space-x-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{formErrors.description}</span>
                    </p>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center space-x-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Category</span>
                  </label>
                  <select
                    value={categoryName}
                    onChange={e => setCategoryName(e.target.value)}
                    className={`${inputClass} cursor-pointer`}
                  >
                    <option value="" disabled className="bg-[#0D0D14] text-gray-400">Select category</option>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c} className="bg-[#0D0D14] text-white">{c}</option>
                    ))}
                  </select>
                  {formErrors.categoryName && (
                    <p className="flex items-center mt-1.5 text-xs text-red-400 space-x-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{formErrors.categoryName}</span>
                    </p>
                  )}
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Date</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className={`${inputClass} [color-scheme:dark]`}
                  />
                  {formErrors.date && (
                    <p className="flex items-center mt-1.5 text-xs text-red-400 space-x-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{formErrors.date}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={createExpense.isPending}
                  className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white py-3.5 rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(124,58,237,0.25)] text-sm"
                >
                  {createExpense.isPending ? (
                    <span className="flex items-center justify-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving…</span>
                    </span>
                  ) : 'Add Expense'}
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="receipt"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-5"
              >
                {/* Drop zone */}
                {!preview ? (
                  <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/15 rounded-xl p-10 text-center cursor-pointer hover:border-violet-500/50 hover:bg-violet-500/5 transition-all group"
                  >
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-violet-500/10 transition-colors">
                      <FileImage className="w-7 h-7 text-gray-500 group-hover:text-violet-400 transition-colors" />
                    </div>
                    <p className="text-sm font-medium text-gray-300 mb-1">Drop receipt image here</p>
                    <p className="text-xs text-gray-600">or click to browse — JPG, PNG, WEBP</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    />
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-white/10">
                    <div className="h-64 w-full bg-white/5 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview} alt="Receipt preview" className="max-h-full max-w-full object-contain" />
                    </div>
                    {scanState === 'idle' && (
                      <button
                        onClick={resetScan}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </div>
                )}

                {/* Scan status */}
                {scanState === 'uploading' && (
                  <div className="flex items-center space-x-3 bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                    <Loader2 className="w-4 h-4 text-violet-400 animate-spin shrink-0" />
                    <span className="text-sm text-gray-300">Uploading receipt…</span>
                  </div>
                )}

                {scanState === 'processing' && (
                  <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-4 space-y-2">
                    <div className="flex items-center space-x-3">
                      <Loader2 className="w-4 h-4 text-violet-400 animate-spin shrink-0" />
                      <span className="text-sm text-gray-300">Running OCR + AI classification…</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                      <div className="h-1 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full animate-pulse w-3/4" />
                    </div>
                  </div>
                )}

                {scanState === 'error' && (
                  <div className="flex items-start space-x-3 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-400">Analysis failed</p>
                      <p className="text-xs text-red-400/70 mt-0.5">{scanError}</p>
                      <button onClick={resetScan} className="text-xs text-red-400 underline mt-1">
                        Try again
                      </button>
                    </div>
                  </div>
                )}

                {scanState === 'done' && receiptResult && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span className="text-sm font-semibold">Receipt analyzed</span>
                      <span className="text-xs text-emerald-400/70">
                        {Math.round(receiptResult.confidence * 100)}% confidence
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-gray-500 mb-0.5">Merchant</p>
                        <p className="text-white font-medium">{receiptResult.merchant_name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-0.5">Total</p>
                        <p className="text-white font-medium">${receiptResult.total_amount?.toFixed(2) ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-0.5">Category</p>
                        <p className="text-white font-medium">{receiptResult.category || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-0.5">Date</p>
                        <p className="text-white font-medium">{receiptResult.date ?? '—'}</p>
                      </div>
                    </div>
                    {receiptResult.line_items?.length > 0 && (
                      <div className="border-t border-white/10 pt-2">
                        <p className="text-[11px] text-gray-500 mb-1.5">Line items</p>
                        {receiptResult.line_items.slice(0, 4).map((item, i) => (
                          <div key={i} className="flex justify-between text-xs mb-0.5">
                            <span className="text-gray-400">{item.name}</span>
                            <span className="text-gray-300">${item.price?.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={useReceiptData}
                      className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-all"
                    >
                      Use this data → Review &amp; Submit
                    </button>
                  </div>
                )}

                {selectedFile && scanState === 'idle' && (
                  <button
                    onClick={handleAnalyze}
                    className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-violet-600 to-cyan-500 text-white py-3.5 rounded-lg font-semibold hover:opacity-90 transition-all shadow-[0_0_20px_rgba(124,58,237,0.25)] text-sm"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Analyze Receipt with AI</span>
                  </button>
                )}

                <div className="text-center text-xs text-gray-600">
                  Powered by Tesseract OCR + MiniMax via NVIDIA API
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
