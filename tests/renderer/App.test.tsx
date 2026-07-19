import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../src/renderer/App'

describe('应用外壳', () => {
  it('显示产品名称和主要导航', () => {
    render(<App />)

    expect(screen.getByText('黑马记账')).toBeInTheDocument()
    expect(screen.getByText('概览', { selector: '.ant-menu-title-content' })).toBeInTheDocument()
    expect(screen.getByText('记一笔', { selector: '.ant-menu-title-content' })).toBeInTheDocument()
    expect(screen.getByText('账目', { selector: '.ant-menu-title-content' })).toBeInTheDocument()
    expect(screen.getByText('分类', { selector: '.ant-menu-title-content' })).toBeInTheDocument()
    expect(screen.getByText('统计', { selector: '.ant-menu-title-content' })).toBeInTheDocument()
    expect(screen.getByText('设置', { selector: '.ant-menu-title-content' })).toBeInTheDocument()
  })

  it('可以从主导航进入独立分类页', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByText('分类', { selector: '.ant-menu-title-content' }))
    expect(screen.getByRole('heading', { name: '分类', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新增分类' })).toBeInTheDocument()
  })
})
