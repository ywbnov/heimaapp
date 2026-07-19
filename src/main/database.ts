import Database from 'better-sqlite3'
import { defaultCategories } from '../shared/categories'

export type SqliteDatabase = Database.Database

export function openDatabase(filename: string): SqliteDatabase {
  const db = new Database(filename)
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      parent_id TEXT REFERENCES categories(id),
      name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL,
      is_builtin INTEGER NOT NULL DEFAULT 1,
      is_deleted INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
      occurred_at TEXT NOT NULL,
      parent_category_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      parent_category_name TEXT NOT NULL,
      category_name TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      payment_method TEXT NOT NULL DEFAULT 'other',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_deleted INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  const columns = db.prepare('PRAGMA table_info(categories)').all() as Array<{ name: string }>
  const columnNames = new Set(columns.map((column) => column.name))
  if (!columnNames.has('is_builtin')) {
    db.exec('ALTER TABLE categories ADD COLUMN is_builtin INTEGER NOT NULL DEFAULT 1')
  }
  if (!columnNames.has('is_deleted')) {
    db.exec('ALTER TABLE categories ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0')
  }

  const insert = db.prepare(
    'INSERT OR IGNORE INTO categories (id, parent_id, name, enabled, sort_order, is_builtin, is_deleted) VALUES (@id, @parentId, @name, @enabled, @sortOrder, @isBuiltin, @isDeleted)'
  )
  const restoreBuiltin = db.prepare(`
    UPDATE categories
    SET parent_id = @parentId, name = @name, enabled = 1, sort_order = @sortOrder,
        is_builtin = 1, is_deleted = 0
    WHERE id = @id
  `)
  const seed = db.transaction(() => {
    defaultCategories.forEach((category) => {
      const params = {
        id: category.id,
        parentId: category.parentId,
        name: category.name,
        enabled: category.enabled ? 1 : 0,
        sortOrder: category.sortOrder,
        isBuiltin: category.isBuiltin ? 1 : 0,
        isDeleted: category.isDeleted ? 1 : 0
      }
      insert.run(params)
      restoreBuiltin.run(params)
    })
  })
  seed()

  return db
}
