// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:8877/index.html';

async function bypassLoginAndFakeChat(page) {
  await page.goto(BASE);
  await page.evaluate(() => {
    localStorage.setItem('registered', '1');
    localStorage.setItem('myId', 'testuser1');
    localStorage.setItem('gatePassedPersist', '1');
    sessionStorage.setItem('testGatePassed', '1');
  });
  await page.reload();
  await page.waitForTimeout(1200);
}

function goToSettings(page) {
  return page.evaluate(() => { show('settings'); });
}

function goToFakeChat(page) {
  return page.evaluate(() => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('chat').classList.add('active');
    document.getElementById('chatMsgs').innerHTML =
      '<div class="mr s"><div class="bub">Sent</div></div>' +
      '<div class="mr r"><div class="bub">Received</div></div>';
  });
}

function bubbleColors(page) {
  return page.evaluate(() => {
    const sent = document.querySelector('.mr.s .bub');
    const recv = document.querySelector('.mr.r .bub');
    const sentCS = getComputedStyle(sent);
    return {
      sentBg: sentCS.backgroundImage !== 'none' ? sentCS.backgroundImage : sentCS.backgroundColor,
      recvBg: getComputedStyle(recv).backgroundColor,
    };
  });
}

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (e) => { throw new Error('Uncaught page error: ' + e.message); });
});

test('bubble style picker actually changes rendered bubble colors', async ({ page }) => {
  await bypassLoginAndFakeChat(page);
  await goToFakeChat(page);

  const before = await bubbleColors(page);
  await page.evaluate(() => applyChatStyle('rose'));
  await page.waitForTimeout(500); // .bub has `transition:background .45s ease` - let it settle
  const afterRose = await bubbleColors(page);
  expect(afterRose.sentBg).not.toBe(before.sentBg);
  expect(afterRose.recvBg).not.toBe(before.recvBg);

  await page.evaluate(() => applyChatStyle('sky'));
  await page.waitForTimeout(500);
  const afterSky = await bubbleColors(page);
  expect(afterSky.sentBg).not.toBe(afterRose.sentBg);
});

test('clicking a real swatch in Settings updates the live chat bubble', async ({ page }) => {
  await bypassLoginAndFakeChat(page);
  await goToSettings(page);

  // drawer starts collapsed
  await expect(page.locator('#chatStyleDrawer')).toBeHidden();

  await page.locator('text=聊天气泡风格').click();
  await expect(page.locator('#chatStyleDrawer')).toBeVisible();
  const swatchCount = await page.locator('#chatStyleGrid > div').count();
  expect(swatchCount).toBe(8);

  // _CS_STYLES order: default(0), warm(1), rose(2), sky(3), matcha(4), lavender(5), night(6), coral(7)
  await page.locator('#chatStyleGrid > div').nth(3).click(); // 'sky'
  const saved = await page.evaluate(() => localStorage.getItem('chatStyle'));
  expect(saved).toBe('sky');

  // auto-collapses after picking
  await expect(page.locator('#chatStyleDrawer')).toBeHidden();
  await expect(page.locator('#chatStyleCurrentName')).toHaveText('天蓝');

  await goToFakeChat(page);
  await page.waitForTimeout(500); // let the background-color transition settle
  const colors = await bubbleColors(page);
  expect(colors.sentBg).toContain('184, 216, 248'); // cs-sky sent gradient start color
});

test('push notification toggle row does not throw (regression for togglePushDirect/updatePushToggleUI)', async ({ page }) => {
  await bypassLoginAndFakeChat(page);
  await goToSettings(page);
  await page.locator('#pushDirectToggle').click();
  // no pageerror thrown (enforced by beforeEach listener) = pass
});
