const { webkit } = require('playwright');
(async () => {
  const browser = await webkit.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('[console] ' + msg.text()); });
  try {
    await page.goto('https://chunhua1780.github.io/gc-weather/', { waitUntil: 'load', timeout: 20000 });
    await page.waitForTimeout(2500);
  } catch (e) {
    errors.push('NAV ERROR: ' + e.message);
  }
  const activeScreen = await page.evaluate(() => {
    const el = document.querySelector('.screen.active');
    return el ? el.id : 'NONE';
  }).catch(e => 'EVAL FAILED: ' + e.message);
  console.log('active screen (webkit, fresh visit):', activeScreen);
  console.log('ERRORS:', JSON.stringify(errors, null, 2));
  await page.screenshot({ path: 'C:\\Users\\chunh\\Desktop\\gc-calculator\\tests\\_tmp-check2\\weather-webkit.png' }).catch(()=>{});
  await browser.close();
})();
