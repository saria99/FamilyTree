import { expect, test, type Locator, type Page } from '@playwright/test'

const node = (page: Page, name: string) => page.locator('.react-flow__node', { hasText: name }).first()

/** React Flow needs real pointer movement between down and up to register a drag. */
async function drag(page: Page, from: Locator, to: Locator) {
  await from.hover({ force: true })
  const a = (await from.boundingBox())!
  const b = (await to.boundingBox())!
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(a.x + a.width / 2 + ((b.x + b.width / 2 - a.x - a.width / 2) * i) / 12, a.y + a.height / 2 + ((b.y + b.height / 2 - a.y - a.height / 2) * i) / 12)
  }
  await page.mouse.up()
}

interface Stored {
  persons: { id: string; ismEn?: string }[]
  claims: { id: string; childId: string; marriageId: string; preferred: boolean }[]
  positions?: Record<string, { x: number; y: number }>
}

const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('bayrab-prototype-v2') ?? '{}')) as Promise<Stored>

async function fit(page: Page) {
  await page.getByRole('button', { name: /fit view/i }).click()
  await page.waitForTimeout(300)
}

/** A diamond connector: hover the person first so the connector becomes visible. */
function handle(page: Page, name: string, side: 'top' | 'bottom' | 'left' | 'right') {
  return node(page, name).locator(`.react-flow__handle-${side}.diamond-handle`)
}

async function addPerson(page: Page, name: string, gender: 'Male' | 'Female') {
  await page.getByRole('radio', { name: gender, exact: true }).click()
  await page.getByPlaceholder(/Type a name/).fill(name)
  await page.keyboard.press('Enter')
  await expect(node(page, name)).toBeVisible()
}

