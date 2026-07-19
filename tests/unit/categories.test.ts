import { defaultCategories } from '../../src/shared/categories'

describe('默认分类目录', () => {
  it('包含一级分类和对应的二级分类，且编号不重复', () => {
    const ids = defaultCategories.map((category) => category.id)
    const parents = defaultCategories.filter((category) => category.parentId === null)
    const children = defaultCategories.filter((category) => category.parentId !== null)

    expect(new Set(ids).size).toBe(ids.length)
    expect(parents.some((category) => category.id === 'food' && category.name === '餐饮')).toBe(true)
    expect(children.some((category) => category.id === 'food-dinner' && category.parentId === 'food')).toBe(true)
    expect(children.every((category) => defaultCategories.some((parent) => parent.id === category.parentId))).toBe(true)
  })
})
