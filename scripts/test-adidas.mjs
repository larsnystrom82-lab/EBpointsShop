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

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));

  // Open dropdown
  const triggerSelector = 'button[aria-haspopup="listbox"]';
  await page.waitForSelector(triggerSelector);
  await page.click(triggerSelector);
  await new Promise(r => setTimeout(r, 400));

  // Search for "Adidas"
  const searchInput = await page.$('input[placeholder*="Sök butik"]');
  if (searchInput) {
    await searchInput.type('Adidas');
    await new Promise(r => setTimeout(r, 400));

    // Find and click on the store button inside dropdown
    const buttons = await page.$$('div[class*="overflow-y-auto"] button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.toLowerCase().includes('adidas')) {
        console.log('Found and clicking Adidas button:', text.trim());
        await btn.click();
        break;
      }
    }
  }

  // Click "Klar"
  const allButtons = await page.$$('button');
  for (const b of allButtons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.trim() === 'Klar') {
      await b.click();
      break;
    }
  }

  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/adidas_comparison_cards.png',
    fullPage: false,
  });
  console.log('Saved adidas_comparison_cards.png');

  await browser.close();
}

run().catch(console.error);
