export type PaymentMethod = 'cash' | 'bank' | 'wechat' | 'alipay' | 'other'

export interface Category {
  id: string
  parentId: string | null
  name: string
  enabled: boolean
  sortOrder: number
}

export interface ExpenseInput {
  amountText: string
  occurredAt: string
  parentCategoryId: string
  categoryId: string
  note: string
  paymentMethod: PaymentMethod
}

export interface Expense {
  id: string
  amountCents: number
  occurredAt: string
  parentCategoryId: string
  categoryId: string
  parentCategoryName: string
  categoryName: string
  note: string
  paymentMethod: PaymentMethod
  createdAt: string
  updatedAt: string
  isDeleted: boolean
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export interface CategorySummary {
  categoryId: string
  categoryName: string
  amountCents: number
  count: number
}

export interface ExpenseFilters {
  from?: string
  to?: string
  parentCategoryId?: string
  categoryId?: string
  paymentMethod?: PaymentMethod
}
