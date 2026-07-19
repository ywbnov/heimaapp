# 独立分类页与批量创建分类 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把分类管理迁移到独立导航页，并支持一次创建一级分类及多个二级分类。

**Architecture:** 共享层新增批量分类输入类型，主进程仓库在 SQLite 事务中整组创建分类，IPC/preload 和渲染 hook 暴露单一批量接口。React 新建独立 `CategoriesPage`，使用吸顶工具栏、搜索筛选、一级分类折叠分组和批量新增弹窗；设置页退回纯数据管理职责。

**Tech Stack:** Electron, React, TypeScript, Ant Design, better-sqlite3, Vitest, Testing Library。

---

### Task 1: 批量分类数据契约与事务

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/main/repositories/categoryRepository.ts`
- Test: `tests/integration/database.test.ts`

- [ ] **Step 1: 写失败测试**：调用 `createBatch` 创建“新一级 + 多个二级”和“已有一级 + 多个二级”，并断言任一非法子分类导致整组回滚。
- [ ] **Step 2: 运行测试确认失败**：`npm test -- tests/integration/database.test.ts`，预期 `createBatch` 不存在。
- [ ] **Step 3: 定义 `CategoryBatchInput`**：使用联合类型区分 `{ mode: 'new-parent'; parentName; childNames }` 与 `{ mode: 'existing-parent'; parentId; childNames }`。
- [ ] **Step 4: 实现事务方法**：复用分类名称和父级校验，在单个 SQLite transaction 中创建整组分类并返回 `Category[]`；过滤空白子项，拒绝同批次重复名称。
- [ ] **Step 5: 运行数据库测试确认通过**：`npm test -- tests/integration/database.test.ts`。

### Task 2: 接通批量创建 API

**Files:**
- Modify: `src/main/ipc.ts`
- Modify: `src/preload/api.ts`
- Modify: `src/renderer/hooks/useExpenses.ts`
- Test: `tests/integration/ipcContract.test.ts`

- [ ] **Step 1: 写失败测试**：验证 `categories:create-batch` 接受两种合法输入，并拒绝缺少模式、父级或名称数组的输入。
- [ ] **Step 2: 运行测试确认失败**：`npm test -- tests/integration/ipcContract.test.ts`。
- [ ] **Step 3: 注册 IPC 和 preload 方法**：添加 `createCategoryBatch(input)`，IPC 对联合类型字段逐项校验后调用仓库事务。
- [ ] **Step 4: 更新渲染 hook**：批量创建成功后一次合并返回分类并按 `sortOrder` 排序，保留现有单分类方法供其他调用方兼容。
- [ ] **Step 5: 运行 IPC 测试确认通过**：`npm test -- tests/integration/ipcContract.test.ts`。

### Task 3: 独立分类页面与批量新增弹窗

**Files:**
- Create: `src/renderer/pages/CategoriesPage.tsx`
- Create: `tests/renderer/CategoriesPage.test.tsx`
- Modify: `src/renderer/styles.css`

- [ ] **Step 1: 写失败渲染测试**：覆盖吸顶“新增分类”按钮、搜索、状态筛选、一级分类折叠分组、预置只读和自定义分类操作。
- [ ] **Step 2: 写批量弹窗失败测试**：覆盖新建一级及多个二级分类、向已有一级批量添加、重复名称提示。
- [ ] **Step 3: 运行测试确认失败**：`npm test -- tests/renderer/CategoriesPage.test.tsx`。
- [ ] **Step 4: 实现页面结构**：用 `Collapse` 按一级分类分组；工具栏使用 sticky 定位，包含搜索、状态筛选和新增按钮；加入 `FloatButton.BackTop`。
- [ ] **Step 5: 实现批量弹窗**：使用模式选择、父级选择和 `Form.List` 动态二级分类输入，提交为 `CategoryBatchInput`。
- [ ] **Step 6: 实现管理操作**：复用自定义分类重命名、启停用、逻辑删除交互；预置分类仅显示只读标记。
- [ ] **Step 7: 运行分类页测试确认通过**：`npm test -- tests/renderer/CategoriesPage.test.tsx`。

### Task 4: 导航迁移与设置页精简

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/pages/SettingsPage.tsx`
- Modify: `tests/renderer/App.test.tsx`
- Modify: `tests/renderer/SettingsPage.test.tsx`

- [ ] **Step 1: 写失败测试**：断言主导航出现“分类”，点击后显示分类页；设置页不再显示分类管理和新增分类入口。
- [ ] **Step 2: 运行测试确认失败**：`npm test -- tests/renderer/App.test.tsx tests/renderer/SettingsPage.test.tsx`。
- [ ] **Step 3: 接入导航**：添加分类图标和 `categories` 路由分支，把分类回调传给 `CategoriesPage`。
- [ ] **Step 4: 精简设置页**：移除分类 props、分类列表和分类弹窗，仅保留数据管理。
- [ ] **Step 5: 运行渲染测试确认通过**：`npm test -- tests/renderer/App.test.tsx tests/renderer/SettingsPage.test.tsx tests/renderer/CategoriesPage.test.tsx`。

### Task 5: 文档、完整验证和用户验收

**Files:**
- Modify: `readme.md`
- Reference: `.agents/memory.md`

- [ ] **Step 1: 更新 README**：说明独立分类栏目、吸顶操作栏和批量建立两级分类。
- [ ] **Step 2: 运行完整测试**：`npm test`，要求所有测试通过。
- [ ] **Step 3: 运行生产构建**：`npm run build`，要求 Electron main/preload/renderer 全部构建成功。
- [ ] **Step 4: 启动桌面应用**：在桌面权限下运行 `npm run dev -- --noSandbox`。
- [ ] **Step 5: 按项目 memory 交给用户测试**：提供独立分类导航、固定新增按钮、批量创建和预置只读的手工验收清单，等待用户反馈。
