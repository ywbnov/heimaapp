# 自定义分类与分类管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有两级分类上增加自定义分类的新增、重命名、启停用和逻辑删除，同时让预置分类保持只读。

**Architecture:** SQLite `categories` 表通过 `is_builtin`/`is_deleted` 标记区分预置、自定义和逻辑删除状态。主进程仓库负责所有权限校验，IPC/preload 只暴露类型化分类操作，React 设置页负责新增和编辑交互；记账和统计继续消费同一分类列表并保留账目名称快照。

**Tech Stack:** Electron, React, TypeScript, Ant Design, better-sqlite3, Vitest, Testing Library。

---

### Task 1: 分类类型与数据库迁移

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/shared/categories.ts`
- Modify: `src/main/database.ts`
- Test: `tests/integration/database.test.ts`

- [ ] **Step 1: 写失败测试**：断言默认分类返回 `isBuiltin=true/isDeleted=false`；断言新增字段能在已有数据库迁移后读取。
- [ ] **Step 2: 运行数据库测试确认失败**：`npm test -- tests/integration/database.test.ts`，预期因类型和数据库字段不存在而失败。
- [ ] **Step 3: 实现最小类型和迁移**：给 `Category` 增加 `isBuiltin`、`isDeleted`；默认分类构造器填充标记；建表加入两列，并用 `PRAGMA table_info(categories)` 对旧库执行 `ALTER TABLE`；种子数据写入预置标记。
- [ ] **Step 4: 运行数据库测试确认通过**：`npm test -- tests/integration/database.test.ts`。

### Task 2: 仓库层新增、重命名、逻辑删除与权限保护

**Files:**
- Modify: `src/main/repositories/categoryRepository.ts`
- Modify: `src/shared/expenseRules.ts`
- Test: `tests/integration/database.test.ts`

- [ ] **Step 1: 写失败测试**：覆盖新增一级/二级分类、重命名自定义分类、逻辑删除后不可用于新账目、预置分类拒绝重命名/停用/删除，以及父级不存在或非一级时拒绝新增。
- [ ] **Step 2: 运行测试确认失败**：`npm test -- tests/integration/database.test.ts`，预期新仓库方法未定义或预置保护未生效。
- [ ] **Step 3: 实现最小仓库行为**：新增 `create(parentId, name)`、`rename(id, name)`、`softDelete(id)`；生成随机 ID 和递增排序值；所有变更前检查 `isBuiltin`；`list` 映射新字段；删除设置 `isDeleted=1, enabled=0`。
- [ ] **Step 4: 更新记账校验**：`validateExpenseInput` 除 `enabled` 外同时排除 `isDeleted` 分类。
- [ ] **Step 5: 运行测试确认通过**：`npm test -- tests/integration/database.test.ts tests/unit/expenseRules.test.ts`。

### Task 3: IPC、preload 和渲染状态 API

**Files:**
- Modify: `src/main/ipc.ts`
- Modify: `src/preload/api.ts`
- Modify: `src/renderer/hooks/useExpenses.ts`
- Test: `tests/integration/ipcContract.test.ts`

- [ ] **Step 1: 写失败测试**：断言新增、重命名、删除 IPC 的参数校验，并验证非法预置分类操作由仓库拒绝。
- [ ] **Step 2: 运行测试确认失败**：`npm test -- tests/integration/ipcContract.test.ts`。
- [ ] **Step 3: 添加类型化 IPC/preload 方法**：增加 `categories:create`、`categories:rename`、`categories:delete` 通道和 `AccountingApi` 对应方法；对 `name`、`parentId`、`id` 做字符串校验，一级分类用 `null` 表示无父级。
- [ ] **Step 4: 扩展 `useExpenses`**：新增 create/rename/delete 回调，成功后更新本地分类状态或刷新分类列表并传播错误。
- [ ] **Step 5: 运行 IPC 测试确认通过**：`npm test -- tests/integration/ipcContract.test.ts`。

### Task 4: 设置页分类管理 UI

**Files:**
- Modify: `src/renderer/pages/SettingsPage.tsx`
- Modify: `src/renderer/App.tsx`
- Test: `tests/renderer/SettingsPage.test.tsx`

- [ ] **Step 1: 写失败渲染测试**：验证新增分类按钮、一级/二级父级选择、用户分类编辑/删除入口，以及预置分类没有编辑/删除入口且不能切换状态。
- [ ] **Step 2: 运行测试确认失败**：`npm test -- tests/renderer/SettingsPage.test.tsx`。
- [ ] **Step 3: 实现新增弹窗**：使用 Ant Design `Modal`、`Form`、`Select`、`Input`；父级选项包含“一级分类”和启用未删除的一级分类。
- [ ] **Step 4: 实现自定义分类操作**：自定义分类显示编辑按钮、删除确认和启停用开关；预置分类显示只读标签；删除后从可选分类列表中消失但保留在设置列表的已删除状态中。
- [ ] **Step 5: 在 `App.tsx` 接线**：从 `useExpenses` 传入创建、重命名、删除回调，并用消息提示成功/失败。
- [ ] **Step 6: 运行渲染测试确认通过**：`npm test -- tests/renderer/SettingsPage.test.tsx tests/renderer/ExpenseForm.test.tsx`。

### Task 5: 备份兼容与全量回归

**Files:**
- Modify: `src/main/exportService.ts`
- Modify: `tests/integration/exportService.test.ts`
- Modify: `readme.md`

- [ ] **Step 1: 写失败测试**：备份包含分类标记；恢复旧版缺少标记时默认按预置分类处理；恢复自定义分类后可再次读取。
- [ ] **Step 2: 运行导出测试确认失败**：`npm test -- tests/integration/exportService.test.ts`。
- [ ] **Step 3: 更新备份/恢复映射**：导出 `isBuiltin/isDeleted`；恢复时对旧备份填充 `isBuiltin=true`、`isDeleted=false`，并在插入前按父级排序。
- [ ] **Step 4: 更新文档**：说明预置分类只读、自定义分类可新增/编辑/逻辑删除，历史账单保留。
- [ ] **Step 5: 运行完整验证**：`npm test`、`npm run build`，确认所有测试和 TypeScript 构建通过。
