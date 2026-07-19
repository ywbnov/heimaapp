import { Button, Card, Space, Typography } from 'antd'
import { DownloadOutlined, ImportOutlined, SaveOutlined } from '@ant-design/icons'

interface SettingsPageProps {
  onExportCsv: () => Promise<void | undefined>
  onBackupJson: () => Promise<void | undefined>
  onRestoreJson: () => Promise<number>
}

export function SettingsPage({ onExportCsv, onBackupJson, onRestoreJson }: SettingsPageProps) {
  return (
    <div className="page-stack settings-page">
      <div className="page-heading">
        <Typography.Title level={2}>设置</Typography.Title>
        <Typography.Text type="secondary">管理自己的数据文件。</Typography.Text>
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
    </div>
  )
}
