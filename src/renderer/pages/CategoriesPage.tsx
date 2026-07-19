import { useMemo, useState } from 'react'
import {
  Button,
  Collapse,
  Empty,
  FloatButton,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Switch,
  Tag,
  Typography
} from 'antd'
import { DeleteOutlined, EditOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import type { Category, CategoryBatchInput } from '../../shared/types'

interface CategoriesPageProps {
  categories: Category[]
  onSetCategoryEnabled: (id: string, enabled: boolean) => Promise<void>
  onCreateCategoryBatch: (input: CategoryBatchInput) => Promise<Category[]>
  onRenameCategory: (id: string, name: string) => Promise<void>
  onDeleteCategory: (id: string) => Promise<void>
}

type StatusFilter = 'all' | 'enabled' | 'disabled' | 'deleted'
type CreateFormValues = {
  mode: CategoryBatchInput['mode']
  parentName?: string
  parentId?: string
  childNames: string[]
}

function matchesStatus(category: Category, status: StatusFilter) {
  if (status === 'enabled') return category.enabled && !category.isDeleted
  if (status === 'disabled') return !category.enabled && !category.isDeleted
  if (status === 'deleted') return category.isDeleted
  return true
}

export function CategoriesPage({
  categories,
  onSetCategoryEnabled,
  onCreateCategoryBatch,
  onRenameCategory,
  onDeleteCategory
}: CategoriesPageProps) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [createForm] = Form.useForm<CreateFormValues>()
  const [renameForm] = Form.useForm<{ name: string }>()
  const mode = Form.useWatch('mode', createForm) ?? 'new-parent'

  const parents = useMemo(
    () => categories.filter((category) => category.parentId === null),
    [categories]
  )
  const selectableParents = parents.filter((category) => category.enabled && !category.isDeleted)
  const groups = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return parents.flatMap((parent) => {
      const children = categories.filter((category) => category.parentId === parent.id)
      const parentMatchesQuery = !normalized || parent.name.toLowerCase().includes(normalized)
      const visibleChildren = children.filter((child) =>
        (parentMatchesQuery || child.name.toLowerCase().includes(normalized)) && matchesStatus(child, status)
      )
      const parentVisible = parentMatchesQuery && matchesStatus(parent, status)
      if (!parentVisible && visibleChildren.length === 0) return []
      return [{ parent, children: parentVisible && !normalized ? children.filter((child) => matchesStatus(child, status)) : visibleChildren }]
    })
  }, [categories, parents, query, status])

  function openCreate() {
    createForm.setFieldsValue({ mode: 'new-parent', parentName: '', parentId: undefined, childNames: [''] })
    setCreateOpen(true)
  }

  async function submitCreate(values: CreateFormValues) {
    const childNames = (values.childNames ?? []).map((name) => name?.trim()).filter(Boolean)
    if (new Set(childNames).size !== childNames.length) {
      createForm.setFields([{ name: 'childNames', errors: ['二级分类名称不能重复'] }])
      return
    }
    const input: CategoryBatchInput = values.mode === 'new-parent'
      ? { mode: 'new-parent', parentName: values.parentName ?? '', childNames }
      : { mode: 'existing-parent', parentId: values.parentId ?? '', childNames }
    try {
      await onCreateCategoryBatch(input)
      setCreateOpen(false)
      createForm.resetFields()
    } catch (cause) {
      createForm.setFields([{ name: values.mode === 'new-parent' ? 'parentName' : 'parentId', errors: [cause instanceof Error ? cause.message : '分类创建失败'] }])
    }
  }

  function openRename(category: Category) {
    setEditing(category)
    renameForm.setFieldsValue({ name: category.name })
  }

  async function submitRename(values: { name: string }) {
    if (!editing) return
    try {
      await onRenameCategory(editing.id, values.name)
      setEditing(null)
    } catch (cause) {
      renameForm.setFields([{ name: 'name', errors: [cause instanceof Error ? cause.message : '分类修改失败'] }])
    }
  }

  function categoryActions(category: Category) {
    if (category.isBuiltin) return [<Tag key="builtin">预置，只读</Tag>]
    if (category.isDeleted) return [<Tag key="deleted">已删除</Tag>]
    return [
      <Switch key="enabled" checked={category.enabled} aria-label={`启用${category.name}`} onChange={(enabled) => void onSetCategoryEnabled(category.id, enabled)} />,
      <Button key="edit" type="text" icon={<EditOutlined />} aria-label={`编辑${category.name}`} onClick={(event) => { event.stopPropagation(); openRename(category) }} />,
      <Popconfirm key="delete" title="确定删除这个自定义分类吗？" description="历史账单会保留，但新账单不能再选择它。" okText="删除" cancelText="取消" onConfirm={() => void onDeleteCategory(category.id)}>
        <Button type="text" danger icon={<DeleteOutlined />} aria-label={`删除${category.name}`} onClick={(event) => event.stopPropagation()} />
      </Popconfirm>
    ]
  }

  return (
    <div className="page-stack categories-page">
      <div className="page-heading">
        <Typography.Title level={2}>分类</Typography.Title>
        <Typography.Text type="secondary">集中管理一级和二级消费分类。</Typography.Text>
      </div>

      <section className="category-toolbar" aria-label="分类操作">
        <Space wrap>
          <Input.Search allowClear placeholder="搜索分类" value={query} onChange={(event) => setQuery(event.target.value)} className="category-search" />
          <Select<StatusFilter>
            aria-label="分类状态"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: '全部状态' },
              { value: 'enabled', label: '已启用' },
              { value: 'disabled', label: '已停用' },
              { value: 'deleted', label: '已删除' }
            ]}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} aria-label="新增分类" onClick={openCreate}>新增分类</Button>
      </section>

      {groups.length === 0 ? <Empty description="没有匹配的分类" /> : (
        <Collapse
          defaultActiveKey={groups.map(({ parent }) => parent.id)}
          items={groups.map(({ parent, children }) => ({
            key: parent.id,
            label: (
              <div className="category-group-title">
                <Space>
                  <span>{parent.name}</span>
                  <Tag color={parent.isBuiltin ? 'default' : 'blue'}>{parent.isBuiltin ? '预置' : '自定义'}</Tag>
                  <Typography.Text type="secondary">{children.length} 个二级分类</Typography.Text>
                </Space>
                <Space onClick={(event) => event.stopPropagation()}>{categoryActions(parent)}</Space>
              </div>
            ),
            children: children.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无二级分类" /> : (
              <List
                dataSource={children}
                renderItem={(child) => (
                  <List.Item actions={categoryActions(child)}>
                    <List.Item.Meta title={child.name} description={child.isDeleted ? '已逻辑删除' : child.enabled ? '已启用' : '已停用'} />
                  </List.Item>
                )}
              />
            )
          }))}
        />
      )}

      <FloatButton.BackTop visibilityHeight={240} />

      <Modal open={createOpen} title="新增分类" okText="创建分类" cancelText="取消" onCancel={() => setCreateOpen(false)} onOk={() => void createForm.submit()} destroyOnHidden>
        <Form form={createForm} layout="vertical" initialValues={{ mode: 'new-parent', childNames: [''] }} onFinish={(values) => void submitCreate(values)}>
          <Form.Item label="创建方式" name="mode">
            <Radio.Group>
              <Radio value="new-parent">新建一级分类</Radio>
              <Radio value="existing-parent">添加到已有一级分类</Radio>
            </Radio.Group>
          </Form.Item>
          {mode === 'new-parent' ? (
            <Form.Item label="一级分类名称" name="parentName" rules={[{ required: true, whitespace: true, message: '请输入一级分类名称' }]}>
              <Input maxLength={30} />
            </Form.Item>
          ) : (
            <Form.Item label="选择一级分类" name="parentId" rules={[{ required: true, message: '请选择一级分类' }]}>
              <Select options={selectableParents.map((parent) => ({ value: parent.id, label: parent.name }))} />
            </Form.Item>
          )}
          <Form.Item label="二级分类（可添加多个）" required={mode === 'existing-parent'}>
            <Form.List name="childNames">
              {(fields, { add, remove }, { errors }) => (
                <Space direction="vertical" className="category-children-editor">
                  {fields.map(({ key, ...field }, index) => (
                    <Space key={key} align="baseline">
                      <Form.Item {...field} rules={mode === 'existing-parent' && index === 0 ? [{ required: true, whitespace: true, message: '请填写二级分类名称' }] : []}>
                        <Input placeholder="二级分类名称" maxLength={30} />
                      </Form.Item>
                      {fields.length > 1 && <Button type="text" danger icon={<MinusCircleOutlined />} aria-label={`移除第${index + 1}个二级分类`} onClick={() => remove(field.name)} />}
                    </Space>
                  ))}
                  <Button type="dashed" icon={<PlusOutlined />} aria-label="添加二级分类" onClick={() => add('')}>添加二级分类</Button>
                  <Form.ErrorList errors={errors} />
                </Space>
              )}
            </Form.List>
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={Boolean(editing)} title="修改自定义分类" okText="保存" cancelText="取消" onCancel={() => setEditing(null)} onOk={() => void renameForm.submit()} destroyOnHidden>
        <Form form={renameForm} layout="vertical" onFinish={(values) => void submitRename(values)}>
          <Form.Item label="分类名称" name="name" rules={[{ required: true, whitespace: true, message: '请输入分类名称' }]}>
            <Input maxLength={30} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
