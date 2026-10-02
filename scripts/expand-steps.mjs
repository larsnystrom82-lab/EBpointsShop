import puppeteer from 'puppeteer-core';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,1100'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1100, deviceScaleFactor: 2 });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  // Select Adidas
  const triggerSelector = 'button[aria-haspopup="listbox"]';
  await page.click(triggerSelector);
  await new Promise(r => setTimeout(r, 300));
  const searchInput = await page.$('input[placeholder*="Sök butik"]');
  await searchInput.type('Adidas');
  await new Promise(r => setTimeout(r, 300));
  const buttons = await page.$$('div[class*="overflow-y-auto"] button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.toLowerCase().includes('adidas')) {
      await btn.click();
      break;
    }
  }
  const allButtons = await page.$$('button');
  for (const b of allButtons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.trim() === 'Klar') {
      await b.click();
      break;
    }
  }

  await new Promise(r => setTimeout(r, 800));

  // Expand both cards
  const stepToggles = await page.$$('button');
  for (const toggle of stepToggles) {
    const text = await page.evaluate(el => el.textContent, toggle);
    if (text && (text.includes('2 steg') || text.includes('3 steg'))) {
      await toggle.click();
    }
  }

  await new Promise(r => setTimeout(r, 500));

  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/adidas_expanded_steps.png',
    fullPage: false,
  });
  console.log('Saved adidas_expanded_steps.png');

  await browser.close();
}

run().catch(console.error);
