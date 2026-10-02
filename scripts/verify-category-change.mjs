import puppeteer from 'puppeteer-core';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,1000'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000, deviceScaleFactor: 2 });

  // 1. Check Admin Portal
  console.log('1. Checking Admin Portal Zupergift tab for McDonalds...');
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle2' });

  const passwordInput = await page.$('input[type="password"]');
  if (passwordInput) {
    await passwordInput.type('eurobonus2026');
    const submitBtn = await page.$('button[type="submit"]');
    await submitBtn.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  }

  await new Promise(r => setTimeout(r, 800));

  // Search for "McDonald"
  const searchInput = await page.$('input[placeholder*="Sök bland Zupergift-butiker"]');
  if (searchInput) {
    await searchInput.type('McDonald');
    await new Promise(r => setTimeout(r, 600));
  }

  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/admin_mcdonalds_category.png',
    fullPage: false,
  });
  console.log('Saved admin_mcdonalds_category.png');

  // 2. Check Main Page for McDonalds card
  console.log('2. Checking Main Page for McDonalds card...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  // Open store dropdown
  const triggerSelector = 'button[aria-haspopup="listbox"]';
  await page.waitForSelector(triggerSelector);
  await page.click(triggerSelector);
  await new Promise(r => setTimeout(r, 400));

  const storeSearchInput = await page.$('input[placeholder*="Sök butik"]');
  if (storeSearchInput) {
    await storeSearchInput.type('McDonald');
    await new Promise(r => setTimeout(r, 500));

    const buttons = await page.$$('div[class*="overflow-y-auto"] button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.toLowerCase().includes('mcdonald')) {
        console.log('Clicking McDonalds button:', text.trim());
        await btn.click();
        break;
      }
    }
  }

  // Click Klar
  const allButtons = await page.$$('button');
  for (const b of allButtons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.trim() === 'Klar') {
      await b.click();
      break;
    }
  }

  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/mcdonalds_category_fixed.png',
    fullPage: false,
  });
  console.log('Saved mcdonalds_category_fixed.png');

  await browser.close();
  console.log('Category verification finished!');
}

run().catch(console.error);
