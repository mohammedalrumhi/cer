// The UI is Arabic only: no Latin-letter words on any screen (visible text, placeholders, titles,
// accessible names). File-format names, paper sizes and keyboard keys are the accepted exceptions.
import { expect, test } from '@playwright/test';
import { authenticate, login } from '../support/api.js';

const ALLOWED = new Set(['PDF', 'PNG', 'JPG', 'ZIP', 'CSV', 'Excel', 'QR', 'A4', 'A5', 'Ctrl', 'Shift', 'Alt', 'Enter', 'Esc', 'Delete', 'Space', 'Backspace']);

async function latinWords(page) {
  return page.evaluate(() => {
    const texts = [document.body.innerText];
    for (const el of document.querySelectorAll('[placeholder],[title],[aria-label]')) {
      if (el.closest('[data-user-content]')) continue;
      texts.push(el.getAttribute('placeholder') || '', el.getAttribute('title') || '', el.getAttribute('aria-label') || '');
    }
    const words = new Set();
    for (const text of texts) {
      // Ignore hex colours, URLs and file names that are data rather than wording.
      const cleaned = text.replace(/#[0-9a-f]{3,8}\b/gi, ' ').replace(/https?:\/\/\S+/g, ' ').replace(/\S+\.(png|jpe?g|csv|xlsx?|pdf|zip)\b/gi, ' ');
      for (const match of cleaned.matchAll(/[A-Za-z]{2,}/g)) words.add(match[0]);
    }
    return [...words];
  });
}

const PAGES = [
  ['dashboard', '/'],
  ['students', '/students'],
  ['new template', '/templates/new'],
  ['generate', '/generate?template=itqan-template-5-students'],
  ['editor', '/templates/c0574e38-b6a6-4770-b0a9-4637ab6d1e61/edit'],
  ['not found', '/404'],
];

test.skip(({ isMobile }) => isMobile, 'one viewport is enough for wording');

for (const [name, route] of PAGES) {
  test(`${name} has no English UI text`, async ({ context, page }) => {
    await authenticate(context, await login());
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    if (route.includes('/edit')) {
      await page.locator('[data-testid=editor-canvas][data-scene-ready=true]').waitFor();
      // Open the menus and panels that hold most of the wording.
      for (const panel of ['templates', 'elements', 'text', 'fields', 'uploads', 'brand', 'backgrounds', 'layers']) {
        await page.getByTestId(`rail-${panel}`).click();
        await page.waitForTimeout(250);
        const words = (await latinWords(page)).filter((word) => !ALLOWED.has(word));
        expect(words, `${name} › ${panel} panel`).toEqual([]);
      }
      await page.getByTestId('editor-more').click();
      expect((await latinWords(page)).filter((word) => !ALLOWED.has(word)), `${name} › file menu`).toEqual([]);
      await page.keyboard.press('Escape');
      await page.keyboard.press('Shift+Slash');
    }
    const words = (await latinWords(page)).filter((word) => !ALLOWED.has(word));
    expect(words, name).toEqual([]);
  });
}

test('login and verification pages have no English UI text', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const route of ['/login', '/verify/0000-000000']) {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    expect((await latinWords(page)).filter((word) => !ALLOWED.has(word)), route).toEqual([]);
  }
  await context.close();
});
