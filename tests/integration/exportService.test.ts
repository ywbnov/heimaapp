import { openDatabase } from '../../src/main/database'
import { CategoryRepository } from '../../src/main/repositories/categoryRepository'
import { ExpenseRepository } from '../../src/main/repositories/expenseRepository'
import { exportCsv, createBackupJson, restoreBackupJson } from '../../src/main/exportService'

describe('数据导出与恢复', () => {
  it('导出带 UTF-8 BOM 的 CSV 和完整 JSON 备份，并可恢复', () => {
    const sourceDb = openDatabase(':memory:')
    const source = new ExpenseRepository(sourceDb)
    const custom = new CategoryRepository(sourceDb).create('food', '自定义午餐')
    source.create({
      amountText: '18.50',
      occurredAt: '2026-07-18T12:00:00.000Z',
      parentCategoryId: 'food',
      categoryId: custom.id,
      note: '午餐, 工作日',
      paymentMethod: 'wechat'
    })

    const csv = exportCsv(source.list())
    expect(csv.startsWith('\ufeff')).toBe(true)
    expect(csv).toContain('金额,发生时间,一级分类,二级分类,备注,支付方式')
    expect(csv).toContain('"午餐, 工作日"')

    const backup = createBackupJson(sourceDb)
    expect(JSON.parse(backup).categories.find((category: { id: string }) => category.id === custom.id)).toMatchObject({
      isBuiltin: false,
      isDeleted: false
    })
    const targetDb = openDatabase(':memory:')
    expect(restoreBackupJson(targetDb, backup)).toBe(1)
    expect(new ExpenseRepository(targetDb).list()[0]).toMatchObject({ amountCents: 1850, categoryName: '自定义午餐' })
    expect(new CategoryRepository(targetDb).list().find((category) => category.id === custom.id)).toMatchObject({ isBuiltin: false })
    sourceDb.close()
    targetDb.close()
  })

  it('拒绝版本错误或结构损坏的备份', () => {
    const db = openDatabase(':memory:')
    expect(() => restoreBackupJson(db, '{"version":2,"categories":[],"expenses":[]}')).toThrow()
    expect(() => restoreBackupJson(db, '{"version":1,"categories":"bad","expenses":[]}')).toThrow()
    db.close()
  })

  it('恢复旧版备份时为分类补充默认状态', () => {
    const db = openDatabase(':memory:')
    const legacy = JSON.stringify({
      version: 1,
      categories: [{ id: 'food', parentId: null, name: '餐饮', enabled: true, sortOrder: 10 }],
      expenses: []
    })

    restoreBackupJson(db, legacy)
    expect(new CategoryRepository(db).list().find((category) => category.id === 'food')).toMatchObject({ isBuiltin: true, isDeleted: false })
    db.close()
  })

  it('恢复备份时不能通过 JSON 修改或移除预置分类', () => {
    const db = openDatabase(':memory:')
    const tampered = JSON.stringify({
      version: 1,
      categories: [{ id: 'food', parentId: null, name: '被篡改的预置分类', enabled: false, sortOrder: 1 }],
      expenses: []
    })

    restoreBackupJson(db, tampered)
    const categories = new CategoryRepository(db).list()
    expect(categories.find((category) => category.id === 'food')).toMatchObject({ name: '餐饮', enabled: true, isBuiltin: true })
    expect(categories.filter((category) => category.isBuiltin)).toHaveLength(54)
    db.close()
  })
})
