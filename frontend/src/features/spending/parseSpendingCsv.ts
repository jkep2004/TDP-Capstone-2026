import Papa from 'papaparse'
import { MAX_SPENDING_AMOUNT_GBP } from './spendingAmount'

export type SpendingRow = {
  customer_id: number
  week: number
  travel: number
  food: number
  utilities: number
}

const requiredColumns = [
  'customer_id',
  'week',
  'travel',
  'food',
  'utilities',
]

export function parseSpendingCsv(text: string): SpendingRow[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    delimiter: ',',
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  })

  if (result.errors.length > 0) {
    throw new Error(
      'The CSV could not be parsed. Check its headings, commas and rows.'
    )
  }

  const headers = result.meta.fields ?? []

  // For this prototype, accept exactly the five sample-data columns.
  if (
    headers.length !== requiredColumns.length ||
    !requiredColumns.every((column) => headers.includes(column))
  ) {
    throw new Error(
      'Use these columns: customer_id, week, travel, food, utilities.'
    )
  }

  if (result.data.length === 0) {
    throw new Error('The file contains no spending records.')
  }

  const seenWeeks = new Set<string>()

  return result.data.map((row, index) => {
    const recordNumber = index + 1

    function readPositiveInteger(column: string): number {
      const value = row[column]?.trim() ?? ''
      const number = Number(value)

      if (!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number < 1) {
        throw new Error(
          `Record ${recordNumber}: ${column} must be a positive whole number.`
        )
      }

      return number
    }

    function readAmount(column: string): number {
      const value = row[column]?.trim() ?? ''
      const number = Number(value)

      if (!/^\d+(\.\d{1,2})?$/.test(value)) {
        throw new Error(
          `Record ${recordNumber}: ${column} must be a non-negative amount ` +
          'with no more than two decimal places.'
        )
      }

      if (number > MAX_SPENDING_AMOUNT_GBP) {
        throw new Error(
          `Record ${recordNumber}: ${column} must be £${MAX_SPENDING_AMOUNT_GBP.toLocaleString('en-GB')} or less.`
        )
      }

      return number
    }

    const spendingRow: SpendingRow = {
      customer_id: readPositiveInteger('customer_id'),
      week: readPositiveInteger('week'),
      travel: readAmount('travel'),
      food: readAmount('food'),
      utilities: readAmount('utilities'),
    }

    const identifier = `${spendingRow.customer_id}-${spendingRow.week}`

    if (seenWeeks.has(identifier)) {
      throw new Error(
        `Record ${recordNumber}: duplicate week for this customer.`
      )
    }

    seenWeeks.add(identifier)

    return spendingRow
  })
}
