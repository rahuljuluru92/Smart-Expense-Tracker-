import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

const aiApi = axios.create({ baseURL: AI_SERVICE_URL })

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
}

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

aiApi.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ExpenseItem {
  id: string
  amount: number
  currency: string
  description: string
  date: string
  category: { id: string; name: string; icon?: string | null; color?: string | null }
  tags?: unknown[]
  isRecurring?: boolean
}

export interface ExpensesResponse {
  success: boolean
  data: ExpenseItem[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export interface SpendingResponse {
  success: boolean
  data: {
    totalSpent: number
    transactionCount: number
    averageDaily: number
    categorySpending: { category: { name: string; icon?: string | null; color?: string | null } | null; amount: number; count: number }[]
    spendingTrend: { period: string; total_amount: number }[]
    monthlyComparison: { currentMonth: number; previousMonth: number; change: number; changePercentage: number }
  }
}

export interface BudgetItem {
  id: string
  amount: number
  spent: number
  period: string
  isActive: boolean
  spentPercentage: number
  remaining: number
  status: 'good' | 'warning' | 'critical'
}

export interface BudgetsResponse {
  success: boolean
  data: BudgetItem[]
}

export interface SavingsGoal {
  id: string
  name: string
  type: string
  targetAmount: number
  savedAmount: number
  deadline?: string | null
  notes?: string | null
  isActive: boolean
  createdAt: string
}

export interface SavingsGoalsResponse {
  success: boolean
  data: SavingsGoal[]
}

export interface ReceiptResult {
  merchant_name: string
  total_amount: number
  date: string | null
  category: string
  confidence: number
  line_items: { name: string; price: number }[]
}

// ── API calls ──────────────────────────────────────────────────────────────────

export const expensesApi = {
  async getExpenses(params?: Record<string, string | number>): Promise<ExpensesResponse> {
    const response = await api.get('/expenses', { params })
    return response.data
  },

  async createExpense(body: {
    amount: number
    description: string
    categoryName: string
    date: string
    currency?: string
  }): Promise<{ success: boolean; data: ExpenseItem }> {
    const response = await api.post('/expenses', body)
    return response.data
  },

  async updateExpense(id: string, body: {
    amount?: number; description?: string; categoryName?: string; date?: string; currency?: string
  }): Promise<{ success: boolean; data: ExpenseItem }> {
    const response = await api.put(`/expenses/${id}`, body)
    return response.data
  },

  async deleteExpense(id: string): Promise<void> {
    await api.delete(`/expenses/${id}`)
  },

  async getSpending(params?: Record<string, string>): Promise<SpendingResponse> {
    const response = await api.get('/analytics/spending', { params })
    return response.data
  },

  async getBudgets(params?: { startDate?: string; endDate?: string }): Promise<BudgetsResponse> {
    const response = await api.get('/analytics/budgets', { params })
    return response.data
  },

  async createBudget(body: { amount: number; period: string }): Promise<{ success: boolean; data: BudgetItem }> {
    const response = await api.post('/users/budgets', body)
    return response.data
  },

  async updateBudget(id: string, body: { amount?: number; period?: string }): Promise<{ success: boolean; data: BudgetItem }> {
    const response = await api.put(`/users/budgets/${id}`, body)
    return response.data
  },

  async deleteBudget(id: string): Promise<void> {
    await api.delete(`/users/budgets/${id}`)
  },

  // AI service — receipt scanning
  async uploadReceipt(file: File): Promise<{ job_id: string; status: string }> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await aiApi.post('/analyze-receipt', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async getReceiptJob(jobId: string): Promise<{ job_id: string; status: string; result?: ReceiptResult; error?: string }> {
    const response = await aiApi.get(`/jobs/${jobId}`)
    return response.data
  },

  async getSavingsGoals(): Promise<SavingsGoalsResponse> {
    const response = await api.get('/savings')
    return response.data
  },

  async createSavingsGoal(body: {
    name: string; type: string; targetAmount: number; savedAmount?: number; deadline?: string; notes?: string
  }): Promise<{ success: boolean; data: SavingsGoal }> {
    const response = await api.post('/savings', body)
    return response.data
  },

  async updateSavingsGoal(id: string, body: Partial<{ savedAmount: number; targetAmount: number; name: string; notes: string; deadline: string }>): Promise<{ success: boolean; data: SavingsGoal }> {
    const response = await api.put(`/savings/${id}`, body)
    return response.data
  },

  async deleteSavingsGoal(id: string): Promise<void> {
    await api.delete(`/savings/${id}`)
  },
}
