import type { Category, Expense } from '../shared/types'
import type { SqliteDatabase } from './database'
import { CategoryRepository } from './repositories/categoryRepository'
import { ExpenseRepository } from './repositories/expenseRepository'

interface BackupDocument {
  version: 1
  exportedAt: string
  categories: Category[]
  expenses: Expense[]
}

const paymentLabels: Record<Expense['paymentMethod'], string> = {
  cash: '现金',
  bank: '银行卡',
  wechat: '微信',
  alipay: '支付宝',
  other: '其他'
}

function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function exportCsv(expenses: Expense[]): string {
  const header = ['金额', '发生时间', '一级分类', '二级分类', '备注', '支付方式']
  const rows = expenses.map((expense) => [
    (expense.amountCents / 100).toFixed(2),
    expense.occurredAt,
    expense.parentCategoryName,
    expense.categoryName,
    expense.note,
    paymentLabels[expense.paymentMethod]
  ])
  return `\ufeff${[header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`
}

export function createBackupJson(db: SqliteDatabase): string {
  const backup: BackupDocument = {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: new CategoryRepository(db).list(),
    expenses: new ExpenseRepository(db).list()
  }
  return JSON.stringify(backup, null, 2)
}

function parseBackup(value: string): BackupDocument {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error('备份文件不是有效的 JSON')
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('备份结构不正确')
  const document = parsed as Partial<BackupDocument>
  if (document.version !== 1 || !Array.isArray(document.categories) || !Array.isArray(document.expenses)) {
    throw new Error('备份版本或结构不受支持')
  }
  if (document.categories.some((category) => !category || typeof category.id !== 'string' || typeof category.name !== 'string')) {
    throw new Error('备份分类数据不正确')
  }
  if (document.expenses.some((expense) => !expense || typeof expense.id !== 'string' || !Number.isInteger(expense.amountCents) || expense.amountCents <= 0)) {
    throw new Error('备份账目数据不正确')
  }
  return document as BackupDocument
}

export function restoreBackupJson(db: SqliteDatabase, value: string): number {
  const backup = parseBackup(value)
  const insertCategory = db.prepare('INSERT INTO categories (id, parent_id, name, enabled, sort_order) VALUES (@id, @parentId, @name, @enabled, @sortOrder)')
  const insertExpense = db.prepare(`
    INSERT INTO expenses (
      id, amount_cents, occurred_at, parent_category_id, category_id,
      parent_category_name, category_name, note, payment_method,
      created_at, updated_at, is_deleted
    ) VALUES (@id, @amountCents, @occurredAt, @parentCategoryId, @categoryId,
      @parentCategoryName, @categoryName, @note, @paymentMethod,
      @createdAt, @updatedAt, @isDeleted)
  `)
  const restore = db.transaction(() => {
    db.exec('DELETE FROM expenses; DELETE FROM categories;')
    backup.categories
      .slice()
      .sort((a, b) => Number(a.parentId !== null) - Number(b.parentId !== null))
      .forEach((category) => insertCategory.run({
        id: category.id,
        parentId: category.parentId,
        name: category.name,
        enabled: category.enabled ? 1 : 0,
        sortOrder: category.sortOrder
      }))
    backup.expenses.forEach((expense) => insertExpense.run({
      id: expense.id,
      amountCents: expense.amountCents,
      occurredAt: expense.occurredAt,
      parentCategoryId: expense.parentCategoryId,
      categoryId: expense.categoryId,
      parentCategoryName: expense.parentCategoryName,
      categoryName: expense.categoryName,
      note: expense.note,
      paymentMethod: expense.paymentMethod,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
      isDeleted: expense.isDeleted ? 1 : 0
    }))
  })
  restore()
  return backup.expenses.length
}
