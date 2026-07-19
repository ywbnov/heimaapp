import { Card, Typography } from 'antd'
import { ExpenseForm } from '../components/ExpenseForm'
import type { Category, ExpenseInput } from '../../shared/types'

interface AddExpensePageProps {
  categories: Category[]
  submitting: boolean
  onSubmit: (input: ExpenseInput) => Promise<void>
}

export function AddExpensePage({ categories, submitting, onSubmit }: AddExpensePageProps) {
  return (
    <div className="page-stack">
      <div className="page-heading">
        <Typography.Title level={2}>记一笔</Typography.Title>
        <Typography.Text type="secondary">记录下刚刚发生的支出，月底回看会更清楚。</Typography.Text>
      </div>
      <Card className="form-card" bordered={false}>
        <ExpenseForm categories={categories} submitting={submitting} onSubmit={onSubmit} />
      </Card>
    </div>
  )
}
