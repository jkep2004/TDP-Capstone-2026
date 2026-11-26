import { expect, test } from '@playwright/test'

test('saves itemized spending and displays saved and seeded insights', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Sign in with Microsoft' }).click()
  await expect(page.getByRole('heading', { name: 'Monthly spending' })).toBeVisible()

  await page.getByLabel('Spending month').fill('2026-12')
  await page.getByRole('checkbox', { name: 'By subcategory for Food' }).check()
  await page.getByRole('spinbutton', { name: 'Groceries (£)' }).fill('100')
  for (const category of ['Travel', 'Utilities', 'Shopping', 'Housing', 'Other']) {
    await page.getByRole('spinbutton', { name: `${category} (£)` }).fill('0')
  }
  await page.getByRole('button', { name: 'Save spending' }).click()
  await expect(page.getByRole('heading', { name: 'Spending insights' })).toBeFocused()
  await expect(page.getByText('Spending saved for December 2026.')).toBeVisible()
  await expect(page.getByLabel('Reporting month')).toHaveValue('2026-12')
  const total = page.getByRole('region', { name: 'Estimated carbon footprint' })
  await expect(total).toContainText('50.9 kg CO₂e')

  // Reload to prove the result comes from saved data rather than form state.
  await page.reload()
  await page.getByRole('button', { name: 'Insights' }).click()
  const month = page.getByLabel('Reporting month')
  await month.selectOption('2026-12')
  await expect(total).toContainText('50.9 kg CO₂e')

  // C102's November values are documented in docs/sample_expected_results.md.
  await month.selectOption('2026-11')
  await expect(total).toContainText('2,408.48 kg CO₂e')
  const shopping = page.getByRole('region', { name: 'Recommendations' })
    .getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Shopping' }) })
  await expect(shopping).toContainText('£123.41')
})
