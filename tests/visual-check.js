const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
  fs.mkdirSync('screenshots', { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://localhost:8877/index.html');
  await page.evaluate(() => {
    localStorage.setItem('registered', '1');
    localStorage.setItem('myId', 'testuser1');
    localStorage.setItem('gatePassedPersist', '1');
    sessionStorage.setItem('testGatePassed', '1');
  });
  await page.reload();
  await page.waitForTimeout(1200);
  await page.evaluate(() => show('settings'));
  await page.evaluate(() => document.querySelector('[onclick="show(\'lang-set\')"]').scrollIntoView());
  await page.mouse.wheel(0, 260);
  await page.screenshot({ path: 'screenshots/07-chatstyle-collapsed.png' });
  await page.locator('text=聊天气泡风格').click();
  await page.screenshot({ path: 'screenshots/08-chatstyle-expanded.png' });
  await browser.close();
})();
