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
  await new Promise(r => setTimeout(r, 1000));

  // Open dropdown
  const triggerSelector = 'button[aria-haspopup="listbox"]';
  await page.waitForSelector(triggerSelector);
  await page.click(triggerSelector);
  await new Promise(r => setTimeout(r, 500));

  // Search for "KitchenTime"
  const searchInput = await page.$('input[placeholder*="Sök butik"]');
  if (searchInput) {
    await searchInput.type('KitchenTime');
    await new Promise(r => setTimeout(r, 500));

    // Find and click on the store button inside dropdown
    const buttons = await page.$$('div[class*="overflow-y-auto"] button');
    console.log(`Found ${buttons.length} store buttons in dropdown`);
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('KitchenTime')) {
        console.log('Clicking store button for KitchenTime:', text.trim());
        await btn.click();
        break;
      }
    }
  }

  await new Promise(r => setTimeout(r, 500));

  // Click "Klar"
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
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/kitchentime_selected_comparison.png',
    fullPage: false,
  });
  console.log('Saved kitchentime_selected_comparison.png');

  // Let's also search and select Adidas (which has both Zupergift & SAS Partner)
  await page.click(triggerSelector);
  await new Promise(r => setTimeout(r, 500));
  
  // Clear selection first
  const clearBtn = await page.$('button[aria-label="Rensa urval"]');
  if (clearBtn) {
    await clearBtn.click();
  } else {
    const rensaAll = await page.$$('button');
    for (const b of rensaAll) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Rensa alla')) {
        await b.click();
        break;
      }
    }
  }
  await new Promise(r => setTimeout(r, 300));

  // Search "Adidas"
  const searchInput2 = await page.$('input[placeholder*="Sök butik"]');
  if (searchInput2) {
    await searchInput2.type('Adidas');
    await new Promise(r => setTimeout(r, 500));

    const buttons = await page.$$('div[class*="overflow-y-auto"] button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Adidas')) {
        console.log('Clicking store button for Adidas:', text.trim());
        await btn.click();
        break;
      }
    }
  }

  await new Promise(r => setTimeout(r, 500));
  const allButtons2 = await page.$$('button');
  for (const b of allButtons2) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.trim() === 'Klar') {
      await b.click();
      break;
    }
  }

  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/adidas_dual_route_comparison.png',
    fullPage: false,
  });
  console.log('Saved adidas_dual_route_comparison.png');

  await browser.close();
}

run().catch(console.error);
