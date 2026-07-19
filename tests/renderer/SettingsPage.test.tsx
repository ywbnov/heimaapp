import { render, screen } from '@testing-library/react'
import { SettingsPage } from '../../src/renderer/pages/SettingsPage'

describe('设置页', () => {
  it('只保留数据管理，不再显示分类管理', () => {
    render(
      <SettingsPage
        onExportCsv={vi.fn().mockResolvedValue(undefined)}
        onBackupJson={vi.fn().mockResolvedValue(undefined)}
        onRestoreJson={vi.fn().mockResolvedValue(0)}
      />
    )

    expect(screen.getByText('数据管理')).toBeInTheDocument()
    expect(screen.queryByText('分类管理')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '新增分类' })).not.toBeInTheDocument()
  })
})
