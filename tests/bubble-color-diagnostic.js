const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
  fs.mkdirSync('screenshots', { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('console.error: ' + msg.text()); });
  page.on('dialog', d => d.dismiss());

  await page.goto('http://localhost:8877/index.html');
  await page.waitForTimeout(1000);

  // Bypass registration/login so we land straight in the main app shell.
  await page.evaluate(() => {
    localStorage.setItem('registered', '1');
    localStorage.setItem('myId', 'testuser1');
    localStorage.setItem('gatePassedPersist', '1');
    sessionStorage.setItem('testGatePassed', '1');
  });
  await page.reload();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'screenshots/01-after-bypass.png' });

  // Inject a fake sent + received bubble directly into the chat screen so we
  // can inspect real computed CSS without needing a live conversation.
  await page.evaluate(() => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('chat').classList.add('active');
    document.getElementById('chatMsgs').innerHTML =
      '<div class="mr s"><div class="bub">Sent test message</div></div>' +
      '<div class="mr r"><div class="bub">Received test message</div></div>';
  });
  await page.screenshot({ path: 'screenshots/02-fake-chat-default.png' });

  const readBubbleColors = () => page.evaluate(() => {
    const sent = document.querySelector('.mr.s .bub');
    const recv = document.querySelector('.mr.r .bub');
    const sentCS = getComputedStyle(sent);
    const recvCS = getComputedStyle(recv);
    return {
      sentBg: sentCS.backgroundImage !== 'none' ? sentCS.backgroundImage : sentCS.backgroundColor,
      recvBg: recvCS.backgroundColor,
      chatClass: document.getElementById('chat').className,
    };
  });

  const before = await readBubbleColors();
  console.log('RESULT before (default style):', JSON.stringify(before));

  await page.evaluate(() => { applyChatStyle('rose'); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'screenshots/03-fake-chat-rose.png' });
  const afterRose = await readBubbleColors();
  console.log('RESULT after applyChatStyle(rose):', JSON.stringify(afterRose));

  await page.evaluate(() => { applyChatStyle('sky'); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'screenshots/04-fake-chat-sky.png' });
  const afterSky = await readBubbleColors();
  console.log('RESULT after applyChatStyle(sky):', JSON.stringify(afterSky));

  console.log('CHANGED default->rose:', before.sentBg !== afterRose.sentBg, '| recv:', before.recvBg !== afterRose.recvBg);
  console.log('CHANGED rose->sky:', afterRose.sentBg !== afterSky.sentBg, '| recv:', afterRose.recvBg !== afterSky.recvBg);
  console.log('localStorage chatStyle:', await page.evaluate(() => localStorage.getItem('chatStyle')));

  // Now the REAL UI path: open Settings, click an actual swatch in #chatStyleGrid.
  await page.evaluate(() => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('settings').classList.add('active');
    if (typeof _buildChatStyleGrid === 'function') _buildChatStyleGrid();
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'screenshots/05-settings-chatstylegrid.png' });

  const swatchCount = await page.locator('#chatStyleGrid > div').count();
  console.log('chatStyleGrid swatch count:', swatchCount);

  await page.locator('#chatStyleGrid > div').nth(1).click();
  await page.waitForTimeout(300);
  const styleAfterClick = await page.evaluate(() => localStorage.getItem('chatStyle'));
  console.log('chatStyle in localStorage after clicking swatch #1:', styleAfterClick);

  await page.evaluate(() => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('chat').classList.add('active');
  });
  await page.waitForTimeout(200);
  const afterClickBubble = await readBubbleColors();
  console.log('RESULT bubble after clicking real settings swatch:', JSON.stringify(afterClickBubble));
  await page.screenshot({ path: 'screenshots/06-chat-after-settings-click.png' });

  console.log('PAGE/CONSOLE ERRORS:', JSON.stringify(errors, null, 2));

  await browser.close();
})();
