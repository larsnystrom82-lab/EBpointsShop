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
  await new Promise((r) => setTimeout(r, 600));

  // Turn on Nivåpoäng switch
  await page.evaluate(() => {
    const switches = Array.from(document.querySelectorAll('button[role="switch"]'));
    const sw = switches.find((s) => s.parentElement && s.parentElement.textContent.includes('Nivåpoäng'));
    if (sw) sw.click();
  });
  await new Promise((r) => setTimeout(r, 400));

  // Open store dropdown and select Cervera
  const storeTrigger = await page.$('button[aria-haspopup="listbox"]');
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

  const p = 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/tier_filter_cervera_empty_state.png';
  await page.screenshot({ path: p });
  console.log('Saved to', p);
  await browser.close();
}

run().catch(console.error);
