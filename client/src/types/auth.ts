export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: Date
  updatedAt: Date
  preferences: UserPreferences
  achievements: Achievement[]
  level: number
  experience: number
}

export interface UserPreferences {
  currency: string
  timezone: string
  notifications: NotificationSettings
  theme: 'light' | 'dark' | 'system'
  language: string
}

export interface NotificationSettings {
  email: boolean
  push: boolean
  sms: boolean
  budgetAlerts: boolean
  locationAlerts: boolean
  achievementAlerts: boolean
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlockedAt?: Date
  progress: number
  maxProgress: number
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface AuthResponse {
  user: User
  token: string
}