async function marry(page: Page, wife: string, husband: string, year: string) {
  await fit(page)
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

test('dropping a child on other parents offers Move here; moving re-shifts the relationship', async ({ page }) => {
  // Yusuf is Aminah's son (c2 → m2); drop him on the Hamid–Khadijah ring (m3).
  await drag(page, node(page, 'Yusuf'), page.locator('.react-flow__node[data-id="u:m3"]'))
  const dialog = page.getByRole('dialog', { name: 'Change parents?' })
  await expect(dialog).toContainText('Aminah')
  await page.screenshot({ path: 'test-results/desktop-shift.png' })
  await dialog.getByRole('button', { name: 'Move here' }).click()
  await expect.poll(async () => (await stored(page)).claims.find((c) => c.id === 'c2')?.marriageId).toBe('m3')
})

test('diamond: bottom connector adds a child to the chosen marriage', async ({ page }) => {
  await addPerson(page, 'NewChild', 'Male')
  await fit(page)
  await drag(page, handle(page, 'Khadijah', 'bottom'), node(page, 'NewChild'))
  const picker = page.getByRole('dialog', { name: 'Which marriage?' })
  await picker.getByRole('button', { name: /with Hamid/ }).click()
  const data = await stored(page)
  const child = data.persons.find((p) => p.ismEn === 'NewChild')!
  expect(data.claims.find((c) => c.childId === child.id)).toMatchObject({ marriageId: 'm3', preferred: true })
})

test('diamond: top connector adds a parent; side connector adds a sibling', async ({ page }) => {
  await addPerson(page, 'NewKid', 'Female')
  await addPerson(page, 'NewSib', 'Male')
  await fit(page)
  await drag(page, handle(page, 'NewKid', 'top'), node(page, 'Sawdah'))
  await page.getByRole('dialog', { name: 'Which marriage?' }).getByRole('button', { name: /with Hamid/ }).click()
  await fit(page)
  await drag(page, handle(page, 'NewKid', 'right'), node(page, 'NewSib'))
  await expect.poll(async () => {
    const data = await stored(page)
    const id = (name: string) => data.persons.find((p) => p.ismEn === name)!.id
    return [id('NewKid'), id('NewSib')].map((c) => data.claims.find((x) => x.childId === c && x.preferred)?.marriageId)
  }).toEqual(['m4', 'm4'])
  await page.screenshot({ path: 'test-results/desktop-diamond.png' })
})

test('sibling link without any parents asks for a parent first', async ({ page }) => {
  await addPerson(page, 'LoneA', 'Male')
  await addPerson(page, 'LoneB', 'Female')
  await fit(page)
  await drag(page, handle(page, 'LoneA', 'left'), node(page, 'LoneB'))
  await expect(page.getByRole('alertdialog')).toContainText('shared parents')
})

test('a person dropped on empty space stays there; Auto-arrange restores the layout', async ({ page }) => {
  const nuh = node(page, 'Nuh')
  const box = (await nuh.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + box.width / 2 + i * 6, box.y + box.height / 2 + 260 + i)
  await page.mouse.up()
  await expect.poll(async () => (await stored(page)).positions?.p19).toBeTruthy()
  await page.getByRole('button', { name: /Auto-arrange/ }).click()
  await expect.poll(async () => (await stored(page)).positions).toBeUndefined()
})

/** Hover a person and click one of the "+" buttons around the diamond. */
async function plus(page: Page, name: string, label: 'Add parent' | 'Add sibling' | 'Add child' | 'Add wife' | 'Add husband') {
  await fit(page)
  await node(page, name).hover()
  await node(page, name).getByRole('button', { name: label }).first().click()
}

test('"+ Add child" asks for the essentials, creates the child under the chosen marriage, and opens it for editing', async ({ page }) => {
  await plus(page, 'Khadijah', 'Add child')
  const dialog = page.getByRole('dialog', { name: 'Add a child of Khadijah' })
  await dialog.getByRole('radio', { name: 'Daughter' }).click()
  await dialog.getByLabel('Name (English)').fill('Maymunah')
  await dialog.getByLabel('Birth year').fill('1962')
  await page.screenshot({ path: 'test-results/desktop-add-child.png' })
  await dialog.getByRole('button', { name: 'Add' }).click()
  const data = await stored(page)
  const child = data.persons.find((p) => p.ismEn === 'Maymunah')!
  expect(child).toBeTruthy()
  expect(data.claims.find((c) => c.childId === child.id)).toMatchObject({ marriageId: 'm3', preferred: true })
  // The new person is selected so the rest can be filled in later.
  await expect(page.locator('.side-panel')).toContainText('Maymunah')
})

test('"+ Add parent" twice: the second parent completes the marriage', async ({ page }) => {
  await plus(page, 'Nuh', 'Add parent')
  let dialog = page.getByRole('dialog', { name: 'Add a parent of Nuh' })
  await dialog.getByRole('radio', { name: 'Father' }).click()
  await dialog.getByLabel('Name (English)').fill('Nuh Father')
  await dialog.getByRole('button', { name: 'Add' }).click()

  await plus(page, 'Nuh', 'Add parent')
  dialog = page.getByRole('dialog', { name: 'Add a parent of Nuh' })
  await expect(dialog.getByRole('radio', { name: 'Mother' })).toHaveAttribute('aria-checked', 'true')
  await dialog.getByLabel('Name (English)').fill('Nuh Mother')
  await dialog.getByRole('button', { name: 'Add' }).click()

  const data = await page.evaluate(() => JSON.parse(localStorage.getItem('bayrab-prototype-v2')!))
  const id = (n: string) => data.persons.find((p: { ismEn?: string }) => p.ismEn === n).id
  const claim = data.claims.find((c: { childId: string }) => c.childId === 'p19')
  const marriage = data.marriages.find((m: { id: string }) => m.id === claim.marriageId)
  expect([marriage.husbandId, marriage.wifeId]).toEqual([id('Nuh Father'), id('Nuh Mother')])
})

test('"+ Add sibling" gives the new person the same parents', async ({ page }) => {
  await plus(page, 'Yusuf', 'Add sibling')
  const dialog = page.getByRole('dialog', { name: 'Add a sibling of Yusuf' })
  await dialog.getByLabel('Name (English)').fill('Yahya')
  await dialog.getByRole('button', { name: 'Add' }).click()
  const data = await stored(page)
  const sib = data.persons.find((p) => p.ismEn === 'Yahya')!
  expect(data.claims.find((c) => c.childId === sib.id)?.marriageId).toBe('m2')
})

interface StoredMarriage {
  id: string
  husbandId: string | null
  wifeId: string | null
}

test('"+ Add child" can record a new wife as the mother in the same step', async ({ page }) => {
  await plus(page, 'Yusuf', 'Add child')
  const dialog = page.getByRole('dialog', { name: 'Add a child of Yusuf' })
  // Yusuf has no marriage yet, so the mother defaults to "New wife…".
  await expect(dialog.getByLabel('Mother')).toHaveValue('__new')
  await dialog.getByLabel('Name (English)', { exact: true }).fill('Musa')
  await expect(dialog.getByRole('button', { name: 'Add' })).toBeDisabled()
  await dialog.getByLabel('Wife’s name (English)').fill('Hafsah')
  await page.screenshot({ path: 'test-results/desktop-add-child-new-wife.png' })
  await dialog.getByRole('button', { name: 'Add' }).click()

  const data = (await page.evaluate(() => JSON.parse(localStorage.getItem('bayrab-prototype-v2')!))) as Stored & { marriages: StoredMarriage[] }
  const id = (n: string) => data.persons.find((p) => p.ismEn === n)!.id
  const marriage = data.marriages.find((m) => m.wifeId === id('Hafsah'))!
  expect(marriage.husbandId).toBe('p7')
  expect(data.claims.find((c) => c.childId === id('Musa'))).toMatchObject({ marriageId: marriage.id, preferred: true })

  // One undo removes the child, the wife and the marriage together.
  await page.getByRole('button', { name: /Undo/ }).click()
  await expect(node(page, 'Hafsah')).toHaveCount(0)
  await expect(node(page, 'Musa')).toHaveCount(0)
})

test('"+ Add wife" on the diamond marries a new wife to the person', async ({ page }) => {
  await plus(page, 'Yusuf', 'Add wife')
  const dialog = page.getByRole('dialog', { name: 'Add a wife of Yusuf' })
  await dialog.getByLabel('Name (English)').fill('Asma')
  await dialog.getByRole('button', { name: 'Add' }).click()
  await expect(node(page, 'Asma')).toBeVisible()
  const data = (await page.evaluate(() => JSON.parse(localStorage.getItem('bayrab-prototype-v2')!))) as Stored & { marriages: StoredMarriage[] }
  const asma = data.persons.find((p) => p.ismEn === 'Asma')!
  expect(data.marriages.find((m) => m.wifeId === asma.id)?.husbandId).toBe('p7')
  // The side panel offers the same action.
  await node(page, 'Yusuf').click()
  await expect(page.locator('.side-panel').getByRole('button', { name: '+ Add wife' })).toBeVisible()
})
