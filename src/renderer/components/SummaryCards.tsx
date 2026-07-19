import { Card, Col, Row, Statistic } from 'antd'
import type { Expense } from '../../shared/types'

function startOfWeek(date: Date) {
  const value = new Date(date)
  const day = value.getDay() || 7
  value.setHours(0, 0, 0, 0)
  value.setDate(value.getDate() - day + 1)
  return value
}

function amountFor(expenses: Expense[], predicate: (date: Date) => boolean) {
  return expenses.filter((expense) => predicate(new Date(expense.occurredAt))).reduce((sum, expense) => sum + expense.amountCents, 0) / 100
}

export function SummaryCards({ expenses }: { expenses: Expense[] }) {
  const now = new Date()
  const today = now.toDateString()
  const month = now.getMonth()
  const year = now.getFullYear()
  const weekStart = startOfWeek(now)
  const values = [
    { label: '今日支出', value: amountFor(expenses, (date) => date.toDateString() === today) },
    { label: '本周支出', value: amountFor(expenses, (date) => date >= weekStart) },
    { label: '本月支出', value: amountFor(expenses, (date) => date.getFullYear() === year && date.getMonth() === month) },
    { label: '本年度支出', value: amountFor(expenses, (date) => date.getFullYear() === year) }
  ]

  return (
    <Row gutter={[16, 16]}>
      {values.map((item) => (
        <Col xs={24} sm={12} xl={6} key={item.label}>
          <Card className="summary-card" variant="borderless">
            <Statistic title={item.label} value={item.value} precision={2} prefix="¥" />
          </Card>
        </Col>
      ))}
    </Row>
  )
}
