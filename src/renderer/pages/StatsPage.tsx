import { useMemo } from 'react'
import { Card, Col, Empty, Row, Table, Typography } from 'antd'
import { Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { calculateCategoryPercentages, groupExpensesByCategory, groupExpensesByMonth } from '../../shared/expenseRules'
import type { Category, Expense } from '../../shared/types'
import { formatCents } from '../components/ExpenseTable'

const chartColors = ['#1f7a65', '#4c9d83', '#76b99e', '#9cd1ba', '#c0e3d2', '#e2f2e9']

export function StatsPage({ expenses, categories }: { expenses: Expense[]; categories: Category[] }) {
  const summaries = useMemo(() => calculateCategoryPercentages(groupExpensesByCategory(expenses, categories)), [expenses, categories])
  const endMonth = new Date().toISOString().slice(0, 7)
  const monthly = useMemo(() => groupExpensesByMonth(expenses, endMonth), [expenses, endMonth])

  return (
    <div className="page-stack stats-page">
      <div className="page-heading">
        <Typography.Title level={2}>统计</Typography.Title>
        <Typography.Text type="secondary">按分类和月份看看支出流向。</Typography.Text>
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card title="分类占比" variant="borderless" className="chart-card">
            {summaries.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={summaries} dataKey="amountCents" nameKey="categoryName" innerRadius={70} outerRadius={108} paddingAngle={2}>
                    {summaries.map((summary, index) => <Cell key={summary.categoryId} fill={chartColors[index % chartColors.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatCents(Number(value ?? 0))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <Empty description="还没有足够的账目数据" />}
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card title="最近六个月趋势" variant="borderless" className="chart-card">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthly} margin={{ top: 10, right: 20, bottom: 4, left: 0 }}>
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `¥${value / 100}`} />
                <Tooltip formatter={(value) => formatCents(Number(value ?? 0))} />
                <Line type="monotone" dataKey="amountCents" name="支出" stroke="#1f7a65" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
      <Card title="分类明细" variant="borderless" className="chart-card">
        <Table
          rowKey="categoryId"
          pagination={false}
          dataSource={summaries}
          columns={[
            { title: '一级分类', dataIndex: 'categoryName' },
            { title: '金额', dataIndex: 'amountCents', render: (value: number) => formatCents(value) },
            { title: '笔数', dataIndex: 'count' },
            { title: '占比', dataIndex: 'percentage', render: (value: number) => `${value.toFixed(1)}%` }
          ]}
        />
      </Card>
    </div>
  )
}
