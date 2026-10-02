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

  // Remove default category pills to see all stores
  const removeButtons = await page.$$('span[role="button"]');
  for (const btn of removeButtons) {
    await btn.click();
    await new Promise((r) => setTimeout(r, 150));
  }
  await new Promise((r) => setTimeout(r, 500));

  // 1. Initial state (Visa partnerbutiker: ON)
  const initialStats = await page.evaluate(() => {
    const h2 = document.querySelector('h2')?.textContent;
    return { h2 };
  });
  console.log('1. Initial state (with partner stores):', initialStats);

  // 2. Toggle OFF "Visa partnerbutiker"
  await page.evaluate(() => {
    const switches = Array.from(document.querySelectorAll('button[role="switch"]'));
    const partnerSwitch = switches.find((s) => s.parentElement && s.parentElement.textContent.includes('partnerbutiker'));
    if (partnerSwitch) partnerSwitch.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  const partnerOffStats = await page.evaluate(() => {
    const h2 = document.querySelector('h2')?.textContent;
    const badgePresent = document.body.textContent.includes('Partnerbutiker dolda');
    const articles = Array.from(document.querySelectorAll('article'));
    const routes = articles.map((a) => {
      const text = a.textContent || '';
      const isDirectPartner = text.includes('SAS Online Shopping →') && !text.includes('Zupergift');
      return { isDirectPartner, snippet: text.slice(0, 50) };
    });
    return {
      h2,
      badgePresent,
      totalCards: articles.length,
      anyDirectPartner: routes.some((r) => r.isDirectPartner),
    };
  });
  console.log('2. Partner stores OFF:', partnerOffStats);

  const screenshotOff =
    'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/partner_filter_off_verified.png';
  await page.screenshot({ path: screenshotOff, fullPage: false });
  console.log('Saved partner off screenshot to:', screenshotOff);

  // 3. Toggle OFF "Visa presentkort" as well -> Empty state
  await page.evaluate(() => {
    const switches = Array.from(document.querySelectorAll('button[role="switch"]'));
    const giftSwitch = switches.find((s) => s.parentElement && s.parentElement.textContent.includes('presentkort'));
    if (giftSwitch) giftSwitch.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  const emptyStats = await page.evaluate(() => {
    const heading = document.querySelector('h3')?.textContent;
    const body = document.querySelector('main')?.textContent;
    return { heading, hasText: body?.includes('Både partnerbutiker och presentkort är dolda') };
  });
  console.log('3. Both OFF empty state:', emptyStats);

  const screenshotEmpty =
    'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/partner_and_giftcard_off_empty_state.png';
  await page.screenshot({ path: screenshotEmpty, fullPage: false });
  console.log('Saved empty state screenshot to:', screenshotEmpty);

  // 4. Toggle "Visa partnerbutiker" back ON
  await page.evaluate(() => {
    const switches = Array.from(document.querySelectorAll('button[role="switch"]'));
    const partnerSwitch = switches.find((s) => s.parentElement && s.parentElement.textContent.includes('partnerbutiker'));
    if (partnerSwitch) partnerSwitch.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  const restoredStats = await page.evaluate(() => {
    const h2 = document.querySelector('h2')?.textContent;
    return { h2 };
  });
  console.log('4. Partner stores restored:', restoredStats);

  // 5. Test mobile viewport
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await new Promise((r) => setTimeout(r, 500));
  const mobileScreenshot =
    'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/partner_filter_mobile_verified.png';
  await page.screenshot({ path: mobileScreenshot, fullPage: false });
  console.log('Saved mobile screenshot to:', mobileScreenshot);

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
