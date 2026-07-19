import { Button, Card, Divider, List, Space, Switch, Typography } from 'antd'
import { DownloadOutlined, ImportOutlined, SaveOutlined } from '@ant-design/icons'
import type { Category } from '../../shared/types'

interface SettingsPageProps {
  categories: Category[]
  onSetCategoryEnabled: (id: string, enabled: boolean) => Promise<void>
  onExportCsv: () => Promise<void | undefined>
  onBackupJson: () => Promise<void | undefined>
  onRestoreJson: () => Promise<number>
}

export function SettingsPage({ categories, onSetCategoryEnabled, onExportCsv, onBackupJson, onRestoreJson }: SettingsPageProps) {
  return (
    <div className="page-stack settings-page">
      <div className="page-heading">
        <Typography.Title level={2}>设置</Typography.Title>
        <Typography.Text type="secondary">管理分类和自己的数据文件。</Typography.Text>
      </div>
      <Card title="数据管理" variant="borderless" className="settings-card">
        <Space wrap>
          <Button icon={<DownloadOutlined />} onClick={onExportCsv}>导出 CSV</Button>
          <Button icon={<SaveOutlined />} onClick={onBackupJson}>备份 JSON</Button>
          <Button icon={<ImportOutlined />} onClick={() => void onRestoreJson()}>恢复 JSON</Button>
        </Space>
        <Typography.Paragraph type="secondary" className="settings-hint">
          数据默认保存在本机。恢复备份会替换当前账目，请先确认已经选中了正确的文件。
        </Typography.Paragraph>
      </Card>
      <Card title="分类管理" variant="borderless" className="settings-card">
        <List
          dataSource={categories}
          renderItem={(category) => (
            <List.Item
              actions={[<Switch key="enabled" checked={category.enabled} onChange={(enabled) => void onSetCategoryEnabled(category.id, enabled)} />]}
            >
              <List.Item.Meta
                title={category.parentId ? `${categories.find((parent) => parent.id === category.parentId)?.name} / ${category.name}` : category.name}
                description={category.parentId ? '二级分类' : '一级分类'}
              />
            </List.Item>
          )}
        />
      </Card>
      <Divider />
      <Typography.Text type="secondary">停用分类不会影响已经记录的历史账目。</Typography.Text>
    </div>
  )
}
