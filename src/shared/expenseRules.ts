import type { Category, CategorySummary, ExpenseInput, ValidationResult } from './types'

export function parseAmountToCents(value: string | number): number {
  const text = typeof value === 'number' ? String(value) : value.trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    throw new Error('金额必须是非负数字，最多保留两位小数')
  }

  const [yuan, fraction = ''] = text.split('.')
  const cents = Number(yuan) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents) || cents <= 0) {
    throw new Error('金额必须大于 0')
  }

  return cents
}

export function validateExpenseInput(input: ExpenseInput, categories: Category[]): ValidationResult {
  const errors: string[] = []

  try {
    parseAmountToCents(input.amountText)
  } catch (error) {
    errors.push(error instanceof Error ? error.message : '金额格式不正确')
  }

  if (!input.occurredAt || Number.isNaN(Date.parse(input.occurredAt))) {
    errors.push('请选择有效的发生时间')
  }

  const parent = categories.find(
    (category) => category.id === input.parentCategoryId && category.parentId === null && category.enabled && !category.isDeleted
  )
  const child = categories.find(
    (category) =>
      category.id === input.categoryId && category.parentId === input.parentCategoryId && category.enabled
      && !category.isDeleted
  )
  if (!parent || !child) {
    errors.push('请选择有效的一级和二级分类')
  }

  return { valid: errors.length === 0, errors }
}

export function groupExpensesByCategory(
  expenses: Array<Pick<ExpenseInput, 'categoryId'> & { amountCents: number }>,
  categories: Category[]
): CategorySummary[] {
  const summaries = new Map<string, CategorySummary>()

  expenses.forEach((expense) => {
    const child = categories.find((category) => category.id === expense.categoryId && category.parentId !== null)
    if (!child || !child.parentId) return
    const parent = categories.find((category) => category.id === child.parentId)
    if (!parent) return

    const current = summaries.get(parent.id) ?? {
      categoryId: parent.id,
      categoryName: parent.name,
      amountCents: 0,
      count: 0
    }
    current.amountCents += expense.amountCents
    current.count += 1
    summaries.set(parent.id, current)
  })

  return [...summaries.values()].sort((a, b) => {
    const aOrder = categories.find((category) => category.id === a.categoryId)?.sortOrder ?? 0
    const bOrder = categories.find((category) => category.id === b.categoryId)?.sortOrder ?? 0
    return aOrder - bOrder
  })
}

export function calculateCategoryPercentages(summaries: CategorySummary[]) {
  const total = summaries.reduce((sum, summary) => sum + summary.amountCents, 0)
  return summaries.map((summary) => ({
    ...summary,
    percentage: total === 0 ? 0 : Math.round((summary.amountCents / total) * 1000) / 10
  }))
}

export function groupExpensesByMonth(
  expenses: Array<{ occurredAt: string; amountCents: number }>,
  endMonth: string
) {
  const [year, month] = endMonth.split('-').map(Number)
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (5 - index), 1))
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
  })
  return months.map((monthKey) => ({
    month: monthKey,
    amountCents: expenses
      .filter((expense) => expense.occurredAt.slice(0, 7) === monthKey)
      .reduce((sum, expense) => sum + expense.amountCents, 0)
  }))
}
