import { expect, test, type Page } from '@playwright/test'

// FR-049: the prototype's profile icon switches between Admin (edit) and Member (view only).

const node = (page: Page, name: string) => page.locator('.react-flow__node', { hasText: name }).first()

async function switchTo(page: Page, role: 'Admin' | 'Member') {
  await page.getByRole('button', { name: /Profile and role/ }).click()
  await page.getByRole('menuitemradio', { name: new RegExp(role) }).click()
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('init')) {
      localStorage.clear()
      localStorage.setItem('bayrab-lang', 'en')
      sessionStorage.setItem('init', '1')
    }
  })
  await page.goto('/?seed=demo#/editor')
  await expect(node(page, 'Hamid')).toBeVisible()
})

test('Member sees the tree view-only; Admin gets editing back', async ({ page }) => {
  const nav = page.locator('.topbar nav')
  await expect(page.getByRole('button', { name: /Profile and role: Admin/ })).toBeVisible()

  await switchTo(page, 'Member')
  // The editor is replaced by the view-only tree.
  await expect(page).toHaveURL(/#\/tree/)
  await expect(nav.getByRole('link', { name: 'Editor' })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: 'Tree' })).toBeVisible()
  await expect(node(page, 'Hamid')).toBeVisible()
  await node(page, 'Hamid').hover()
  await expect(node(page, 'Hamid').getByRole('button', { name: 'Add child' })).toHaveCount(0)
  await expect(page.getByPlaceholder(/Type a name/)).toHaveCount(0)
  await page.screenshot({ path: 'test-results/desktop-member-tree.png' })

  // Typing the editor address still lands on the tree.
  await page.goto('/#/editor')
  await expect(page).toHaveURL(/#\/tree/)

  await nav.getByRole('link', { name: 'Sources' }).click()
  await expect(page.getByRole('heading', { name: 'New source' })).toHaveCount(0)
  await nav.getByRole('link', { name: 'Settings' }).click()
  await expect(page.getByRole('button', { name: 'Download tree (JSON)' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Reset/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Open JSON/ })).toHaveCount(0)

  // The choice survives a reload.
  await page.reload()
  await expect(page.getByRole('button', { name: /Profile and role: Member/ })).toBeVisible()

  await page.getByRole('button', { name: /Profile and role/ }).click()
  await page.screenshot({ path: 'test-results/desktop-profile-menu.png' })
  await page.getByRole('menuitemradio', { name: /Admin/ }).click()
  await expect(nav.getByRole('link', { name: 'Editor' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Reset/ })).toBeVisible()
  await nav.getByRole('link', { name: 'Editor' }).click()
  await expect(page.getByPlaceholder(/Type a name/)).toBeVisible()
})

test('the profile menu closes with Escape and shows the prototype note', async ({ page }) => {
  await page.getByRole('button', { name: /Profile and role/ }).click()
  const menu = page.getByRole('menu')
  await expect(menu).toContainText('Real sign-in comes later')
  await expect(menu.getByRole('menuitemradio', { name: /Admin/ })).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
})
