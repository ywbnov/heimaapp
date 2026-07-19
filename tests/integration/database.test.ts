import { openDatabase } from '../../src/main/database'
import { CategoryRepository } from '../../src/main/repositories/categoryRepository'
import { ExpenseRepository } from '../../src/main/repositories/expenseRepository'
import type { ExpenseInput } from '../../src/shared/types'

const validInput: ExpenseInput = {
  amountText: '18.50',
  occurredAt: '2026-07-18T12:00:00.000Z',
  parentCategoryId: 'food',
  categoryId: 'food-lunch',
  note: '工作日午餐',
  paymentMethod: 'wechat'
}

describe('SQLite 数据层', () => {
  it('创建数据库时初始化默认分类', () => {
    const db = openDatabase(':memory:')
    const categories = new CategoryRepository(db).list()

    expect(categories.some((category) => category.name === '餐饮')).toBe(true)
    expect(categories.some((category) => category.name === '午餐')).toBe(true)
    db.close()
  })

  it('可以新增、修改、筛选和软删除花销', () => {
    const db = openDatabase(':memory:')
    const repository = new ExpenseRepository(db)
    const created = repository.create(validInput)

    expect(created.amountCents).toBe(1850)
    expect(created.parentCategoryName).toBe('餐饮')
    expect(repository.list()).toHaveLength(1)

    repository.update(created.id, { ...validInput, amountText: '20.00', note: '修改后的午餐' })
    expect(repository.list()[0].amountCents).toBe(2000)
    expect(repository.list({ parentCategoryId: 'transport' })).toHaveLength(0)
    expect(repository.list({ from: '2026-07-19T00:00:00.000Z' })).toHaveLength(0)

    repository.softDelete(created.id)
    expect(repository.list()).toHaveLength(0)
    db.close()
  })

  it('停用分类后历史花销仍保留，新花销不能使用该分类', () => {
    const db = openDatabase(':memory:')
    const categoryRepository = new CategoryRepository(db)
    const expenseRepository = new ExpenseRepository(db)
    const created = expenseRepository.create(validInput)

    categoryRepository.setEnabled('food-lunch', false)
    expect(expenseRepository.list()[0].categoryName).toBe('午餐')
    expect(() => expenseRepository.create(validInput)).toThrow()
    expect(categoryRepository.list().find((category) => category.id === 'food-lunch')?.enabled).toBe(false)
    expect(created.categoryId).toBe('food-lunch')
    db.close()
  })
})
