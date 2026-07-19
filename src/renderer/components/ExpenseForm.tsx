import { useMemo } from 'react'
import { Button, Form, Input, Select, Space } from 'antd'
import type { Category, ExpenseInput, PaymentMethod } from '../../shared/types'

interface ExpenseFormProps {
  categories: Category[]
  onSubmit: (input: ExpenseInput) => Promise<void> | void
  submitting?: boolean
}

const paymentOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'cash', label: '现金' },
  { value: 'bank', label: '银行卡' },
  { value: 'wechat', label: '微信' },
  { value: 'alipay', label: '支付宝' },
  { value: 'other', label: '其他' }
]

function currentDateTime() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 16)
}

export function ExpenseForm({ categories, onSubmit, submitting = false }: ExpenseFormProps) {
  const [form] = Form.useForm<ExpenseInput>()
  const parents = useMemo(
    () => categories.filter((category) => category.parentId === null && category.enabled),
    [categories]
  )
  const selectedParent = Form.useWatch('parentCategoryId', form)
  const children = useMemo(
    () => categories.filter((category) => category.parentId === selectedParent && category.enabled),
    [categories, selectedParent]
  )

  async function handleFinish(values: ExpenseInput) {
    await onSubmit(values)
    form.resetFields()
    form.setFieldValue('occurredAt', currentDateTime())
    form.setFieldValue('paymentMethod', 'other')
  }

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{ occurredAt: currentDateTime(), paymentMethod: 'other', note: '' }}
      onFinish={handleFinish}
      requiredMark="optional"
    >
      <Form.Item
        label="金额"
        name="amountText"
        rules={[
          { required: true, message: '请输入金额' },
          { pattern: /^\d+(?:\.\d{1,2})?$/, message: '请输入正确的金额，最多两位小数' },
          { validator: (_, value: string) => Number(value) > 0 ? Promise.resolve() : Promise.reject(new Error('金额必须大于 0')) }
        ]}
      >
        <Input prefix="¥" placeholder="0.00" inputMode="decimal" />
      </Form.Item>

      <Space size={16} align="start" className="form-row">
        <Form.Item
          label="一级分类"
          name="parentCategoryId"
          rules={[{ required: true, message: '请选择一级分类' }]}
        >
          <Select
            className="form-select"
            placeholder="请选择一级分类"
            options={parents.map((category) => ({ value: category.id, label: category.name }))}
            onChange={() => form.setFieldValue('categoryId', undefined)}
          />
        </Form.Item>
        <Form.Item
          label="二级分类"
          name="categoryId"
          rules={[{ required: true, message: '请选择二级分类' }]}
        >
          <Select
            className="form-select"
            placeholder="请选择二级分类"
            disabled={!selectedParent}
            options={children.map((category) => ({ value: category.id, label: category.name }))}
          />
        </Form.Item>
      </Space>

      <Form.Item
        label="发生时间"
        name="occurredAt"
        rules={[{ required: true, message: '请选择发生时间' }]}
      >
        <Input type="datetime-local" />
      </Form.Item>

      <Form.Item label="支付方式" name="paymentMethod">
        <Select options={paymentOptions} />
      </Form.Item>

      <Form.Item label="备注" name="note">
        <Input.TextArea rows={3} maxLength={120} placeholder="可以补充这笔花销的用途" />
      </Form.Item>

      <Button type="primary" htmlType="submit" loading={submitting}>
        保存
      </Button>
    </Form>
  )
}
