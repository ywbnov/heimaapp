import { render, screen } from '@testing-library/react'
import App from '../../src/renderer/App'

describe('应用外壳', () => {
  it('显示产品名称和主要导航', () => {
    render(<App />)

    expect(screen.getByText('黑马记账')).toBeInTheDocument()
    expect(screen.getByText('概览', { selector: '.ant-menu-title-content' })).toBeInTheDocument()
    expect(screen.getByText('记一笔', { selector: '.ant-menu-title-content' })).toBeInTheDocument()
    expect(screen.getByText('账目', { selector: '.ant-menu-title-content' })).toBeInTheDocument()
    expect(screen.getByText('统计', { selector: '.ant-menu-title-content' })).toBeInTheDocument()
    expect(screen.getByText('设置', { selector: '.ant-menu-title-content' })).toBeInTheDocument()
  })
})
