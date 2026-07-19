import { useMemo, useState } from 'react'
import { Card, Empty, Input, Select, Space, Statistic, Typography } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { ExpenseTable } from '../components/ExpenseTable'
import type { Category, Expense, PaymentMethod } from '../../shared/types'

interface LedgerPageProps {
  expenses: Expense[]
  categories: Category[]
  onDelete: (id: string) => Promise<void> | void
  onEdit?: (expense: Expense) => void
}

export function LedgerPage({ expenses, categories, onDelete, onEdit }: LedgerPageProps) {
  const [query, setQuery] = useState('')
  const [parentCategoryId, setParentCategoryId] = useState<string | undefined>()
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | undefined>()
  const visibleExpenses = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return expenses.filter((expense) => {
      const matchesCategory = !parentCategoryId || expense.parentCategoryId === parentCategoryId
      const matchesQuery = !normalized || `${expense.note} ${expense.parentCategoryName} ${expense.categoryName}`.toLowerCase().includes(normalized)
      const occurredDate = expense.occurredAt.slice(0, 10)
      const matchesFrom = !fromDate || occurredDate >= fromDate
      const matchesTo = !toDate || occurredDate <= toDate
      const matchesPayment = !paymentMethod || expense.paymentMethod === paymentMethod
      return matchesCategory && matchesQuery && matchesFrom && matchesTo && matchesPayment
    })
  }, [expenses, fromDate, parentCategoryId, paymentMethod, query, toDate])
  const totalCents = visibleExpenses.reduce((sum, expense) => sum + expense.amountCents, 0)

  return (
    <div className="page-stack ledger-page">
      <div className="page-heading ledger-heading">
        <div>
          <Typography.Title level={2}>账目</Typography.Title>
          <Typography.Text type="secondary">查看、筛选和管理所有花销记录。</Typography.Text>
        </div>
        <Statistic title="筛选结果总额" value={totalCents / 100} precision={2} prefix="¥" />
      </div>
      <Card variant="borderless" className="table-card">
        <Space wrap size={12} className="ledger-filters">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索备注或分类"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Input aria-label="开始日期" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          <Input aria-label="结束日期" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          <Select
            allowClear
            aria-label="支付方式"
            placeholder="支付方式"
            value={paymentMethod}
            onChange={setPaymentMethod}
            options={[
              { value: 'cash', label: '现金' },
              { value: 'bank', label: '银行卡' },
              { value: 'wechat', label: '微信' },
              { value: 'alipay', label: '支付宝' },
              { value: 'other', label: '其他' }
            ]}
          />
          <div className="category-filter" role="group" aria-label="一级分类筛选">
            <button type="button" className={!parentCategoryId ? 'filter-chip active' : 'filter-chip'} onClick={() => setParentCategoryId(undefined)}>全部分类</button>
            {categories.filter((category) => category.parentId === null).map((category) => (
              <button
                type="button"
                className={parentCategoryId === category.id ? 'filter-chip active' : 'filter-chip'}
                key={category.id}
                onClick={() => setParentCategoryId(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </Space>
        <div className="ledger-meta">共 {visibleExpenses.length} 笔</div>
        {visibleExpenses.length ? (
          <ExpenseTable expenses={visibleExpenses} onDelete={onDelete} onEdit={onEdit} />
        ) : (
          <Empty description="没有找到符合条件的账目" />
        )}
      </Card>
    </div>
  )
}
