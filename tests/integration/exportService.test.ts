import { openDatabase } from '../../src/main/database'
import { ExpenseRepository } from '../../src/main/repositories/expenseRepository'
import { exportCsv, createBackupJson, restoreBackupJson } from '../../src/main/exportService'

describe('数据导出与恢复', () => {
  it('导出带 UTF-8 BOM 的 CSV 和完整 JSON 备份，并可恢复', () => {
    const sourceDb = openDatabase(':memory:')
    const source = new ExpenseRepository(sourceDb)
    source.create({
      amountText: '18.50',
      occurredAt: '2026-07-18T12:00:00.000Z',
      parentCategoryId: 'food',
      categoryId: 'food-lunch',
      note: '午餐, 工作日',
      paymentMethod: 'wechat'
    })

    const csv = exportCsv(source.list())
    expect(csv.startsWith('\ufeff')).toBe(true)
    expect(csv).toContain('金额,发生时间,一级分类,二级分类,备注,支付方式')
    expect(csv).toContain('"午餐, 工作日"')

    const backup = createBackupJson(sourceDb)
    const targetDb = openDatabase(':memory:')
    expect(restoreBackupJson(targetDb, backup)).toBe(1)
    expect(new ExpenseRepository(targetDb).list()[0]).toMatchObject({ amountCents: 1850, categoryName: '午餐' })
    sourceDb.close()
    targetDb.close()
  })

  it('拒绝版本错误或结构损坏的备份', () => {
    const db = openDatabase(':memory:')
    expect(() => restoreBackupJson(db, '{"version":2,"categories":[],"expenses":[]}')).toThrow()
    expect(() => restoreBackupJson(db, '{"version":1,"categories":"bad","expenses":[]}')).toThrow()
    db.close()
  })
})
