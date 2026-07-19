import { defaultCategories } from '../../src/shared/categories'
import {
  groupExpensesByCategory,
  parseAmountToCents,
  validateExpenseInput
} from '../../src/shared/expenseRules'
import type { ExpenseInput } from '../../src/shared/types'

describe('花销业务规则', () => {
  it('把两位小数的人民币金额转换为整数分', () => {
    expect(parseAmountToCents('12.30')).toBe(1230)
    expect(parseAmountToCents('0.01')).toBe(1)
  })

  it('拒绝零、负数、超过两位小数和非数字金额', () => {
    expect(() => parseAmountToCents('0')).toThrow()
    expect(() => parseAmountToCents('-1')).toThrow()
    expect(() => parseAmountToCents('1.234')).toThrow()
    expect(() => parseAmountToCents('abc')).toThrow()
  })

  it('校验花销输入必须包含有效的分类和发生时间', () => {
    const valid: ExpenseInput = {
      amountText: '18.50',
      occurredAt: '2026-07-18T12:00:00.000Z',
      parentCategoryId: 'food',
      categoryId: 'food-lunch',
      note: '',
      paymentMethod: 'wechat'
    }

    expect(validateExpenseInput(valid, defaultCategories)).toEqual({ valid: true, errors: [] })
    expect(
      validateExpenseInput({ ...valid, categoryId: 'disabled-category' }, defaultCategories).valid
    ).toBe(false)
    expect(validateExpenseInput({ ...valid, occurredAt: '' }, defaultCategories).valid).toBe(false)
  })

  it('按一级分类汇总花销金额', () => {
    const expenses = [
      { categoryId: 'food-lunch', amountCents: 1200 },
      { categoryId: 'food-dinner', amountCents: 8800 },
      { categoryId: 'transport-public', amountCents: 300 }
    ]

    expect(groupExpensesByCategory(expenses, defaultCategories)).toEqual([
      { categoryId: 'food', categoryName: '餐饮', amountCents: 10000, count: 2 },
      { categoryId: 'transport', categoryName: '交通', amountCents: 300, count: 1 }
    ])
  })
})
