import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpenseForm } from '../../src/renderer/components/ExpenseForm'
import type { ExpenseInput } from '../../src/shared/types'

const categories = [
  { id: 'food', parentId: null, name: '餐饮', enabled: true, sortOrder: 10 },
  { id: 'food-lunch', parentId: 'food', name: '午餐', enabled: true, sortOrder: 11 },
  { id: 'food-dinner', parentId: 'food', name: '晚餐', enabled: true, sortOrder: 12 }
]

describe('记一笔表单', () => {
  it('填写金额和两级分类后提交完整数据', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn<(input: ExpenseInput) => Promise<void>>().mockResolvedValue(undefined)
    render(<ExpenseForm categories={categories} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('金额'), '12.30')
    fireEvent.mouseDown(screen.getByText('请选择一级分类'))
    await user.click(await screen.findByText('餐饮', { selector: '.ant-select-item-option-content' }))
    fireEvent.mouseDown(screen.getByText('请选择二级分类'))
    await user.click(await screen.findByText('午餐', { selector: '.ant-select-item-option-content' }))
    await user.click(screen.getByRole('button', { name: /保\s*存/ }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      amountText: '12.30',
      parentCategoryId: 'food',
      categoryId: 'food-lunch'
    }))
  })

  it('金额为空时不提交并显示校验提示', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn<(input: ExpenseInput) => Promise<void>>().mockResolvedValue(undefined)
    render(<ExpenseForm categories={categories} onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: /保\s*存/ }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(await screen.findByText('请输入金额')).toBeInTheDocument()
  })
})
