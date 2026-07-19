import Database from 'better-sqlite3'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
    expect(categories.every((category) => category.isBuiltin && !category.isDeleted)).toBe(true)
    db.close()
  })

  it('升级旧数据库时恢复预置分类为只读启用状态', () => {
    const directory = mkdtempSync(join(tmpdir(), 'heima-category-migration-'))
    const filename = join(directory, 'legacy.sqlite')
    const legacy = new Database(filename)
    legacy.exec(`
      CREATE TABLE categories (
        id TEXT PRIMARY KEY,
        parent_id TEXT REFERENCES categories(id),
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL
      );
      INSERT INTO categories (id, parent_id, name, enabled, sort_order)
      VALUES ('food', NULL, '餐饮', 0, 10);
    `)
    legacy.close()

    const db = openDatabase(filename)
    expect(new CategoryRepository(db).list().find((category) => category.id === 'food')).toMatchObject({
      enabled: true,
      isBuiltin: true,
      isDeleted: false
    })
    db.close()
    rmSync(directory, { recursive: true, force: true })
  })

  it('支持新增一级和二级自定义分类，并允许重命名', () => {
    const db = openDatabase(':memory:')
    const repository = new CategoryRepository(db)

    const parent = repository.create(null, '自定义一级')
    const child = repository.create(parent.id, '自定义二级')
    repository.rename(child.id, '重命名二级')

    expect(parent).toMatchObject({ parentId: null, name: '自定义一级', isBuiltin: false, isDeleted: false })
    expect(repository.list().find((category) => category.id === child.id)).toMatchObject({
      parentId: parent.id,
      name: '重命名二级',
      isBuiltin: false,
      isDeleted: false
    })
    db.close()
  })

  it('一次创建一级分类和多个二级分类', () => {
    const db = openDatabase(':memory:')
    const repository = new CategoryRepository(db)

    const created = repository.createBatch({
      mode: 'new-parent',
      parentName: '汽车',
      childNames: ['加油', '停车', '  ']
    })

    expect(created).toHaveLength(3)
    const parent = created.find((category) => category.parentId === null)
    expect(parent).toMatchObject({ name: '汽车', isBuiltin: false })
    expect(created.filter((category) => category.parentId === parent?.id).map((category) => category.name)).toEqual(['加油', '停车'])
    db.close()
  })

  it('向已有一级分类批量添加二级分类并拒绝同批次重名', () => {
    const db = openDatabase(':memory:')
    const repository = new CategoryRepository(db)

    expect(() => repository.createBatch({
      mode: 'existing-parent',
      parentId: 'food',
      childNames: ['夜宵', ' 夜宵 ']
    })).toThrow()
    expect(repository.list().some((category) => category.name === '夜宵')).toBe(false)

    const created = repository.createBatch({
      mode: 'existing-parent',
      parentId: 'food',
      childNames: ['夜宵', '聚餐']
    })
    expect(created.map((category) => category.name)).toEqual(['夜宵', '聚餐'])
    expect(created.every((category) => category.parentId === 'food')).toBe(true)
    db.close()
  })

  it('拒绝修改预置分类，并对自定义分类执行逻辑删除', () => {
    const db = openDatabase(':memory:')
    const repository = new CategoryRepository(db)
    const custom = repository.create('food', '自定义餐饮')

    expect(() => repository.rename('food', '不能改')).toThrow()
    expect(() => repository.setEnabled('food', false)).toThrow()
    expect(() => repository.softDelete('food')).toThrow()

    repository.softDelete(custom.id)
    expect(repository.list().find((category) => category.id === custom.id)).toMatchObject({
      enabled: false,
      isDeleted: true,
      isBuiltin: false
    })
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
    const custom = categoryRepository.create('food', '自定义午餐')
    const customInput = { ...validInput, categoryId: custom.id }
    const created = expenseRepository.create(customInput)

    categoryRepository.setEnabled(custom.id, false)
    expect(expenseRepository.list()[0].categoryName).toBe('自定义午餐')
    expect(() => expenseRepository.create(customInput)).toThrow()
    expect(categoryRepository.list().find((category) => category.id === custom.id)?.enabled).toBe(false)
    expect(created.categoryId).toBe(custom.id)
    db.close()
  })
})
