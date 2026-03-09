export interface Expense {
  id: string
  userId: string
  amount: number
  currency: string
  description: string
  category: Category
  date: Date
  location?: Location
  receipt?: string
  tags: string[]
  isRecurring: boolean
  recurringPattern?: RecurringPattern
  createdAt: Date
  updatedAt: Date
  aiInsights?: AIInsights
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  parentId?: string
  children?: Category[]
  budget?: number
  spent: number
}

export interface Location {
  latitude: number
  longitude: number
  address?: string
  placeName?: string
  city?: string
  country?: string
}

export interface RecurringPattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  endDate?: Date
  dayOfWeek?: number
  dayOfMonth?: number
}

export interface AIInsights {
  sentiment: 'positive' | 'negative' | 'neutral'
  spendingPattern: string
  recommendations: string[]
  riskLevel: 'low' | 'medium' | 'high'
  categoryConfidence: number
}

export interface Budget {
  id: string
  userId: string
  name: string
  amount: number
  currency: string
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  categories: string[]
  startDate: Date
  endDate?: Date
  spent: number
  remaining: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SpendingAnalytics {
  totalSpent: number
  averageDaily: number
  topCategories: CategorySpending[]
  spendingTrend: SpendingTrend[]
  monthlyComparison: MonthlyComparison
  locationInsights: LocationInsight[]
  predictions: SpendingPrediction[]
}

export interface CategorySpending {
  category: Category
  amount: number
  percentage: number
  trend: 'up' | 'down' | 'stable'
}

export interface SpendingTrend {
  date: string
  amount: number
  category: string
}

export interface MonthlyComparison {
  currentMonth: number
  previousMonth: number
  change: number
  changePercentage: number
}

export interface LocationInsight {
  location: Location
  totalSpent: number
  visitCount: number
  averageSpend: number
  categoryBreakdown: CategorySpending[]
}

export interface SpendingPrediction {
  date: string
  predictedAmount: number
  confidence: number
  factors: string[]
}

export interface ExpenseFilters {
  dateRange?: {
    start: Date
    end: Date
  }
  categories?: string[]
  minAmount?: number
  maxAmount?: number
  tags?: string[]
  location?: Location
}

export interface ExpenseFormData {
  amount: number
  currency: string
  description: string
  categoryId: string
  date: Date
  location?: Location
  tags: string[]
  isRecurring: boolean
  recurringPattern?: RecurringPattern
}
