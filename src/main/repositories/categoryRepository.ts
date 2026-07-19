import { randomUUID } from 'node:crypto'
import type { Category, CategoryBatchInput } from '../../shared/types'
import type { SqliteDatabase } from '../database'

type CategoryRow = {
  id: string
  parent_id: string | null
  name: string
  enabled: number
  sort_order: number
  is_builtin: number
  is_deleted: number
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    enabled: row.enabled === 1,
    sortOrder: row.sort_order,
    isBuiltin: row.is_builtin === 1,
    isDeleted: row.is_deleted === 1
  }
}

export class CategoryRepository {
  constructor(private readonly db: SqliteDatabase) {}

  list(): Category[] {
    const rows = this.db.prepare(
      'SELECT id, parent_id, name, enabled, sort_order, is_builtin, is_deleted FROM categories ORDER BY sort_order'
    ).all() as CategoryRow[]
    return rows.map(mapCategory)
  }

  create(parentId: string | null, name: string): Category {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('分类名称不能为空')

    if (parentId !== null) {
      const parent = this.db.prepare(
        'SELECT parent_id, is_deleted, enabled FROM categories WHERE id = @id'
      ).get({ id: parentId }) as { parent_id: string | null; is_deleted: number; enabled: number } | undefined
      if (!parent || parent.parent_id !== null || parent.is_deleted === 1 || parent.enabled !== 1) {
        throw new Error('父级分类无效')
      }
    }

    const nextSortOrder = (this.db.prepare(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 AS value FROM categories'
    ).get() as { value: number }).value
    const id = `custom-${randomUUID()}`
    this.db.prepare(`
      INSERT INTO categories (id, parent_id, name, enabled, sort_order, is_builtin, is_deleted)
      VALUES (@id, @parentId, @name, 1, @sortOrder, 0, 0)
    `).run({ id, parentId, name: trimmed, sortOrder: nextSortOrder })
    return this.list().find((category) => category.id === id) as Category
  }

  createBatch(input: CategoryBatchInput): Category[] {
    const childNames = input.childNames.map((name) => name.trim()).filter(Boolean)
    if (new Set(childNames).size !== childNames.length) throw new Error('二级分类名称不能重复')
    if (input.mode === 'existing-parent' && childNames.length === 0) throw new Error('请至少填写一个二级分类')

    const createAll = this.db.transaction(() => {
      const created: Category[] = []
      let parentId: string
      if (input.mode === 'new-parent') {
        const parent = this.create(null, input.parentName)
        created.push(parent)
        parentId = parent.id
      } else {
        const parent = this.list().find((category) => category.id === input.parentId)
        if (!parent || parent.parentId !== null || !parent.enabled || parent.isDeleted) {
          throw new Error('父级分类无效')
        }
        parentId = parent.id
      }

      childNames.forEach((name) => created.push(this.create(parentId, name)))
      return created
    })
    return createAll()
  }

  setEnabled(id: string, enabled: boolean): void {
    const category = this.db.prepare(
      'SELECT is_builtin, is_deleted FROM categories WHERE id = @id'
    ).get({ id }) as { is_builtin: number; is_deleted: number } | undefined
    if (!category) throw new Error('分类不存在')
    if (category.is_builtin === 1) throw new Error('预置分类不可修改')
    if (category.is_deleted === 1 && enabled) throw new Error('已删除分类不可启用')

    this.db.prepare('UPDATE categories SET enabled = @enabled WHERE id = @id').run({
      id,
      enabled: enabled ? 1 : 0
    })
  }

  rename(id: string, name: string): void {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('分类名称不能为空')
    const category = this.db.prepare(
      'SELECT is_builtin, is_deleted FROM categories WHERE id = @id'
    ).get({ id }) as { is_builtin: number; is_deleted: number } | undefined
    if (!category) throw new Error('分类不存在')
    if (category.is_builtin === 1) throw new Error('预置分类不可修改')
    if (category.is_deleted === 1) throw new Error('已删除分类不可修改')
    this.db.prepare('UPDATE categories SET name = @name WHERE id = @id').run({ id, name: trimmed })
  }

  softDelete(id: string): void {
    const category = this.db.prepare(
      'SELECT is_builtin, is_deleted FROM categories WHERE id = @id'
    ).get({ id }) as { is_builtin: number; is_deleted: number } | undefined
    if (!category) throw new Error('分类不存在')
    if (category.is_builtin === 1) throw new Error('预置分类不可删除')
    if (category.is_deleted === 1) throw new Error('分类已删除')
    this.db.prepare('UPDATE categories SET enabled = 0, is_deleted = 1 WHERE id = @id').run({ id })
  }
}
