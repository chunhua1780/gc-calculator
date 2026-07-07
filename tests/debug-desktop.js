const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto('http://localhost:8877/index.html');
  await page.waitForTimeout(800);
  for (const s of ['dcalc', 'dweather', 'dclk', 'dnote']) {
    await page.evaluate((id) => { show(id); }, s);
    await page.waitForTimeout(200);
    const info = await page.evaluate((id) => {
      const el = document.getElementById(id);
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { id, className: el.className, display: cs.display, width: r.width, left: r.left, cssLeft: cs.left, cssWidth: cs.width, cssTransform: cs.transform, cssPosition: cs.position };
    }, s);
    console.log(JSON.stringify(info));
  }
  await browser.close();
})();
