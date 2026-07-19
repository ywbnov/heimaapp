import { Button, Popconfirm, Table, Tag } from 'antd'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Expense } from '../../shared/types'

export function formatCents(amountCents: number): string {
  return `¥${(amountCents / 100).toFixed(2)}`
}

interface ExpenseTableProps {
  expenses: Expense[]
  onDelete: (id: string) => Promise<void> | void
  onEdit?: (expense: Expense) => void
}

export function ExpenseTable({ expenses, onDelete, onEdit }: ExpenseTableProps) {
  const columns: ColumnsType<Expense> = [
    {
      title: '发生时间',
      dataIndex: 'occurredAt',
      width: 180,
      render: (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false })
    },
    {
      title: '分类',
      key: 'category',
      render: (_, record) => <Tag color="green">{record.parentCategoryName} / {record.categoryName}</Tag>
    },
    { title: '备注', dataIndex: 'note', render: (value: string) => value || '未填写' },
    {
      title: '支付方式',
      dataIndex: 'paymentMethod',
      render: (value: Expense['paymentMethod']) => ({ cash: '现金', bank: '银行卡', wechat: '微信', alipay: '支付宝', other: '其他' }[value])
    },
    {
      title: '金额',
      dataIndex: 'amountCents',
      align: 'right',
      width: 130,
      render: (value: number) => <strong className="expense-amount">{formatCents(value)}</strong>
    },
    {
      title: '操作',
      key: 'actions',
      align: 'right',
      width: 110,
      render: (_, record) => (
        <div className="table-actions">
          {onEdit && <Button type="text" icon={<EditOutlined />} aria-label={`编辑${record.categoryName}`} onClick={() => onEdit(record)} />}
          <Popconfirm
            title="确定删除这笔账目吗？"
            okText="确定"
            cancelText="取消"
            onConfirm={() => onDelete(record.id)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} aria-label={`删除${record.categoryName}`} />
          </Popconfirm>
        </div>
      )
    }
  ]

  return <Table<Expense> rowKey="id" columns={columns} dataSource={expenses} pagination={{ pageSize: 10 }} />
}
