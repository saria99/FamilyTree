import { expect, test, type Locator, type Page } from '@playwright/test'

const node = (page: Page, name: string) => page.locator('.react-flow__node', { hasText: name }).first()

/** React Flow needs real pointer movement between down and up to register a drag. */
async function drag(page: Page, from: Locator, to: Locator) {
  const a = (await from.boundingBox())!
  const b = (await to.boundingBox())!
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(a.x + a.width / 2 + ((b.x + b.width / 2 - a.x - a.width / 2) * i) / 12, a.y + a.height / 2 + ((b.y + b.height / 2 - a.y - a.height / 2) * i) / 12)
  }
  await page.mouse.up()
}

async function addPerson(page: Page, name: string, gender: 'Male' | 'Female') {
  await page.getByRole('radio', { name: gender, exact: true }).click()
  await page.getByPlaceholder(/Type a name/).fill(name)
  await page.keyboard.press('Enter')
  await expect(node(page, name)).toBeVisible()
}

async function marry(page: Page, wife: string, husband: string, year: string) {
  await page.getByRole('button', { name: /fit view/i }).click()
  await page.waitForTimeout(300)
  await drag(page, node(page, wife), node(page, husband))
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Year').first().fill(year)
  await dialog.getByRole('button', { name: 'Save' }).click()
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

test('sample tree renders with statuses and legend', async ({ page }) => {
  await expect(page.locator('.react-flow__node-union')).toHaveCount(8)
  await expect(page.locator('.canvas-legend')).toBeVisible()
  await page.screenshot({ path: 'test-results/desktop-editor.png' })
})

test('a fifth wife is accepted (no religious rule checks) and undo works', async ({ page }) => {
  await addPerson(page, 'Zubayr', 'Male')
  for (const w of ['WifeA', 'WifeB', 'WifeC', 'WifeD', 'WifeE']) await addPerson(page, w, 'Female')
  await marry(page, 'WifeA', 'Zubayr', '2000')
  await marry(page, 'WifeB', 'Zubayr', '2001')
  await marry(page, 'WifeC', 'Zubayr', '2002')
  await marry(page, 'WifeD', 'Zubayr', '2003')
  await marry(page, 'WifeE', 'Zubayr', '2004')
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(page.locator('.react-flow__node-union')).toHaveCount(13)
  await page.screenshot({ path: 'test-results/desktop-five-wives.png' })

  await page.getByRole('button', { name: /Undo/ }).click()
  await expect(page.locator('.react-flow__node-union')).toHaveCount(12)
})

test('two men cannot be recorded as husband and wife', async ({ page }) => {
  await drag(page, node(page, 'Yusuf'), node(page, 'Hasan'))
  await expect(page.getByRole('alertdialog')).toContainText('husband and a wife')
})

test('dragging a child with preferred parents offers an alternative claim', async ({ page }) => {
  // Yusuf is Aminah's son; drop him on the Hamid–Khadijah ring.
  const khadijahRing = page.locator('.react-flow__node[data-id="u:m3"]')
  await drag(page, node(page, 'Yusuf'), khadijahRing)
  const confirm = page.getByRole('alertdialog')
  await expect(confirm).toContainText('alternative')
  await page.screenshot({ path: 'test-results/desktop-alternative.png' })
})
