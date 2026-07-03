// @ts-check
const { test, expect } = require('@playwright/test');
const BASE = 'http://localhost:8877/index.html';

test('disguise screen (calculator) is the default-active screen in raw HTML, not the login/reg screen', async ({ page }) => {
  // Check BEFORE any app JS has a chance to redirect anything - request the raw
  // HTML and confirm which screen carries "active" in the markup itself.
  const html = await (await page.request.get(BASE)).text();
  const regMatch = html.match(/<div id="reg" class="([^"]*)"/);
  const calcMatch = html.match(/<div id="dcalc" class="([^"]*)"/);
  expect(regMatch[1]).not.toContain('active');
  expect(calcMatch[1]).toContain('active');
});

test('typing 00000000 on the calculator disguise always routes to the login/register page (even while logged in)', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await page.goto(BASE);
  await page.evaluate(() => {
    localStorage.setItem('registered', 'true');
    localStorage.setItem('myId', '999999999');
    localStorage.setItem('pin', '1234');
  });
  await page.reload();
  await page.waitForTimeout(1000);
  // Force the calculator disguise screen regardless of where boot logic landed -
  // this test targets specifically the new 00000000 branch inside cp(), not the
  // full boot race (covered separately).
  await page.evaluate(() => { show('dcalc'); });
  await page.evaluate(() => {
    for (let i = 0; i < 8; i++) cp('0');
    cp('EQ');
  });
  // while logged in, this goes through the full logout teardown (network calls +
  // location.reload()) before landing on reg - same timing as doLogout() itself.
  await page.waitForLoadState('load').catch(() => {});
  await page.waitForTimeout(2500);
  const active = await page.evaluate(() => document.querySelector('.screen.active').id);
  expect(active).toBe('reg');
});

test('typing 00000000 goes straight to reg when not logged in (no logout teardown needed)', async ({ page }) => {
  await page.goto(BASE);
  await page.waitForTimeout(1000);
  await page.evaluate(() => { show('dcalc'); });
  await page.evaluate(() => {
    for (let i = 0; i < 8; i++) cp('0');
    cp('EQ');
  });
  await page.waitForTimeout(300);
  const active = await page.evaluate(() => document.querySelector('.screen.active').id);
  expect(active).toBe('reg');
});

test('font size setting changes the rendered chat bubble font-size', async ({ page }) => {
  await page.goto(BASE);
  await page.evaluate(() => {
    localStorage.setItem('registered', '1');
    localStorage.setItem('myId', 'testuser1');
    localStorage.setItem('gatePassedPersist', '1');
    sessionStorage.setItem('testGatePassed', '1');
  });
  await page.reload();
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('chat').classList.add('active');
    document.getElementById('chatMsgs').innerHTML = '<div class="mr s"><div class="bub">hi</div></div>';
  });
  const before = await page.evaluate(() => getComputedStyle(document.querySelector('.mr.s .bub')).fontSize);
  await page.evaluate(() => applyFontSize('xl'));
  const after = await page.evaluate(() => getComputedStyle(document.querySelector('.mr.s .bub')).fontSize);
  expect(after).not.toBe(before);
  expect(parseFloat(after)).toBeGreaterThan(parseFloat(before));
  expect(await page.evaluate(() => localStorage.getItem('chatFontSize'))).toBe('xl');
});

test('logout uses an in-app modal instead of native confirm() (Cordova/WebView-safe)', async ({ page }) => {
  let nativeDialogFired = false;
  page.on('dialog', d => { nativeDialogFired = true; d.dismiss(); });
  await page.goto(BASE);
  await page.evaluate(() => {
    localStorage.setItem('registered', 'true');
    localStorage.setItem('myId', '999999999');
  });
  await page.reload();
  await page.waitForTimeout(1000);
  await page.evaluate(() => { show('settings'); });
  await page.locator('#set-logout').click();
  await page.waitForTimeout(300);
  expect(nativeDialogFired).toBe(false);
  await expect(page.locator('#logoutConfirmModal')).toBeVisible();
});
