import { calculateCategoryPercentages, groupExpensesByMonth } from '../../src/shared/expenseRules'

describe('统计规则', () => {
  it('计算一级分类金额占比并保留一位小数', () => {
    expect(calculateCategoryPercentages([
      { categoryId: 'food', categoryName: '餐饮', amountCents: 9700, count: 3 },
      { categoryId: 'transport', categoryName: '交通', amountCents: 300, count: 1 }
    ])).toEqual([
      { categoryId: 'food', categoryName: '餐饮', amountCents: 9700, count: 3, percentage: 97 },
      { categoryId: 'transport', categoryName: '交通', amountCents: 300, count: 1, percentage: 3 }
    ])
  })

  it('生成包含空月份的最近六个月趋势', () => {
    expect(groupExpensesByMonth([
      { occurredAt: '2026-06-10T12:00:00.000Z', amountCents: 5000 },
      { occurredAt: '2026-07-01T12:00:00.000Z', amountCents: 2000 }
    ], '2026-07')).toEqual([
      { month: '2026-02', amountCents: 0 },
      { month: '2026-03', amountCents: 0 },
      { month: '2026-04', amountCents: 0 },
      { month: '2026-05', amountCents: 0 },
      { month: '2026-06', amountCents: 5000 },
      { month: '2026-07', amountCents: 2000 }
    ])
  })
})
