import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const december = '2026-12'
const november = '2026-11'

async function enterManualSpending(page: Page, foodAmount: string, itemized = false) {
  await expect(page.getByRole('heading', { name: 'Monthly spending', exact: true })).toBeVisible()
  await page.getByLabel('Spending month').fill(december)
  const foodBreakdown = page.getByRole('checkbox', { name: 'By subcategory for Food' })
  await foodBreakdown.setChecked(itemized)
  await page.getByRole('spinbutton', { name: itemized ? 'Groceries (£)' : 'Food (£)', exact: true }).fill(foodAmount)
  for (const category of ['Travel', 'Utilities', 'Shopping', 'Housing', 'Other']) {
    await page.getByRole('spinbutton', { name: `${category} (£)`, exact: true }).fill('0')
  }
}

test('saves, explores and replaces monthly spending', async ({ page }) => {
  const overview = page.getByRole('button', { name: 'Overview', exact: true })
  const addSpending = page.getByRole('button', { name: 'Add spending', exact: true })
  const month = page.getByLabel('Reporting month')
  const footprint = page.getByRole('region', { name: 'Estimated carbon footprint' })
  const spending = page.getByRole('region', { name: 'Monthly spending' })
  const recommendations = page.getByRole('region', { name: 'Recommendations' })
  const save = page.getByRole('button', { name: 'Save spending', exact: true })
  const replace = page.getByRole('dialog', { name: 'Replace saved spending?' })

  await test.step('Sign in and save itemized spending for a new month', async () => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Sign in with Microsoft' }).click()
    await expect(overview).toHaveAttribute('aria-pressed', 'true')
    await addSpending.click()
    const prompt = page.getByText('Choose a month', { exact: true })
    await expect(prompt).toBeVisible()
    await enterManualSpending(page, '100', true)
    await expect(prompt).toBeHidden()
    await save.click()
    await expect(page.getByRole('heading', { name: 'Spending insights' })).toBeFocused()
    await expect(page.getByRole('status').filter({ hasText: 'Spending saved for December 2026.' })).toBeVisible()
    await expect(month).toHaveValue(december)
    await expect(spending).toContainText('£100.00')
    await expect(footprint).toContainText('50.9 kg CO₂e')
    await expect(recommendations).toContainText('No recommendations for this month.')
  })

  await test.step('Open the monthly recap and restore focus on exit', async () => {
    const recapTrigger = page.getByRole('button', { name: 'View monthly recap' })
    await recapTrigger.click()
    const recap = page.getByRole('dialog', { name: 'December 2026 recap' })
    await expect(recap).toContainText('50.9 kg CO₂e')
    await recap.getByRole('button', { name: 'Next' }).click()
    await expect(recap.getByRole('heading', { name: 'Compared with last month' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(recap).toBeHidden()
    await expect(recapTrigger).toBeFocused()
  })

  await test.step('Reload, use the guide to explore history and reveal a seeded recommendation', async () => {
    await page.reload()
    await expect(overview).toHaveAttribute('aria-pressed', 'true')
    await month.selectOption(december)
    await expect(footprint).toContainText('50.9 kg CO₂e')

    const guideToggle = page.getByRole('button', { name: 'Show me around' })
    const guide = page.getByRole('navigation', { name: 'Overview guide' })
    await expect(guideToggle).toHaveAttribute('aria-expanded', 'false')
    await guideToggle.click()
    await expect(guide.getByRole('button', { name: 'Find a way to save' })).toBeHidden()
    await guide.getByRole('button', { name: 'Explore your spending' }).press('Enter')
    await expect(page.getByRole('heading', { name: 'Estimated carbon over time' })).toBeFocused()
    await page.getByRole('button', { name: 'Spend', exact: true }).click()
    await page.getByRole('region', { name: 'Spending over time' }).getByRole('button', { name: /^Nov 2026,/ }).click()
    await expect(month).toHaveValue(november)

    // C102's November results are documented in docs/sample_expected_results.md.
    await expect(footprint).toContainText('2,408.48 kg CO₂e')
    await guide.getByRole('button', { name: 'Find a way to save' }).click()
    await expect(recommendations.getByRole('heading', { name: 'Recommendations' })).toBeFocused()
    const shopping = recommendations.getByRole('listitem').filter({ hasText: 'Shopping' })
    const savings = shopping.getByText('£123.41', { exact: true })
    const reveal = shopping.getByRole('button', { name: 'Reveal recommendation for Shopping' })
    await expect(reveal).toHaveAttribute('aria-expanded', 'false')
    await expect(savings).toBeHidden()
    await reveal.click()
    await expect(savings).toBeVisible()
    await shopping.getByRole('button', { name: 'Hide recommendation for Shopping' }).press('Space')
    await expect(reveal).toBeFocused()
    await expect(savings).toBeHidden()
  })

  await test.step('Cancel a replacement and verify the saved figures are preserved', async () => {
    await addSpending.click()
    await enterManualSpending(page, '300')
    await save.click()
    await expect(replace).toContainText('December 2026')
    await replace.getByRole('button', { name: 'Keep saved spending' }).click()
    await expect(replace).toBeHidden()
    await expect(save).toBeFocused()
    await expect(page.getByRole('spinbutton', { name: 'Food (£)', exact: true })).toHaveValue('300')
    await overview.click()
    await month.selectOption(december)
    await expect(spending).toContainText('£100.00')
  })

  await test.step('Confirm the replacement and verify it survives a reload', async () => {
    await addSpending.click()
    await enterManualSpending(page, '300')
    await save.click()
    await replace.getByRole('button', { name: 'Replace spending', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Spending insights' })).toBeFocused()
    await expect(spending).toContainText('£300.00')
    await page.reload()
    await month.selectOption(december)
    await expect(spending).toContainText('£300.00')
    await recommendations.getByRole('button', { name: 'Reveal recommendation for Food' }).click()
    await expect(recommendations.getByText('£42.00', { exact: true })).toBeVisible()
  })

  await test.step('Replace manual figures with CSV spending and verify November is unchanged', async () => {
    await addSpending.click()
    await page.getByRole('button', { name: 'Upload CSV' }).click()
    await page.getByLabel('Spending month').fill(december)
    await page.getByLabel('Choose a CSV file').setInputFiles({
      name: 'spending.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Week,Travel,Food,Utilities\n1,0,30,0\n'),
    })
    await page.getByRole('button', { name: 'Preview spending' }).click()
    await expect(page.getByRole('region', { name: 'Weekly spending table' })).toBeVisible()
    await save.click()
    await replace.getByRole('button', { name: 'Replace spending', exact: true }).click()
    // £30 weekly is £130 monthly using the seeded WeeksPerMonth multiplier.
    await expect(spending).toContainText('£130.00')
    await month.selectOption(november)
    await expect(footprint).toContainText('2,408.48 kg CO₂e')
  })
})
