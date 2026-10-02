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

  // 1. Visit homepage
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 800));

  // Remove default categories so we see all stores
  const removeButtons = await page.$$('span[role="button"]');
  for (const btn of removeButtons) {
    await btn.click();
    await new Promise((r) => setTimeout(r, 150));
  }
  await new Promise((r) => setTimeout(r, 600));

  const countBefore = await page.evaluate(() => {
    const h2 = document.querySelector('h2');
    return h2 ? h2.textContent : '';
  });
  console.log('Count before tier filter:', countBefore);

  // 2. Toggle "Nivåpoäng viktiga"
  await page.evaluate(() => {
    const switches = Array.from(document.querySelectorAll('button[role="switch"]'));
    const sw = switches.find((s) => s.parentElement && s.parentElement.textContent.includes('Nivåpoäng'));
    if (sw) sw.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  const countAfter = await page.evaluate(() => {
    const h2 = document.querySelector('h2');
    const sortVal = document.querySelector('select')?.value;
    return { countText: h2 ? h2.textContent : '', sortVal };
  });
  console.log('State after tier filter:', countAfter);

  const tierFilterScreenshot =
    'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/tier_filter_active_verified.png';
  await page.screenshot({ path: tierFilterScreenshot, fullPage: false });
  console.log('Saved tier filter active screenshot to:', tierFilterScreenshot);

  // 3. Search for Adidas to show that Zupergift (0 tier) is filtered out
  const storeTrigger = await page.$('button[aria-haspopup="listbox"]');
  if (storeTrigger) {
    await storeTrigger.click();
    await new Promise((r) => setTimeout(r, 400));
    const searchBox = await page.$('input[placeholder*="Sök butik"]');
    if (searchBox) {
      await searchBox.type('Adidas');
      await new Promise((r) => setTimeout(r, 400));
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const adidasBtn = buttons.find((b) => b.textContent && b.textContent.includes('Adidas'));
        if (adidasBtn) adidasBtn.click();
      });
      await new Promise((r) => setTimeout(r, 400));
    }
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 600));
  }

  const adidasScreenshot =
    'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/tier_filter_adidas_verified.png';
  await page.screenshot({ path: adidasScreenshot, fullPage: false });
  console.log('Saved adidas screenshot to:', adidasScreenshot);

  // 4. Test Cervera (which only has 0 tier points) to see empty state explanation
  // Clear selection first
  const clearBtn = await page.$('button[aria-label="Rensa urval"]');
  if (clearBtn) await clearBtn.click();
  await new Promise((r) => setTimeout(r, 400));

  if (storeTrigger) {
    await storeTrigger.click();
    await new Promise((r) => setTimeout(r, 400));
    const searchBox = await page.$('input[placeholder*="Sök butik"]');
    if (searchBox) {
      await searchBox.type('Cervera');
      await new Promise((r) => setTimeout(r, 400));
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const cerveraBtn = buttons.find((b) => b.textContent && b.textContent.includes('Cervera'));
        if (cerveraBtn) cerveraBtn.click();
      });
      await new Promise((r) => setTimeout(r, 400));
    }
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 600));
  }

  const cerveraScreenshot =
    'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/tier_filter_cervera_empty_state.png';
  await page.screenshot({ path: cerveraScreenshot, fullPage: false });
  console.log('Saved cervera empty state screenshot to:', cerveraScreenshot);

  await browser.close();
}

run().catch(console.error);
