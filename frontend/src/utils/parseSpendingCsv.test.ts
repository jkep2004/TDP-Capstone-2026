import { describe, expect, it } from 'vitest'

import { parseSpendingCsv } from './parseSpendingCsv'

describe('parseSpendingCsv', () => {
  // Valid CSV text should become typed rows with numeric values.
  it('converts valid CSV records into typed spending rows', () => {
    const csv =
      'customer_id,week,travel,food,utilities\n' +
      '1,1,12.50,30,40\n' +
      '1,2,0,20.25,15'

    expect(parseSpendingCsv(csv)).toEqual([
      { customer_id: 1, week: 1, travel: 12.5, food: 30, utilities: 40 },
      { customer_id: 1, week: 2, travel: 0, food: 20.25, utilities: 15 },
    ])
  })

  // Reject files that do not provide the complete expected schema.
  it('rejects CSV files with incorrect headers', () => {
    const csv = 'customer_id,week,travel,food\n1,1,12,30'

    expect(() => parseSpendingCsv(csv)).toThrow('Use these columns:')
  })

  // One customer cannot have two records for the same week.
  it('rejects duplicate weeks for the same customer', () => {
    const csv =
      'customer_id,week,travel,food,utilities\n' +
      '1,1,12,30,40\n' +
      '1,1,8,20,10'

    expect(() => parseSpendingCsv(csv)).toThrow('duplicate week')
  })

  // Currency values with more than two decimal places are invalid.
  it('rejects amounts with more than two decimal places', () => {
    const csv =
      'customer_id,week,travel,food,utilities\n' +
      '1,1,12.345,30,40'

    expect(() => parseSpendingCsv(csv)).toThrow('travel must be a non-negative amount')
  })
})
