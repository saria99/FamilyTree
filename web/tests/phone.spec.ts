import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('init')) {
      localStorage.clear()
      localStorage.setItem('bayrab-lang', 'ar')
      localStorage.setItem('bayrab-me', 'p17')
      sessionStorage.setItem('init', '1')
    }
  })
})

test('phone lands on the ancestor view in Arabic, RTL', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/#\/lineage/)
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('.nasab.big')).toContainText('سلمى بنت علي بن حامد بن سالم')
  await page.screenshot({ path: 'test-results/phone-lineage.png', fullPage: true })
})

test('search ignores hamza and spaces', async ({ page }) => {
  await page.goto('/#/search')
  await page.getByRole('searchbox').fill('ابراهيم')
  await expect(page.locator('.result-list li')).toHaveCount(1)
  await page.screenshot({ path: 'test-results/phone-search.png' })
})

test('profile shows children grouped per marriage', async ({ page }) => {
  await page.goto('/#/person/p3')
  await expect(page.getByText('الأبناء من آمنة')).toBeVisible()
  await expect(page.getByText('الأبناء من خديجة')).toBeVisible()
  await page.screenshot({ path: 'test-results/phone-profile.png', fullPage: true })
})

test('tree tab renders view-only canvas', async ({ page }) => {
  await page.goto('/#/tree')
  await expect(page.locator('.react-flow__node-person').first()).toBeVisible()
  await page.waitForTimeout(800)
  await page.screenshot({ path: 'test-results/phone-tree.png' })
})
