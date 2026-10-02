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

  // 1. Check Main Page with Factor specifically
  console.log('Testing main page with Factor...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1000));

  // Open store dropdown
  const storeTrigger = await page.$('button[aria-haspopup="listbox"]');
  if (storeTrigger) {
    await storeTrigger.click();
    await new Promise((r) => setTimeout(r, 500));

    const searchBox = await page.$('input[placeholder*="Sök butik"]');
    if (searchBox) {
      await searchBox.type('Factor');
      await new Promise((r) => setTimeout(r, 500));

      // Click on the Factor option
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const factorBtn = buttons.find((b) => b.textContent && b.textContent.includes('Factor'));
        if (factorBtn) factorBtn.click();
      });
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // Close dropdown
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 800));

  // Expand the first card to show instructions and banner
  const expandBtn = await page.$('article button');
  if (expandBtn) {
    await expandBtn.click();
    await new Promise((r) => setTimeout(r, 500));
  }

  const factorScreenshotPath =
    'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/factor_main_page_verified.png';
  await page.screenshot({ path: factorScreenshotPath, fullPage: false });
  console.log('Saved Factor main page screenshot to:', factorScreenshotPath);

  // 2. Check Admin Portal
  console.log('Testing admin portal...');
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 800));

  // If login form is present, login
  const passInput = await page.$('input[type="password"]');
  if (passInput) {
    await passInput.type('eurobonus2026');
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) await submitBtn.click();
    await new Promise((r) => setTimeout(r, 1200));
  }

  // Click on "Butiker & Partnerregler" tab
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.textContent && b.textContent.includes('Butiker & Partnerregler'));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  // Search for Factor in admin
  const adminSearch = await page.$('input[placeholder*="Sök bland butiker"]');
  if (adminSearch) {
    await adminSearch.type('Factor');
    await new Promise((r) => setTimeout(r, 600));
  }

  const adminScreenshotPath =
    'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/factor_admin_verified.png';
  await page.screenshot({ path: adminScreenshotPath, fullPage: false });
  console.log('Saved Factor admin screenshot to:', adminScreenshotPath);

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
