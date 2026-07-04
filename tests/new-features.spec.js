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
  expect(await page.evaluate(() => localStorage.getItem('uiFontSize'))).toBe('xl');
});

test('font size setting also scales non-chat UI text (system-wide, not chat-only)', async ({ page }) => {
  await page.goto(BASE);
  await page.evaluate(() => {
    localStorage.setItem('registered', '1');
    localStorage.setItem('myId', 'testuser1');
    localStorage.setItem('gatePassedPersist', '1');
    sessionStorage.setItem('testGatePassed', '1');
  });
  await page.reload();
  await page.waitForTimeout(1000);
  await page.evaluate(() => { show('settings'); });
  const before = await page.evaluate(() => getComputedStyle(document.getElementById('set-lang')).fontSize);
  await page.evaluate(() => applyFontSize('xl'));
  const after = await page.evaluate(() => getComputedStyle(document.getElementById('set-lang')).fontSize);
  expect(parseFloat(after)).toBeGreaterThan(parseFloat(before));
});

test('per-chat auto-destruct timer: input parsing, formatting, and local+cloud pruning', async ({ page }) => {
  await page.goto(BASE);
  await page.evaluate(() => {
    localStorage.setItem('registered', '1');
    localStorage.setItem('myId', 'testuser1');
    localStorage.setItem('gatePassedPersist', '1');
    sessionStorage.setItem('testGatePassed', '1');
  });
  await page.reload();
  await page.waitForTimeout(1000);

  const parsed = await page.evaluate(() => ({
    off: _parseDestructInput('off'),
    oneHour: _parseDestructInput('1h'),
    oneDay: _parseDestructInput('1d'),
    sevenDays: _parseDestructInput('7d'),
    thirtyDays: _parseDestructInput('30d'),
    bogus: _parseDestructInput('banana'),
  }));
  expect(parsed).toEqual({ off: 0, oneHour: 3600, oneDay: 86400, sevenDays: 604800, thirtyDays: 2592000, bogus: null });

  expect(await page.evaluate(() => fmtDestructTTL(0))).toBe('Off (kept forever)');
  expect(await page.evaluate(() => fmtDestructTTL(86400))).toBe('1 day');
  expect(await page.evaluate(() => fmtDestructTTL(604800))).toBe('1 week');

  // Stub _sb so this exercises the real enforceDestructTTL/fetchDestructTTL logic
  // without a live Supabase round trip: confirms expired local messages are pruned
  // and the cloud delete call excludes the destruct_cfg config row itself.
  const result = await page.evaluate(async () => {
    const peer = 'peer1';
    const now = Date.now();
    window.G.msgs[peer] = [
      { id: 1, ts: now - 100000000, text: 'old', sent: false },
      { id: 2, ts: now - 1000, text: 'new', sent: false },
    ];
    let deleteCall = null;
    window._sb = {
      from(table) {
        return {
          select() { return this; }, eq() { return this; }, order() { return this; }, limit() { return this; },
          delete() { return this; },
          neq(col, val) { deleteCall = deleteCall || {}; deleteCall.neqType = val; return this; },
          lt(col, val) { deleteCall = deleteCall || {}; deleteCall.lt = val; return Promise.resolve({ data: null, error: null }); },
          maybeSingle() { return Promise.resolve({ data: { content: '3600', created_at: new Date(now - 200000000).toISOString() } }); },
        };
      }
    };
    await enforceDestructTTL(peer);
    return { remaining: window.G.msgs[peer], deleteCall };
  });
  expect(result.remaining.length).toBe(1);
  expect(result.remaining[0].text).toBe('new');
  expect(result.deleteCall.neqType).toBe('destruct_cfg');
});

test('i18n: settings-page language picker also updates login-page data-i18n elements (previously two disconnected systems)', async ({ page }) => {
  await page.goto(BASE);
  await page.evaluate(() => {
    localStorage.setItem('registered', '1');
    localStorage.setItem('myId', 'testuser1');
    localStorage.setItem('gatePassedPersist', '1');
    sessionStorage.setItem('testGatePassed', '1');
  });
  await page.reload();
  await page.waitForTimeout(1000);
  await page.evaluate(() => { pickLang('fr'); });
  const newUserText = await page.evaluate(() => document.querySelector('[data-i18n="newUser"]').textContent);
  expect(newUserText).toBe('Nouvel utilisateur?');
});

test('i18n: register-page language selector also updates settings-screen labels (previously two disconnected systems)', async ({ page }) => {
  await page.goto(BASE);
  await page.evaluate(() => {
    localStorage.setItem('registered', '1');
    localStorage.setItem('myId', 'testuser1');
    localStorage.setItem('gatePassedPersist', '1');
    sessionStorage.setItem('testGatePassed', '1');
  });
  await page.reload();
  await page.waitForTimeout(1000);
  await page.evaluate(() => { setLang('de'); });
  const hideModeText = await page.evaluate(() => document.getElementById('set-hideMode').textContent);
  expect(hideModeText).toBe('Versteckter Modus');
});

test('i18n: languages without full native translation fall back to English, never to leftover Chinese', async ({ page }) => {
  await page.goto(BASE);
  await page.evaluate(() => {
    localStorage.setItem('registered', '1');
    localStorage.setItem('myId', 'testuser1');
    localStorage.setItem('gatePassedPersist', '1');
    sessionStorage.setItem('testGatePassed', '1');
  });
  await page.reload();
  await page.waitForTimeout(1000);
  await page.evaluate(() => { setLang('tr'); });
  const texts = await page.evaluate(() => [
    document.getElementById('set-lang').textContent,
    document.getElementById('set-logout').textContent,
    document.getElementById('set-secretNotif').textContent,
  ]);
  expect(texts.some(t => /[一-鿿]/.test(t))).toBe(false);
  expect(texts[1]).toBe('Logout');
});

test('i18n: chat-list bracket placeholders and empty state render in English, not hardcoded Chinese', async ({ page }) => {
  await page.goto(BASE);
  await page.evaluate(() => {
    localStorage.setItem('registered', '1');
    localStorage.setItem('myId', 'testuser1');
    localStorage.setItem('gatePassedPersist', '1');
    sessionStorage.setItem('testGatePassed', '1');
    localStorage.setItem('lang', 'en');
  });
  await page.reload();
  await page.waitForTimeout(1000);
  const values = await page.evaluate(() => ({
    msgImage: i18nT('msgImage'),
    youPrefix: i18nT('youPrefix'),
    noChatsYet: i18nT('noChatsYet'),
    typingNow: i18nT('typingNow'),
  }));
  expect(values).toEqual({ msgImage: '[Photo]', youPrefix: 'You: ', noChatsYet: 'No chats yet', typingNow: 'typing' });
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
