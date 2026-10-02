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

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  // Remove existing category pills (click X on Hem & Kök and Elektronik)
  const removeButtons = await page.$$('span[role="button"]');
  for (const btn of removeButtons) {
    await btn.click();
    await new Promise(r => setTimeout(r, 200));
  }

  // Open category dropdown
  const categoryBtn = await page.$('div[class*="relative"] button[type="button"]');
  if (categoryBtn) {
    await categoryBtn.click();
    await new Promise(r => setTimeout(r, 300));

    // Click "Mat & Restaurang"
    const catLabels = await page.$$('div[class*="absolute"] label, div[class*="absolute"] button');
    for (const el of catLabels) {
      const text = await page.evaluate(x => x.textContent, el);
      if (text && text.includes('Mat & Restaurang')) {
        console.log('Selecting category Mat & Restaurang');
        await el.click();
        break;
      }
    }

    // Close category dropdown
    await categoryBtn.click();
  }

  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/category_filter_mat_restaurang.png',
    fullPage: false,
  });
  console.log('Saved category_filter_mat_restaurang.png');

  await browser.close();
}

run().catch(console.error);
