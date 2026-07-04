// @ts-check
const { test, expect } = require('@playwright/test');
const BASE = 'http://localhost:8877/index.html';

// On a desktop-width browser, this mobile-first PWA should render as a centered
// "phone frame" (fixed max-width), not stretch buttons/cards across the whole
// window - a stretched calculator keypad is an instant giveaway that breaks
// the disguise.
test.use({ viewport: { width: 1280, height: 800 } });

for (const screenId of ['dcalc', 'dweather', 'dclk', 'dnote']) {
  test(`${screenId} disguise screen is centered with a constrained width on desktop`, async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(800);
    await page.evaluate((s) => { show(s); }, screenId);
    const rect = await page.evaluate((s) => document.getElementById(s).getBoundingClientRect(), screenId);
    expect(rect.width).toBeLessThan(500);
    expect(rect.left).toBeGreaterThan(300); // roughly centered in a 1280px window
  });
}

test('chat screen is also centered with a constrained width on desktop', async ({ page }) => {
  await page.goto(BASE);
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('chat').classList.add('active');
  });
  const rect = await page.evaluate(() => document.getElementById('chat').getBoundingClientRect());
  expect(rect.width).toBeLessThan(500);
  expect(rect.left).toBeGreaterThan(300);
});
