import type { Category } from '../../shared/types'
import type { SqliteDatabase } from '../database'

type CategoryRow = {
  id: string
  parent_id: string | null
  name: string
  enabled: number
  sort_order: number
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    enabled: row.enabled === 1,
    sortOrder: row.sort_order
  }
}

export class CategoryRepository {
  constructor(private readonly db: SqliteDatabase) {}

  list(): Category[] {
    const rows = this.db.prepare('SELECT id, parent_id, name, enabled, sort_order FROM categories ORDER BY sort_order').all() as CategoryRow[]
    return rows.map(mapCategory)
  }

  setEnabled(id: string, enabled: boolean): void {
    const result = this.db.prepare('UPDATE categories SET enabled = @enabled WHERE id = @id').run({
      id,
      enabled: enabled ? 1 : 0
    })
    if (result.changes === 0) throw new Error('分类不存在')
  }

  rename(id: string, name: string): void {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('分类名称不能为空')
    const result = this.db.prepare('UPDATE categories SET name = @name WHERE id = @id').run({ id, name: trimmed })
    if (result.changes === 0) throw new Error('分类不存在')
  }
}
