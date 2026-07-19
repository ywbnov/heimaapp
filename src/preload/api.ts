import type { Category, Expense, ExpenseFilters, ExpenseInput } from '../shared/types'

export interface AccountingApi {
  listCategories(): Promise<Category[]>
  setCategoryEnabled(id: string, enabled: boolean): Promise<void>
  listExpenses(filters?: ExpenseFilters): Promise<Expense[]>
  createExpense(input: ExpenseInput): Promise<Expense>
  updateExpense(id: string, input: ExpenseInput): Promise<Expense>
  deleteExpense(id: string): Promise<void>
  exportCsv(): Promise<void>
  backupJson(): Promise<void>
  restoreJson(): Promise<number>
}

export function createAccountingApi(invoke: (channel: string, payload?: unknown) => Promise<unknown>): AccountingApi {
  return {
    listCategories: () => invoke('categories:list') as Promise<Category[]>,
    setCategoryEnabled: (id, enabled) => invoke('categories:set-enabled', { id, enabled }) as Promise<void>,
    listExpenses: (filters) => invoke('expenses:list', filters) as Promise<Expense[]>,
    createExpense: (input) => invoke('expenses:create', input) as Promise<Expense>,
    updateExpense: (id, input) => invoke('expenses:update', { id, input }) as Promise<Expense>,
    deleteExpense: (id) => invoke('expenses:delete', { id }) as Promise<void>,
    exportCsv: () => invoke('data:export-csv') as Promise<void>,
    backupJson: () => invoke('data:backup-json') as Promise<void>,
    restoreJson: () => invoke('data:restore-json') as Promise<number>
  }
}
