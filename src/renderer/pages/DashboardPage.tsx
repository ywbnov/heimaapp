import { Card, List, Tag, Typography } from 'antd'
import { SummaryCards } from '../components/SummaryCards'
import { formatCents } from '../components/ExpenseTable'
import type { Expense } from '../../shared/types'

export function DashboardPage({ expenses }: { expenses: Expense[] }) {
  const recent = expenses.slice(0, 5)
  return (
    <div className="page-stack dashboard-page">
      <div className="page-heading">
        <Typography.Title level={2}>概览</Typography.Title>
        <Typography.Text type="secondary">先看整体，再从每一笔记录找到消费习惯。</Typography.Text>
      </div>
      <SummaryCards expenses={expenses} />
      <Card title="最近账目" variant="borderless" className="recent-card">
        {recent.length ? (
          <List
            dataSource={recent}
            renderItem={(expense) => (
              <List.Item extra={<strong className="expense-amount">{formatCents(expense.amountCents)}</strong>}>
                <List.Item.Meta
                  title={<span>{expense.categoryName} <Tag>{expense.parentCategoryName}</Tag></span>}
                  description={`${new Date(expense.occurredAt).toLocaleDateString('zh-CN')} · ${expense.note || '未填写备注'}`}
                />
              </List.Item>
            )}
          />
        ) : (
          <Typography.Text type="secondary">还没有账目，先记录第一笔花销吧。</Typography.Text>
        )}
      </Card>
    </div>
  )
}
