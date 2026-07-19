# 黑马记账 MVP 实施计划

> **给执行人员的要求：**按任务逐项执行，每一步使用复选框跟踪。实现功能时先写测试、确认测试失败，再写最小实现使测试通过。

**目标：**构建一个可在 Windows 和 macOS 运行的桌面 MVP，支持人民币花销记录、两级分类、本地 SQLite 保存、账目筛选、基础统计以及 CSV/JSON 备份。

**架构：**Electron 负责桌面窗口和受控本地能力。React 渲染界面只能通过类型明确的 preload API 与主进程通信；SQLite 连接、文件读写和导入导出全部由主进程负责。金额、分类和统计规则放在独立的共享 TypeScript 模块中，以便用 Vitest 快速测试。

**技术栈：**Electron、electron-vite、electron-builder、React、TypeScript、Ant Design、better-sqlite3、Vitest、React Testing Library、Recharts。

**执行状态（2026-07-18）：**任务 1-8 的 MVP 主流程已实现；任务 9 已完成 Windows x64 构建和 NSIS 安装包，macOS DMG 仍需在 macOS 环境完成实机打包与验证。分类新增/重命名和账目编辑延后到下一轮，当前版本支持分类启用/停用和账目删除。

---

## 文件职责

- 新建 `package.json`：脚本、运行依赖和打包元数据。
- 新建 `electron.vite.config.ts`：主进程、preload 和渲染进程入口配置。
- 新建 `tsconfig.json`、`tsconfig.node.json`、`vitest.config.ts`：TypeScript 和测试配置。
- 新建 `src/shared/types.ts`：花销、分类、筛选条件、汇总和 IPC 数据类型。
- 新建 `src/shared/categories.ts`：README 中确认的默认两级分类目录。
- 新建 `src/shared/expenseRules.ts`：金额/日期/分类校验和汇总计算等纯函数。
- 新建 `src/main/database.ts`：SQLite 连接、建表、默认分类初始化和迁移。
- 新建 `src/main/repositories/expenseRepository.ts`：花销的新增、查询、修改和软删除。
- 新建 `src/main/repositories/categoryRepository.ts`：分类查询、重命名和启用/停用。
- 新建 `src/main/exportService.ts`：CSV 导出、JSON 备份和恢复校验。
- 新建 `src/main/ipc.ts`、`src/main/index.ts`：类型化 IPC 处理器和 Electron 生命周期。
- 新建 `src/preload/index.ts`、`src/preload/api.ts`：通过 contextBridge 暴露 `window.accountingApi`。
- 新建 `src/renderer/App.tsx`、`src/renderer/main.tsx`、`src/renderer/styles.css`：渲染层外壳和主题。
- 新建 `src/renderer/components/ExpenseForm.tsx`、`ExpenseTable.tsx`、`SummaryCards.tsx`：可复用界面单元。
- 新建 `src/renderer/pages/DashboardPage.tsx`、`LedgerPage.tsx`、`StatsPage.tsx`、`SettingsPage.tsx`。
- 新建 `src/renderer/hooks/useExpenses.ts`：界面数据加载、保存和错误状态。
- 新建 `tests/unit/expenseRules.test.ts`、`tests/unit/categories.test.ts`：纯业务规则测试。
- 新建 `tests/integration/database.test.ts`、`tests/integration/exportService.test.ts`：临时 SQLite 和文件导入导出测试。
- 新建 `tests/renderer/ExpenseForm.test.tsx`、`tests/renderer/LedgerPage.test.tsx`：关键用户流程测试。

## 任务 1：初始化 Electron-Vite 项目

**文件：**`package.json`、`electron.vite.config.ts`、`tsconfig.json`、`tsconfig.node.json`、`vitest.config.ts`、`src/main/index.ts`、`src/preload/index.ts`、`src/renderer/main.tsx`、`src/renderer/App.tsx`、`src/renderer/styles.css`

