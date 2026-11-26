import Papa from 'papaparse'
import { CustomerError } from '../../utils/customerError'
import { MAX_SPENDING_AMOUNT_GBP } from './spendingAmount'

export type SpendingRow = {
  customer_id: number
  week: number
  travel: number
  food: number
  utilities: number
}

const requiredColumns = ['week', 'travel', 'food', 'utilities']

export function parseSpendingCsv(text: string): SpendingRow[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    delimiter: ',',
    skipEmptyLines: 'greedy',
    transformHeader: (header) => {
      const name = header.trim().toLowerCase()
      return name === 'spending group' ? 'customer_id' : name
    },
  })

  if (result.errors.length > 0) {
    throw new CustomerError(
      'We couldn’t read the spending in this file. Check that each row has the same number of columns, then try again.'
    )
  }

  const headers = result.meta.fields ?? []
  const hasSpendingGroups = headers.includes('customer_id')

  if (
    headers.length !== requiredColumns.length + Number(hasSpendingGroups) ||
    !requiredColumns.every((column) => headers.includes(column))
  ) {
    throw new CustomerError(
      'This file isn’t in the expected spending format. Use the template for weekly travel, food and utilities amounts.'
    )
  }

  if (result.data.length === 0) {
    throw new CustomerError('This file has no spending to add. Try another file.')
  }

  const seenWeeks = new Set<string>()
  const amountLabels = { travel: 'Travel', food: 'Food', utilities: 'Utilities' }

  return result.data.map((row, index) => {
    const recordNumber = index + 1

    function readPositiveInteger(column: 'customer_id' | 'week'): number {
      const value = row[column]?.trim() ?? ''
      const number = Number(value)

      if (!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number < 1) {
        const field = column === 'week' ? 'a week number above zero' : 'a valid spending group'
        throw new CustomerError(`Check row ${recordNumber}. Enter ${field}.`)
      }

      return number
    }

    function readAmount(column: keyof typeof amountLabels): number {
      const value = row[column]?.trim() ?? ''
      const number = Number(value)

      if (!/^\d+(\.\d{1,2})?$/.test(value)) {
        throw new CustomerError(
          `Check row ${recordNumber}. ${amountLabels[column]} needs an amount in pounds with up to two decimal places.`
        )
      }

      if (number > MAX_SPENDING_AMOUNT_GBP) {
        throw new CustomerError(
          `Check row ${recordNumber}. ${amountLabels[column]} must be £${MAX_SPENDING_AMOUNT_GBP.toLocaleString('en-GB')} or less.`
        )
      }

      return number
    }

    const spendingRow: SpendingRow = {
      customer_id: hasSpendingGroups ? readPositiveInteger('customer_id') : 1,
      week: readPositiveInteger('week'),
      travel: readAmount('travel'),
      food: readAmount('food'),
      utilities: readAmount('utilities'),
    }

    const identifier = `${spendingRow.customer_id}-${spendingRow.week}`

    if (seenWeeks.has(identifier)) {
      throw new CustomerError(
        `Check row ${recordNumber}. Include each week only once per spending group.`
      )
    }

    seenWeeks.add(identifier)

    return spendingRow
  })
}
