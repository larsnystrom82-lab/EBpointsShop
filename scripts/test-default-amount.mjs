import puppeteer from 'puppeteer-core';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,1000'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });

  // 1. Visit root "/"
  console.log('Navigating to root "/"...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 600));

  // Check amount input value
  const amountInputValue = await page.$eval('input[placeholder="100 kr"]', (el) => el.value);
  console.log('Amount input value on load:', amountInputValue);
  if (amountInputValue !== '100 kr') {
    throw new Error(`Expected input value to be "100 kr", got "${amountInputValue}"`);
  }

  // Check results subtitle
  const subtitleText = await page.evaluate(() => {
    const subtitle = document.querySelector('main h2 + p');
    return subtitle ? subtitle.textContent : '';
  });
  console.log('Results subtitle text:', subtitleText);
  if (!subtitleText.includes('100 kr')) {
    throw new Error(`Expected subtitle to include "100 kr", got "${subtitleText}"`);
  }

  // Capture screenshot of default 100 kr
  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/default_amount_100kr_verified.png',
  });
  console.log('Saved default_amount_100kr_verified.png');

  // 2. Test user testing another amount, e.g. 2 500 kr
  console.log('Changing amount to 2 500 kr...');
  await page.focus('input[placeholder="100 kr"]');
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('2500');
  await new Promise((r) => setTimeout(r, 600));

  const updatedSubtitle = await page.evaluate(() => {
    const subtitle = document.querySelector('main h2 + p');
    return subtitle ? subtitle.textContent : '';
  });
  const normalizedSubtitle = updatedSubtitle.replace(/\u00a0/g, ' ');
  console.log('Results subtitle text after changing to 2500:', normalizedSubtitle);
  if (!normalizedSubtitle.includes('2 500 kr')) {
    throw new Error(`Expected subtitle to include "2 500 kr", got "${normalizedSubtitle}"`);
  }

  // Capture screenshot of updated amount 2 500 kr
  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/custom_amount_2500kr_verified.png',
  });
  console.log('Saved custom_amount_2500kr_verified.png');

  await browser.close();
  console.log('All default and custom amount tests passed successfully!');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
