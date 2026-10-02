import puppeteer from 'puppeteer-core';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,1000'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });

  console.log('1. Navigating to Admin Portal...');
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle2' });

  // Check if login needed
  const passwordInput = await page.$('input[type="password"]');
  if (passwordInput) {
    console.log('Logging in to admin...');
    await passwordInput.type('eurobonus2026');
    const submitBtn = await page.$('button[type="submit"]');
    await submitBtn.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  }

  await new Promise(r => setTimeout(r, 1000));

  // Click on "Butiker & Partnerregler" tab
  console.log('Switching to Butiker & Partnerregler tab...');
  const tabs = await page.$$('button');
  for (const tab of tabs) {
    const text = await page.evaluate(el => el.textContent, tab);
    if (text && text.includes('Butiker & Partnerregler')) {
      await tab.click();
      break;
    }
  }

  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/admin_partner_stores.png',
    fullPage: false,
  });
  console.log('Admin screenshot saved: admin_partner_stores.png');

  // 2. Go to Main Page
  console.log('2. Navigating to Main Page...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  // Open store dropdown
  const storeSelectorBtn = await page.$('button[aria-expanded]');
  if (storeSelectorBtn) {
    await storeSelectorBtn.click();
    await new Promise(r => setTimeout(r, 500));

    // Type "Adidas" into dropdown search
    const searchInputs = await page.$$('input[type="text"]');
    let dropdownSearch = null;
    for (const input of searchInputs) {
      const placeholder = await page.evaluate(el => el.placeholder, input);
      if (placeholder && placeholder.includes('Sök bland alla')) {
        dropdownSearch = input;
        break;
      }
    }

    if (dropdownSearch) {
      await dropdownSearch.type('Adidas');
      await new Promise(r => setTimeout(r, 500));
      
      // Select Adidas checkbox
      const checkboxes = await page.$$('input[type="checkbox"]');
      for (const cb of checkboxes) {
        const parentText = await page.evaluate(el => el.closest('label')?.textContent, cb);
        if (parentText && parentText.includes('Adidas')) {
          await cb.click();
          break;
        }
      }
      
      // Close dropdown by clicking header or outside
      await storeSelectorBtn.click();
      await new Promise(r => setTimeout(r, 800));
    }
  }

  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/desktop_adidas_comparison.png',
    fullPage: false,
  });
  console.log('Desktop comparison screenshot saved: desktop_adidas_comparison.png');

  await browser.close();
  console.log('Verification finished successfully!');
}

run().catch(console.error);