- [ ] **步骤 1：创建项目清单和脚本。**配置 `dev`、`build`、`preview`、`test`、`test:watch`、`package`、`postinstall` 脚本，分别使用 `electron-vite dev`、`electron-vite build`、`vitest run` 和 `electron-builder`。
- [ ] **步骤 2：先写最小界面测试。**创建 `tests/renderer/App.test.tsx`，断言应用显示“黑马记账”和“概览、记一笔、账目、统计、设置”导航。
- [ ] **步骤 3：运行 `npm test -- --run tests/renderer/App.test.tsx` 并确认测试失败。**失败原因应是界面尚未提供这些内容，而不是配置或语法错误。
- [ ] **步骤 4：实现最小 Electron 窗口和 React 外壳。**开启 context isolation，关闭渲染层 Node integration，建立固定导航布局。
- [ ] **步骤 5：重新运行测试和 `npm run build`，确认通过并完成 Vite 构建。**

## 任务 2：建立共享类型和业务规则

**文件：**`src/shared/types.ts`、`src/shared/categories.ts`、`src/shared/expenseRules.ts`、`tests/unit/expenseRules.test.ts`、`tests/unit/categories.test.ts`

- [ ] **步骤 1：先写失败测试。**覆盖金额为 0/负数时拒绝、超过两位小数时拒绝、`12.30` 转为 `1230` 分、必须选择有效的一二级分类、按分类汇总金额。
- [ ] **步骤 2：运行 `npm test -- --run tests/unit` 并确认失败。**
- [ ] **步骤 3：实现 `parseAmountToCents`、`validateExpenseInput`、`groupExpensesByCategory` 以及 `Expense`/`Category` 类型。**金额始终以整数分保存，禁止使用浮点数做累计。
- [ ] **步骤 4：加入 README 第 4.2 节的默认分类。**每个分类具有稳定 ID、父级 ID、显示顺序和 `enabled: true`。
- [ ] **步骤 5：运行单元测试并确认通过。**

## 任务 3：建立 SQLite 数据库和数据仓库

**文件：**`src/main/database.ts`、`src/main/repositories/expenseRepository.ts`、`src/main/repositories/categoryRepository.ts`、`tests/integration/database.test.ts`

- [ ] **步骤 1：先写失败的集成测试。**使用临时数据库文件测试建表、默认分类初始化、新增花销、修改、软删除、按日期/分类筛选，以及停用分类后历史记录仍可显示。
- [ ] **步骤 2：运行 `npm test -- --run tests/integration/database.test.ts` 并确认失败。**
- [ ] **步骤 3：实现 SQLite 表。**建立 `categories`、`expenses`、`app_settings`，使用外键、整数分、ISO 时间和 `is_deleted` 字段；每次连接都启用外键约束。
- [ ] **步骤 4：实现仓库方法。**包含 `listCategories`、`setCategoryEnabled`、`createExpense`、`updateExpense`、`softDeleteExpense`、`listExpenses`、`getSummary`。
- [ ] **步骤 5：运行集成测试并确认通过。**

## 任务 4：加入类型化 IPC 和 preload 桥接

**文件：**`src/main/ipc.ts`、`src/main/index.ts`、`src/preload/api.ts`、`src/preload/index.ts`、`src/shared/types.ts`、`tests/integration/ipcContract.test.ts`

- [ ] **步骤 1：定义类型化 API。**包括 `getDashboardSummary`、`listExpenses`、`createExpense`、`updateExpense`、`deleteExpense`、`listCategories`、`setCategoryEnabled`、`exportCsv`、`backupJson`、`restoreJson`。
- [ ] **步骤 2：先写契约测试。**断言无效参数在进入数据仓库前被拒绝，有效参数返回明确类型的结果。
- [ ] **步骤 3：运行契约测试并确认失败。**
- [ ] **步骤 4：在主进程实现 IPC 处理器。**通过 preload 的 `contextBridge.exposeInMainWorld` 只暴露允许的方法。
- [ ] **步骤 5：运行契约测试和构建。**确认渲染层没有直接导入 `fs` 或数据库模块。

## 任务 5：实现导航和记一笔表单

**文件：**`src/renderer/App.tsx`、`src/renderer/components/ExpenseForm.tsx`、`src/renderer/hooks/useExpenses.ts`、`tests/renderer/ExpenseForm.test.tsx`

