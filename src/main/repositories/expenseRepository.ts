import { randomUUID } from 'node:crypto'
import type { Category, Expense, ExpenseFilters, ExpenseInput } from '../../shared/types'
import { parseAmountToCents, validateExpenseInput } from '../../shared/expenseRules'
import type { SqliteDatabase } from '../database'
import { CategoryRepository } from './categoryRepository'

type ExpenseRow = {
  id: string
  amount_cents: number
  occurred_at: string
  parent_category_id: string
  category_id: string
  parent_category_name: string
  category_name: string
  note: string
  payment_method: Expense['paymentMethod']
  created_at: string
  updated_at: string
  is_deleted: number
}

function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    amountCents: row.amount_cents,
    occurredAt: row.occurred_at,
    parentCategoryId: row.parent_category_id,
    categoryId: row.category_id,
    parentCategoryName: row.parent_category_name,
    categoryName: row.category_name,
    note: row.note,
    paymentMethod: row.payment_method,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isDeleted: row.is_deleted === 1
  }
}

export class ExpenseRepository {
  private readonly categoryRepository: CategoryRepository

  constructor(private readonly db: SqliteDatabase) {
    this.categoryRepository = new CategoryRepository(db)
  }

  create(input: ExpenseInput): Expense {
    const categories = this.categoryRepository.list()
    const validation = validateExpenseInput(input, categories)
    if (!validation.valid) throw new Error(validation.errors.join('；'))
    const amountCents = parseAmountToCents(input.amountText)
    const parent = categories.find((category) => category.id === input.parentCategoryId) as Category
    const child = categories.find((category) => category.id === input.categoryId) as Category
    const now = new Date().toISOString()
    const id = randomUUID()

    this.db.prepare(`
      INSERT INTO expenses (
        id, amount_cents, occurred_at, parent_category_id, category_id,
        parent_category_name, category_name, note, payment_method,
        created_at, updated_at, is_deleted
      ) VALUES (
        @id, @amountCents, @occurredAt, @parentCategoryId, @categoryId,
        @parentCategoryName, @categoryName, @note, @paymentMethod,
        @createdAt, @updatedAt, 0
      )
    `).run({
      id,
      amountCents,
      occurredAt: input.occurredAt,
      parentCategoryId: parent.id,
      categoryId: child.id,
      parentCategoryName: parent.name,
      categoryName: child.name,
      note: input.note.trim(),
      paymentMethod: input.paymentMethod,
      createdAt: now,
      updatedAt: now
    })

    return this.getById(id)
  }

  update(id: string, input: ExpenseInput): Expense {
    const categories = this.categoryRepository.list()
    const validation = validateExpenseInput(input, categories)
    if (!validation.valid) throw new Error(validation.errors.join('；'))
    const amountCents = parseAmountToCents(input.amountText)
    const parent = categories.find((category) => category.id === input.parentCategoryId) as Category
    const child = categories.find((category) => category.id === input.categoryId) as Category
    const result = this.db.prepare(`
      UPDATE expenses SET amount_cents = @amountCents, occurred_at = @occurredAt,
        parent_category_id = @parentCategoryId, category_id = @categoryId,
        parent_category_name = @parentCategoryName, category_name = @categoryName,
        note = @note, payment_method = @paymentMethod, updated_at = @updatedAt
      WHERE id = @id AND is_deleted = 0
    `).run({
      id,
      amountCents,
      occurredAt: input.occurredAt,
      parentCategoryId: parent.id,
      categoryId: child.id,
      parentCategoryName: parent.name,
      categoryName: child.name,
      note: input.note.trim(),
      paymentMethod: input.paymentMethod,
      updatedAt: new Date().toISOString()
    })
    if (result.changes === 0) throw new Error('账目不存在')
    return this.getById(id)
  }

  softDelete(id: string): void {
    const result = this.db.prepare('UPDATE expenses SET is_deleted = 1, updated_at = @updatedAt WHERE id = @id AND is_deleted = 0').run({
      id,
      updatedAt: new Date().toISOString()
    })
    if (result.changes === 0) throw new Error('账目不存在')
  }

  list(filters: ExpenseFilters = {}): Expense[] {
    const clauses = ['is_deleted = 0']
    const params: Record<string, string> = {}
    if (filters.from) {
      clauses.push('occurred_at >= @from')
      params.from = filters.from
    }
    if (filters.to) {
      clauses.push('occurred_at <= @to')
      params.to = filters.to
    }
    if (filters.parentCategoryId) {
      clauses.push('parent_category_id = @parentCategoryId')
      params.parentCategoryId = filters.parentCategoryId
    }
    if (filters.categoryId) {
      clauses.push('category_id = @categoryId')
      params.categoryId = filters.categoryId
    }
    if (filters.paymentMethod) {
      clauses.push('payment_method = @paymentMethod')
      params.paymentMethod = filters.paymentMethod
    }
    const rows = this.db.prepare(`SELECT * FROM expenses WHERE ${clauses.join(' AND ')} ORDER BY occurred_at DESC, created_at DESC`).all(params) as ExpenseRow[]
    return rows.map(mapExpense)
  }

  getById(id: string): Expense {
    const row = this.db.prepare('SELECT * FROM expenses WHERE id = @id').get({ id }) as ExpenseRow | undefined
    if (!row) throw new Error('账目不存在')
    return mapExpense(row)
  }
}
