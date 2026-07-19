import { useState } from 'react'
import { Button, Layout, Menu, Space, Typography, message } from 'antd'
import {
  BarChartOutlined,
  BookOutlined,
  DashboardOutlined,
  PlusOutlined,
  SettingOutlined,
  TagsOutlined
} from '@ant-design/icons'
import { AddExpensePage } from './pages/AddExpensePage'
import { LedgerPage } from './pages/LedgerPage'
import { DashboardPage } from './pages/DashboardPage'
import { StatsPage } from './pages/StatsPage'
import { SettingsPage } from './pages/SettingsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { useExpenses } from './hooks/useExpenses'

const { Header, Sider, Content } = Layout

const navigation = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: '概览' },
  { key: 'add', icon: <PlusOutlined />, label: '记一笔' },
  { key: 'ledger', icon: <BookOutlined />, label: '账目' },
  { key: 'categories', icon: <TagsOutlined />, label: '分类' },
  { key: 'stats', icon: <BarChartOutlined />, label: '统计' },
  { key: 'settings', icon: <SettingOutlined />, label: '设置' }
]

function App() {
  const [activeKey, setActiveKey] = useState('dashboard')
  const {
    categories,
    expenses,
    submitting,
    createExpense,
    deleteExpense,
    setCategoryEnabled,
    createCategoryBatch,
    renameCategory,
    deleteCategory,
    exportCsv,
    backupJson,
    restoreJson
  } = useExpenses()
  const [messageApi, contextHolder] = message.useMessage()
  const activeLabel = navigation.find((item) => item.key === activeKey)?.label ?? '概览'

  async function handleCreateExpense(input: Parameters<typeof createExpense>[0]) {
    await createExpense(input)
    messageApi.success('已保存这笔花销')
    setActiveKey('dashboard')
  }

  async function handleDeleteExpense(id: string) {
    await deleteExpense(id)
    messageApi.success('已删除这笔账目')
  }

  async function handleCreateCategoryBatch(input: Parameters<typeof createCategoryBatch>[0]) {
    const created = await createCategoryBatch(input)
    messageApi.success(`已新增 ${created.length} 个分类`)
    return created
  }

  async function handleRenameCategory(id: string, name: string) {
    await renameCategory(id, name)
    messageApi.success('分类已修改')
  }

  async function handleDeleteCategory(id: string) {
    await deleteCategory(id)
    messageApi.success('分类已删除')
  }

  return (
    <Layout className="app-shell">
      {contextHolder}
      <Sider width={228} theme="light" className="app-sider">
        <div className="brand-mark">
          <div className="brand-icon">黑</div>
          <div>
            <Typography.Title level={4} className="brand-title">
              黑马记账
            </Typography.Title>
            <Typography.Text className="brand-subtitle">轻松看清每一笔</Typography.Text>
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activeKey]}
          items={navigation}
          onClick={({ key }) => setActiveKey(key)}
          className="main-menu"
        />
      </Sider>
      <Layout>
        <Header className="app-header">
          <Space align="center" size={16}>
            <Typography.Text className="header-kicker">个人账本</Typography.Text>
            <Typography.Title level={3} className="header-title">
              {activeLabel}
            </Typography.Title>
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setActiveKey('add')}>
            记一笔
          </Button>
        </Header>
        <Content className="app-content">
          {activeKey === 'add' ? (
            <AddExpensePage categories={categories} submitting={submitting} onSubmit={handleCreateExpense} />
          ) : activeKey === 'ledger' ? (
            <LedgerPage expenses={expenses} categories={categories} onDelete={handleDeleteExpense} />
          ) : activeKey === 'stats' ? (
            <StatsPage expenses={expenses} categories={categories} />
          ) : activeKey === 'categories' ? (
            <CategoriesPage
              categories={categories}
              onSetCategoryEnabled={setCategoryEnabled}
              onCreateCategoryBatch={handleCreateCategoryBatch}
              onRenameCategory={handleRenameCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          ) : activeKey === 'dashboard' ? (
            <DashboardPage expenses={expenses} />
          ) : activeKey === 'settings' ? (
            <SettingsPage
              onExportCsv={exportCsv}
              onBackupJson={backupJson}
              onRestoreJson={async () => {
                const count = await restoreJson()
                messageApi.success(`已恢复 ${count} 笔账目`)
                return count
              }}
            />
          ) : (
            <div className="welcome-panel">
              <Typography.Title level={2}>今天也要记得记录</Typography.Title>
              <Typography.Paragraph>
                用一笔清晰的记录，掌握自己的每月支出。
              </Typography.Paragraph>
              <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setActiveKey('add')}>
                记录第一笔花销
              </Button>
            </div>
          )}
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
