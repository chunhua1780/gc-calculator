const { webkit } = require('playwright');
(async () => {
  const browser = await webkit.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('[console] ' + msg.text()); });
  await page.route('**/*.supabase.co/**', route => route.abort());
  await page.goto('http://localhost:8878/index.html', { waitUntil: 'load', timeout: 20000 });
  await page.evaluate(() => {
    localStorage.setItem('registered', '1');
    localStorage.setItem('myId', 'testuser_repro');
    localStorage.setItem('pin', '1234');
    localStorage.setItem('gatePassedPersist', '1');
    localStorage.setItem('freeMode', 'true');
    sessionStorage.setItem('testGatePassed', '1');
  });
  try { await page.reload({ waitUntil: 'load', timeout: 8000 }); } catch(e) { console.log('reload warn:', e.message); }
  await page.waitForTimeout(2500);
  const activeScreen = await page.evaluate(() => {
    const el = document.querySelector('.screen.active');
    return el ? el.id : 'NONE';
  }).catch(e => 'EVAL FAILED: ' + e.message);
  const bodyHtmlLen = await page.evaluate(() => document.body.innerHTML.length).catch(()=>'N/A');
  console.log('active screen (webkit, logged in legacy freeMode):', activeScreen, 'bodyLen:', bodyHtmlLen);
  console.log('ERRORS:', JSON.stringify(errors, null, 2));
  await page.screenshot({ path: 'C:\\Users\\chunh\\Desktop\\gc-calculator\\tests\\_tmp-check2\\weather-webkit-loggedin.png' }).catch(()=>{});
  await browser.close();
})();
