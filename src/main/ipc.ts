import type { CategoryRepository } from './repositories/categoryRepository'
import type { ExpenseRepository } from './repositories/expenseRepository'
import type { CategoryBatchInput, ExpenseFilters, ExpenseInput } from '../shared/types'

export interface IpcMainLike {
  handle(
    channel: string,
    listener: (event: unknown, payload?: unknown) => unknown | Promise<unknown>
  ): void
}

export interface IpcServices {
  expenses: ExpenseRepository
  categories: CategoryRepository
  data?: {
    exportCsv: () => Promise<void>
    backupJson: () => Promise<void>
    restoreJson: () => Promise<number>
  }
}

function objectPayload(payload: unknown, name: string): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error(`${name} 参数格式不正确`)
  }
  return payload as Record<string, unknown>
}

function expenseInputPayload(payload: unknown): ExpenseInput {
  const value = objectPayload(payload, '花销')
  const keys = ['amountText', 'occurredAt', 'parentCategoryId', 'categoryId', 'note', 'paymentMethod']
  if (keys.some((key) => typeof value[key] !== 'string')) {
    throw new Error('花销字段格式不正确')
  }
  return value as unknown as ExpenseInput
}

function categoryBatchInputPayload(payload: unknown): CategoryBatchInput {
  const value = objectPayload(payload, '批量分类')
  if (!Array.isArray(value.childNames) || value.childNames.some((name) => typeof name !== 'string')) {
    throw new Error('二级分类名称格式不正确')
  }
  if (value.mode === 'new-parent' && typeof value.parentName === 'string') {
    return { mode: 'new-parent', parentName: value.parentName, childNames: value.childNames as string[] }
  }
  if (value.mode === 'existing-parent' && typeof value.parentId === 'string') {
    return { mode: 'existing-parent', parentId: value.parentId, childNames: value.childNames as string[] }
  }
  throw new Error('批量分类参数格式不正确')
}

export function registerIpcHandlers(ipcMain: IpcMainLike, services: IpcServices): void {
  ipcMain.handle('categories:list', () => services.categories.list())
  ipcMain.handle('categories:set-enabled', (_event, payload) => {
    const value = objectPayload(payload, '分类')
    if (typeof value.id !== 'string' || typeof value.enabled !== 'boolean') {
      throw new Error('分类启用状态格式不正确')
    }
    services.categories.setEnabled(value.id, value.enabled)
  })
  ipcMain.handle('categories:create', (_event, payload) => {
    const value = objectPayload(payload, '分类')
    if (typeof value.name !== 'string' || (value.parentId !== null && typeof value.parentId !== 'string')) {
      throw new Error('分类参数格式不正确')
    }
    return services.categories.create(value.parentId as string | null, value.name)
  })
  ipcMain.handle('categories:rename', (_event, payload) => {
    const value = objectPayload(payload, '分类')
    if (typeof value.id !== 'string' || typeof value.name !== 'string') {
      throw new Error('分类参数格式不正确')
    }
    services.categories.rename(value.id, value.name)
  })
  ipcMain.handle('categories:delete', (_event, payload) => {
    const value = objectPayload(payload, '分类')
    if (typeof value.id !== 'string') throw new Error('分类参数格式不正确')
    services.categories.softDelete(value.id)
  })
  ipcMain.handle('categories:create-batch', (_event, payload) => {
    return services.categories.createBatch(categoryBatchInputPayload(payload))
  })
  ipcMain.handle('expenses:list', (_event, payload) => {
    if (payload === undefined) return services.expenses.list()
    return services.expenses.list(objectPayload(payload, '筛选') as ExpenseFilters)
  })
  ipcMain.handle('expenses:create', (_event, payload) => services.expenses.create(expenseInputPayload(payload)))
  ipcMain.handle('expenses:update', (_event, payload) => {
    const value = objectPayload(payload, '修改花销')
    if (typeof value.id !== 'string') throw new Error('账目编号格式不正确')
    return services.expenses.update(value.id, expenseInputPayload(value.input))
  })
  ipcMain.handle('expenses:delete', (_event, payload) => {
    const value = objectPayload(payload, '删除花销')
    if (typeof value.id !== 'string') throw new Error('账目编号格式不正确')
    services.expenses.softDelete(value.id)
  })
  ipcMain.handle('data:export-csv', () => services.data?.exportCsv())
  ipcMain.handle('data:backup-json', () => services.data?.backupJson())
  ipcMain.handle('data:restore-json', () => services.data?.restoreJson())
}
