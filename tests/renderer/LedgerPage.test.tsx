import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LedgerPage } from '../../src/renderer/pages/LedgerPage'
import type { Category, Expense } from '../../src/shared/types'

const categories: Category[] = [
  { id: 'food', parentId: null, name: '餐饮', enabled: true, sortOrder: 10 },
  { id: 'food-lunch', parentId: 'food', name: '午餐', enabled: true, sortOrder: 11 },
  { id: 'food-dinner', parentId: 'food', name: '晚餐', enabled: true, sortOrder: 12 }
]

const expenses: Expense[] = [
  {
    id: '1', amountCents: 12000, occurredAt: '2026-07-18T18:00:00.000Z', parentCategoryId: 'food',
    categoryId: 'food-dinner', parentCategoryName: '餐饮', categoryName: '晚餐', note: '朋友聚餐',
    paymentMethod: 'wechat', createdAt: '2026-07-18T18:01:00.000Z', updatedAt: '2026-07-18T18:01:00.000Z', isDeleted: false
  },
  {
    id: '2', amountCents: 8000, occurredAt: '2026-07-18T12:00:00.000Z', parentCategoryId: 'food',
    categoryId: 'food-lunch', parentCategoryName: '餐饮', categoryName: '午餐', note: '工作日午餐',
    paymentMethod: 'alipay', createdAt: '2026-07-18T12:01:00.000Z', updatedAt: '2026-07-18T12:01:00.000Z', isDeleted: false
  }
]

describe('账目页面', () => {
  it('显示账目总额、按关键词筛选并确认删除', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined)
    render(<LedgerPage expenses={expenses} categories={categories} onDelete={onDelete} />)

    expect(screen.getByText('筛选结果总额').parentElement).toHaveTextContent('¥200.00')
    expect(screen.getByText('朋友聚餐')).toBeInTheDocument()
    expect(screen.getByText('工作日午餐')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('搜索备注或分类'), '晚餐')
    expect(screen.getByText('朋友聚餐')).toBeInTheDocument()
    expect(screen.queryByText('工作日午餐')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '删除晚餐' }))
    await user.click(screen.getByRole('button', { name: /确\s*定/ }))
    expect(onDelete).toHaveBeenCalledWith('1')
  })
})
