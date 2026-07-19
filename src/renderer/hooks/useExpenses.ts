import { useCallback, useEffect, useState } from 'react'
import { defaultCategories } from '../../shared/categories'
import type { Category, CategoryBatchInput, Expense, ExpenseFilters, ExpenseInput } from '../../shared/types'

export function useExpenses() {
  const [categories, setCategories] = useState<Category[]>(defaultCategories)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (filters?: ExpenseFilters) => {
    const api = window.accountingApi
    if (!api) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [nextCategories, nextExpenses] = await Promise.all([
        api.listCategories(),
        api.listExpenses(filters)
      ])
      setCategories(nextCategories)
      setExpenses(nextExpenses)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '读取账目失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (window.accountingApi) void refresh()
  }, [refresh])

  const createExpense = useCallback(async (input: ExpenseInput) => {
    const api = window.accountingApi
    if (!api) return
    setSubmitting(true)
    try {
      const created = await api.createExpense(input)
      setExpenses((current) => [created, ...current])
      setError(null)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '保存账目失败'
      setError(message)
      throw new Error(message)
    } finally {
      setSubmitting(false)
    }
  }, [])

  const deleteExpense = useCallback(async (id: string) => {
    const api = window.accountingApi
    if (!api) return
    await api.deleteExpense(id)
    setExpenses((current) => current.filter((expense) => expense.id !== id))
  }, [])

  const setCategoryEnabled = useCallback(async (id: string, enabled: boolean) => {
    const api = window.accountingApi
    if (!api) return
    await api.setCategoryEnabled(id, enabled)
    setCategories((current) => current.map((category) => category.id === id ? { ...category, enabled } : category))
  }, [])

  const createCategory = useCallback(async (parentId: string | null, name: string) => {
    const api = window.accountingApi
    if (!api) return
    const created = await api.createCategory(parentId, name)
    setCategories((current) => [...current, created].sort((a, b) => a.sortOrder - b.sortOrder))
    return created
  }, [])

  const renameCategory = useCallback(async (id: string, name: string) => {
    const api = window.accountingApi
    if (!api) return
    await api.renameCategory(id, name)
    setCategories((current) => current.map((category) => category.id === id ? { ...category, name: name.trim() } : category))
  }, [])

  const deleteCategory = useCallback(async (id: string) => {
    const api = window.accountingApi
    if (!api) return
    await api.deleteCategory(id)
    setCategories((current) => current.map((category) => category.id === id ? { ...category, enabled: false, isDeleted: true } : category))
  }, [])

  const createCategoryBatch = useCallback(async (input: CategoryBatchInput) => {
    const api = window.accountingApi
    if (!api) return []
    const created = await api.createCategoryBatch(input)
    setCategories((current) => [...current, ...created].sort((a, b) => a.sortOrder - b.sortOrder))
    return created
  }, [])

  const exportCsv = useCallback(async () => window.accountingApi?.exportCsv(), [])
  const backupJson = useCallback(async () => window.accountingApi?.backupJson(), [])
  const restoreJson = useCallback(async () => {
    const count = await window.accountingApi?.restoreJson()
    await refresh()
    return count ?? 0
  }, [refresh])

  return {
    categories,
    expenses,
    loading,
    submitting,
    error,
    refresh,
    createExpense,
    deleteExpense,
    setCategoryEnabled,
    createCategory,
    renameCategory,
    deleteCategory,
    createCategoryBatch,
    exportCsv,
    backupJson,
    restoreJson
  }
}
