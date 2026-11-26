import { describe, expect, it } from 'vitest'

import { parseSpendingCsv } from './parseSpendingCsv'

describe('parseSpendingCsv', () => {
  const header = 'customer_id,week,travel,food,utilities'

  it('rejects a header-only file with blank lines', () => {
    expect(() => parseSpendingCsv(`${header}\n\n`)).toThrow('The file contains no spending records.')
  })

  it('rejects a row with missing fields', () => {
    expect(() => parseSpendingCsv(`${header}\n1,1,10,20`)).toThrow('The CSV could not be parsed.')
  })

  it.each([
    ['0,1,10,20,30', 'customer_id must be a positive whole number'],
    ['1,1.5,10,20,30', 'week must be a positive whole number'],
    ['1,1,-10,20,30', 'travel must be a non-negative amount'],
    ['1,1,10,,30', 'food must be a non-negative amount'],
    ['1,1,10,20,90071992547409.92', 'utilities must be a non-negative amount'],
  ])('rejects invalid record %s', (row, message) => {
    expect(() => parseSpendingCsv(`${header}\n${row}`)).toThrow(`Record 1: ${message}`)
  })

  it('allows different customers to use the same week', () => {
    expect(parseSpendingCsv(`${header}\n1,1,0,0,0\n2,1,0,0,0`)).toEqual([
      { customer_id: 1, week: 1, travel: 0, food: 0, utilities: 0 },
      { customer_id: 2, week: 1, travel: 0, food: 0, utilities: 0 },
    ])
  })

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