- [ ] **步骤 1：先写界面失败测试。**覆盖打开表单、输入 `12.30`、选择一级/二级分类、保存成功提示、空金额和非法金额拒绝。
- [ ] **步骤 2：运行界面测试并确认失败。**
- [ ] **步骤 3：用 Ant Design 实现表单。**默认当前日期时间，二级分类随一级分类联动，备注和支付方式为可选项，保存后提供“继续记一笔”。
- [ ] **步骤 4：在 `useExpenses` 中实现加载、保存、错误和未保存离开提示。**
- [ ] **步骤 5：运行界面测试并确认通过。**

## 任务 6：实现首页概览和账目列表

**文件：**`src/renderer/pages/DashboardPage.tsx`、`src/renderer/pages/LedgerPage.tsx`、`src/renderer/components/ExpenseTable.tsx`、`src/renderer/components/SummaryCards.tsx`、`tests/renderer/LedgerPage.test.tsx`

- [ ] **步骤 1：先写界面失败测试。**覆盖时间倒序、每日小计、日期/分类/支付方式筛选、编辑、删除确认和空状态引导。
- [ ] **步骤 2：运行测试并确认失败。**
- [ ] **步骤 3：实现账目表格。**使用 Ant Design Table、筛选控件、整数分人民币格式化、编辑/删除操作，并显示筛选结果总额和笔数。
- [ ] **步骤 4：实现首页汇总卡片。**显示今日、本周、本月、本年度支出，以及最近账目和快捷记账入口。
- [ ] **步骤 5：运行界面测试并确认通过。**

## 任务 7：实现统计页面

**文件：**`src/renderer/pages/StatsPage.tsx`、`src/renderer/components/CategoryBreakdown.tsx`、`src/renderer/components/MonthlyTrend.tsx`、`src/shared/expenseRules.ts`、`tests/unit/statistics.test.ts`

- [ ] **步骤 1：先写失败测试。**覆盖分类金额和占比、一级展开到二级、最近 6 个月月度金额，全部使用整数分计算。
- [ ] **步骤 2：运行统计测试并确认失败。**
- [ ] **步骤 3：实现纯汇总函数，并使用 Recharts 渲染分类占比图和月度趋势图。**
- [ ] **步骤 4：让统计页和账目页共享同一套筛选条件，防止数字不一致。**
- [ ] **步骤 5：运行全部单元测试和界面测试并确认通过。**

## 任务 8：实现分类管理和数据导出/恢复

**文件：**`src/renderer/pages/SettingsPage.tsx`、`src/main/exportService.ts`、`tests/integration/exportService.test.ts`

- [ ] **步骤 1：先写失败测试。**覆盖 UTF-8 CSV、完整 JSON 备份、错误备份拒绝，以及恢复到空临时数据库。
- [ ] **步骤 2：运行导出测试并确认失败。**
- [ ] **步骤 3：实现导出和恢复。**备份包含明确的版本号；写入临时文件后再原子替换；导入前先校验格式；界面显示受影响的记录数量。
- [ ] **步骤 4：实现分类新增、重命名和停用。**已有花销引用的分类禁止删除，只能停用。
- [ ] **步骤 5：运行集成测试并确认通过。**

## 任务 9：打包并验证 Windows/macOS

**文件：**`electron-builder.yml`、`readme.md`

- [ ] **步骤 1：加入打包配置。**配置 Windows NSIS 和 macOS DMG，应用名称为“黑马记账”，使用稳定 app ID，并把用户数据放到升级不会删除的位置。
- [ ] **步骤 2：把跨平台验收清单加入 README。**包括安装、启动、新增/编辑/删除、重启后数据、导出/恢复、停用分类、窗口缩放和断网运行。
- [ ] **步骤 3：在 Windows 运行 `npm run build` 和 `npm run package`。**安装生成的安装包，重启应用并确认账目仍在。
- [ ] **步骤 4：在 macOS 运行相同的构建和打包验证。**记录实际测试的系统版本，以及代码签名/公证限制。
- [ ] **步骤 5：运行 `npm test`，所有自动化测试通过后才可声明 MVP 完成。**

## 实施前自检

- [ ] README 中的每项 MVP 需求都对应到上面的任务。
- [ ] 所有金额计算都使用整数分。
- [ ] 渲染层访问 SQLite 和文件系统必须经过 preload IPC。
- [ ] 被历史数据引用的分类只能停用，不能直接删除。
- [ ] 每组行为都先看到测试失败，再实现使其通过。
- [ ] MVP 不加入云同步、账号体系或支付平台自动导入。
