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
  await page.goto('/?seed=demo')
  await expect(page).toHaveURL(/#\/lineage/)
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('.nasab.big')).toContainText('سلمى بنت علي بن حامد بن سالم')
  await page.screenshot({ path: 'test-results/phone-lineage.png', fullPage: true })
})

test('search ignores hamza and spaces', async ({ page }) => {
  await page.goto('/?seed=demo#/search')
  await page.getByRole('searchbox').fill('ابراهيم')
  await expect(page.locator('.result-list li')).toHaveCount(1)
  await page.screenshot({ path: 'test-results/phone-search.png' })
})

test('profile shows children grouped per marriage', async ({ page }) => {
  await page.goto('/?seed=demo#/person/p3')
  await expect(page.getByText('الأبناء من آمنة')).toBeVisible()
  await expect(page.getByText('الأبناء من خديجة')).toBeVisible()
  await page.screenshot({ path: 'test-results/phone-profile.png', fullPage: true })
})

test('tree tab renders view-only canvas', async ({ page }) => {
  await page.goto('/?seed=demo#/tree')
  await expect(page.locator('.react-flow__node-person').first()).toBeVisible()
  await page.waitForTimeout(800)
  await page.screenshot({ path: 'test-results/phone-tree.png' })
})

test('without ?seed=demo the Bayrab seed loads: founder P-0001', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bayrab-me', 'P-0001'))
  await page.goto('/#/person/P-0001')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sharaf al-Din Wad Arki')
  await expect(page.getByText('P-0001').first()).toBeVisible()
  await expect(page.getByText('Chat report SRC-CHAT-001')).toBeVisible()
  await page.screenshot({ path: 'test-results/phone-bayrab-founder.png', fullPage: true })
})
