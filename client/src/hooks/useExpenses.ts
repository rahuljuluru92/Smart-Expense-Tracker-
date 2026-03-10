import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesApi } from '@/lib/expensesApi'

export function useExpenses(params?: Record<string, string | number>) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: () => expensesApi.getExpenses(params),
  })
}

export function useSpendingAnalytics(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['spending', params],
    queryFn: () => expensesApi.getSpending(params),
  })
}

export function useBudgets(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['budgets', params],
    queryFn: () => expensesApi.getBudgets(params),
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: expensesApi.createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['spending'] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof expensesApi.updateExpense>[1] }) =>
      expensesApi.updateExpense(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['spending'] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: expensesApi.deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['spending'] })
    },
  })
}

export function useCreateBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: expensesApi.createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}

export function useUpdateBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof expensesApi.updateBudget>[1] }) =>
      expensesApi.updateBudget(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}

export function useDeleteBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: expensesApi.deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}

export function useSavingsGoals() {
  return useQuery({
    queryKey: ['savings'],
    queryFn: () => expensesApi.getSavingsGoals(),
  })
}

export function useCreateSavingsGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: expensesApi.createSavingsGoal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savings'] }),
  })
}

export function useUpdateSavingsGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof expensesApi.updateSavingsGoal>[1] }) =>
      expensesApi.updateSavingsGoal(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savings'] }),
  })
}

export function useDeleteSavingsGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: expensesApi.deleteSavingsGoal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savings'] }),
  })
}
