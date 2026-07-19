import { openDatabase } from '../../src/main/database'
import { registerIpcHandlers, type IpcMainLike } from '../../src/main/ipc'
import { CategoryRepository } from '../../src/main/repositories/categoryRepository'
import { ExpenseRepository } from '../../src/main/repositories/expenseRepository'
import type { ExpenseInput } from '../../src/shared/types'

const validInput: ExpenseInput = {
  amountText: '18.50',
  occurredAt: '2026-07-18T12:00:00.000Z',
  parentCategoryId: 'food',
  categoryId: 'food-lunch',
  note: '',
  paymentMethod: 'wechat'
}

describe('IPC 契约', () => {
  it('拒绝非法请求并允许合法请求访问数据仓库', async () => {
    const db = openDatabase(':memory:')
    const handlers: Record<string, (event: unknown, payload?: unknown) => unknown> = {}
    const ipcMain: IpcMainLike = {
      handle(channel, listener) {
        handlers[channel] = listener
      }
    }
    const expenses = new ExpenseRepository(db)
    const categories = new CategoryRepository(db)
    registerIpcHandlers(ipcMain, { expenses, categories })

    await expect(Promise.resolve().then(() => handlers['expenses:create']({}, { ...validInput, amountText: 'bad' }))).rejects.toThrow()
    expect(expenses.list()).toHaveLength(0)

    const created = await handlers['expenses:create']({}, validInput)
    expect(created).toMatchObject({ amountCents: 1850, categoryId: 'food-lunch' })
    expect(await handlers['expenses:list']({}, {})).toHaveLength(1)
    db.close()
  })

  it('拒绝非布尔的分类启用状态', async () => {
    const db = openDatabase(':memory:')
    const handlers: Record<string, (event: unknown, payload?: unknown) => unknown> = {}
    registerIpcHandlers(
      { handle: (channel, listener) => { handlers[channel] = listener } },
      { expenses: new ExpenseRepository(db), categories: new CategoryRepository(db) }
    )

    await expect(Promise.resolve().then(() => handlers['categories:set-enabled']({}, { id: 'food', enabled: 'yes' }))).rejects.toThrow()
    await expect(Promise.resolve().then(() => handlers['categories:set-enabled']({}, { id: 'food', enabled: false }))).rejects.toThrow()
    await expect(Promise.resolve().then(() => handlers['categories:create']({}, { parentId: 'food' }))).rejects.toThrow()

    const created = await handlers['categories:create']({}, { parentId: 'food', name: '自定义分类' }) as { id: string; name: string; parentId: string; isBuiltin: boolean }
    expect(created).toMatchObject({ name: '自定义分类', parentId: 'food', isBuiltin: false })
    await handlers['categories:rename']({}, { id: created.id, name: '改名分类' })
    await handlers['categories:delete']({}, { id: created.id })
    expect(new CategoryRepository(db).list().find((category) => category.id === created.id)).toMatchObject({ isDeleted: true })

    await expect(Promise.resolve().then(() => handlers['categories:create-batch']({}, {
      mode: 'existing-parent',
      parentId: 'food',
      childNames: '不是数组'
    }))).rejects.toThrow()
    const batch = await handlers['categories:create-batch']({}, {
      mode: 'new-parent',
      parentName: '汽车',
      childNames: ['加油', '停车']
    }) as Array<{ name: string }>
    expect(batch.map((category) => category.name)).toEqual(['汽车', '加油', '停车'])
    db.close()
  })
})
