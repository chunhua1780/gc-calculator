// @ts-check
const { test, expect } = require('@playwright/test');
const BASE = 'http://localhost:8877/index.html';

test('_ensureLangPack fetches and merges a full lang pack for a non-core language', async ({ page }) => {
  await page.goto(BASE);
  await page.waitForTimeout(500);
  const before = await page.evaluate(() => Object.keys(I18N_DICT.fr || {}).length);
  expect(before).toBeLessThan(220);

  const result = await page.evaluate(() => new Promise((resolve) => {
    _ensureLangPack('fr', () => {
      resolve({
        frKeys: Object.keys(I18N_DICT.fr).length,
        cached: !!localStorage.getItem('langPack_fr'),
      });
    });
  }));
  expect(result.frKeys).toBe(220);
  expect(result.cached).toBe(true);
});

test('setLang triggers pack load then applyLang renders translated text', async ({ page }) => {
  await page.goto(BASE);
  await page.waitForTimeout(500);
  await page.evaluate(() => new Promise((resolve) => {
    setLang('de');
    setTimeout(resolve, 500);
  }));
  const deKeys = await page.evaluate(() => Object.keys(I18N_DICT.de).length);
  expect(deKeys).toBe(220);
  const settingsLabel = await page.evaluate(() => i18nT('accountSectionHd'));
  expect(settingsLabel).not.toBe('accountSectionHd');
  expect(settingsLabel.length).toBeGreaterThan(0);
});

test('cached lang pack is reused from localStorage without re-fetch on second call', async ({ page }) => {
  await page.goto(BASE);
  await page.waitForTimeout(500);
  await page.evaluate(() => new Promise((resolve) => _ensureLangPack('es', resolve)));
  let fetchCount = 0;
  await page.route('**/lang/es.json', (route) => { fetchCount++; route.continue(); });
  await page.evaluate(() => new Promise((resolve) => _ensureLangPack('es', resolve)));
  expect(fetchCount).toBe(0);
});

test('core languages en/zh-CN never trigger a lang pack fetch', async ({ page }) => {
  await page.goto(BASE);
  await page.waitForTimeout(500);
  const needsEn = await page.evaluate(() => _needsLangPack('en'));
  const needsZh = await page.evaluate(() => _needsLangPack('zh-CN'));
  expect(needsEn).toBe(false);
  expect(needsZh).toBe(false);
});

test('all 16 lang JSON files are directly fetchable and valid from the server', async ({ page }) => {
  const codes = ['zh-TW','es','fr','de','ru','ar','pt','hi','ja','ko','tr','nl','no','da','ur','bn'];
  for (const code of codes) {
    const res = await page.request.get(`http://localhost:8877/lang/${code}.json`);
    expect(res.ok()).toBe(true);
    const data = await res.json();
    expect(Object.keys(data).length).toBe(220);
  }
});
