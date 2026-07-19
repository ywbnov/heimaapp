import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoriesPage } from '../../src/renderer/pages/CategoriesPage'
import type { Category, CategoryBatchInput } from '../../src/shared/types'

const categories: Category[] = [
  { id: 'food', parentId: null, name: '餐饮', enabled: true, sortOrder: 10, isBuiltin: true, isDeleted: false },
  { id: 'food-lunch', parentId: 'food', name: '午餐', enabled: true, sortOrder: 11, isBuiltin: true, isDeleted: false },
  { id: 'car', parentId: null, name: '汽车', enabled: true, sortOrder: 103, isBuiltin: false, isDeleted: false },
  { id: 'car-fuel', parentId: 'car', name: '加油', enabled: true, sortOrder: 104, isBuiltin: false, isDeleted: false }
]

describe('独立分类页', () => {
  function renderPage() {
    const onCreateCategoryBatch = vi.fn<(input: CategoryBatchInput) => Promise<Category[]>>().mockResolvedValue([])
    render(
      <CategoriesPage
        categories={categories}
        onSetCategoryEnabled={vi.fn().mockResolvedValue(undefined)}
        onCreateCategoryBatch={onCreateCategoryBatch}
        onRenameCategory={vi.fn().mockResolvedValue(undefined)}
        onDeleteCategory={vi.fn().mockResolvedValue(undefined)}
      />
    )
    return { onCreateCategoryBatch }
  }

  it('固定显示新增入口并按一级分类分组', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByRole('region', { name: '分类操作' })).toHaveClass('category-toolbar')
    expect(screen.getByRole('button', { name: '新增分类' })).toBeInTheDocument()
    expect(screen.getByText('餐饮')).toBeInTheDocument()
    expect(screen.getByText('汽车')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '编辑餐饮' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '编辑汽车' })).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('搜索分类'), '汽车')
    expect(screen.queryByText('餐饮')).not.toBeInTheDocument()
    expect(screen.getByText('汽车')).toBeInTheDocument()
  })

  it('一次提交一级分类和多个二级分类', async () => {
    const user = userEvent.setup()
    const { onCreateCategoryBatch } = renderPage()
    await user.click(screen.getByRole('button', { name: '新增分类' }))
    await user.type(screen.getByLabelText('一级分类名称'), '出行')
    await user.type(screen.getAllByPlaceholderText('二级分类名称')[0], '火车')
    await user.click(screen.getByRole('button', { name: '添加二级分类' }))
    await user.type(screen.getAllByPlaceholderText('二级分类名称')[1], '飞机')
    await user.click(screen.getByRole('button', { name: /创\s*建\s*分\s*类/ }))

    expect(onCreateCategoryBatch).toHaveBeenCalledWith({
      mode: 'new-parent',
      parentName: '出行',
      childNames: ['火车', '飞机']
    })
  })

  it('可以向已有一级分类一次添加多个二级分类', async () => {
    const user = userEvent.setup()
    const { onCreateCategoryBatch } = renderPage()
    await user.click(screen.getByRole('button', { name: '新增分类' }))
    await user.click(screen.getByLabelText('添加到已有一级分类'))
    fireEvent.mouseDown(screen.getByLabelText('选择一级分类'))
    await user.click(screen.getByText('餐饮', { selector: '.ant-select-item-option-content' }))
    await user.type(screen.getAllByPlaceholderText('二级分类名称')[0], '夜宵')
    await user.click(screen.getByRole('button', { name: /创\s*建\s*分\s*类/ }))

    expect(onCreateCategoryBatch).toHaveBeenCalledWith({
      mode: 'existing-parent',
      parentId: 'food',
      childNames: ['夜宵']
    })
  })
})
