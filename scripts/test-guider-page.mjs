import puppeteer from 'puppeteer-core';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,1000'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1100, deviceScaleFactor: 2 });

  // 1. Start on home page and click "Guider" link in navbar
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 600));

  const navLinks = await page.$$('nav a');
  let clicked = false;
  for (const link of navLinks) {
    const text = await (await link.getProperty('textContent')).jsonValue();
    if (text && text.trim() === 'Guider') {
      await link.click();
      clicked = true;
      break;
    }
  }
  console.log('Clicked Guider nav link:', clicked);
  await new Promise((r) => setTimeout(r, 800));

  // 2. Verify URL and content on /guider
  const currentUrl = page.url();
  console.log('Current URL after navigation:', currentUrl);

  const pageStats = await page.evaluate(() => {
    const h1 = document.querySelector('h1')?.textContent;
    const articles = Array.from(document.querySelectorAll('article'));
    const guideTitles = articles.map((a) => a.querySelector('h3')?.textContent?.trim());
    const externalLinks = Array.from(document.querySelectorAll('a[href^="https://eurobonusguiden.se"]')).map((a) => a.href);
    return {
      h1,
      totalGuides: articles.length,
      guideTitles: guideTitles.slice(0, 5),
      externalLinksCount: externalLinks.length,
    };
  });
  console.log('Guider page stats:', pageStats);

  const desktopScreenshot =
    'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/guider_page_desktop_verified.png';
  await page.screenshot({ path: desktopScreenshot, fullPage: false });
  console.log('Saved desktop screenshot to:', desktopScreenshot);

  // 3. Test filtering by category: click "Kreditkort & Förmåner"
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const cardBtn = buttons.find((b) => b.textContent && b.textContent.includes('Kreditkort'));
    if (cardBtn) cardBtn.click();
  });
  await new Promise((r) => setTimeout(r, 400));

  const cardStats = await page.evaluate(() => {
    const articles = Array.from(document.querySelectorAll('article'));
    const titles = articles.map((a) => a.querySelector('h3')?.textContent?.trim());
    return { count: articles.length, titles };
  });
  console.log('Category filter (Kreditkort) stats:', cardStats);

  const cardsScreenshot =
    'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/guider_category_cards_verified.png';
  await page.screenshot({ path: cardsScreenshot, fullPage: false });

  // 4. Test Search input: type "SkyTeam"
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const allBtn = buttons.find((b) => b.textContent && b.textContent.includes('Alla guider'));
    if (allBtn) allBtn.click();
  });
  const input = await page.$('input[placeholder*="Sök bland guider"]');
  if (input) {
    await input.type('SkyTeam');
    await new Promise((r) => setTimeout(r, 400));
  }

  const searchStats = await page.evaluate(() => {
    const articles = Array.from(document.querySelectorAll('article'));
    const titles = articles.map((a) => a.querySelector('h3')?.textContent?.trim());
    return { count: articles.length, titles };
  });
  console.log('Search "SkyTeam" stats:', searchStats);

  // 5. Test Mobile viewport
  await page.evaluate(() => {
    const inputEl = document.querySelector('input[placeholder*="Sök bland guider"]');
    if (inputEl) {
      inputEl.value = '';
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await new Promise((r) => setTimeout(r, 500));

  const mobileScreenshot =
    'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/guider_page_mobile_verified.png';
  await page.screenshot({ path: mobileScreenshot, fullPage: false });
  console.log('Saved mobile screenshot to:', mobileScreenshot);

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
