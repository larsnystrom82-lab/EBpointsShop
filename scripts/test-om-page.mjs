import puppeteer from 'puppeteer-core';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,1000'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  // 1. Visit Home and click "Om"
  console.log('Navigating to home page...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  console.log('Clicking "Om" link in navbar...');
  const omLink = await page.$('a[href="/om"]');
  if (!omLink) {
    throw new Error('Could not find /om link in navbar');
  }
  await omLink.click();
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  const currentUrl = page.url();
  console.log('Current URL after navigation:', currentUrl);
  if (!currentUrl.includes('/om')) {
    throw new Error(`Expected URL to contain /om but got ${currentUrl}`);
  }

  // 2. Check active state on "Om" link
  const omActive = await page.evaluate(() => {
    const link = document.querySelector('nav a[href="/om"]');
    return link ? link.classList.contains('text-blue-600') && link.classList.contains('border-b-2') : false;
  });
  console.log('Navbar "Om" active styling present:', omActive);
  if (!omActive) {
    throw new Error('Navbar Om link did not receive active border and text styling');
  }

  // 3. Check page contents
  const pageCheck = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    return {
      hasHero: bodyText.includes('Om bonuslotsen.se'),
      hasSyfte: bodyText.includes('Vad är syftet med bonuslotsen.se?'),
      hasVillkorHeading: bodyText.includes('Kontrollera alltid villkoren hos butiken och SAS'),
      hasChecklist: bodyText.includes('Checklista: Detta måste du kontrollera före varje köp'),
      hasUndantag: bodyText.includes('Undantagna varor och kategorier'),
      hasEngang: bodyText.includes('Engångsbonus vs löpande poäng'),
      hasCookies: bodyText.includes('Cookies, adblockers och spårning'),
      hasRabattkoder: bodyText.includes('Rabattkoder och kuponger'),
      hasKortVillkor: bodyText.includes('Betalkortets villkor'),
      hasDisclaimer: bodyText.includes('Oberoende och ansvarsfriskrivning'),
      hasFooter: bodyText.includes('100 % oberoende och kostnadsfri tjänst'),
    };
  });
  console.log('Page checks:', JSON.stringify(pageCheck, null, 2));

  for (const [key, passed] of Object.entries(pageCheck)) {
    if (!passed) {
      throw new Error(`Page check failed for: ${key}`);
    }
  }

  // Screenshot 1: Desktop top view (Hero & Purpose)
  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/om_page_desktop_hero.png',
  });
  console.log('Saved om_page_desktop_hero.png');

  // Scroll to villkor section
  await page.evaluate(() => {
    document.getElementById('villkor')?.scrollIntoView();
  });
  await new Promise((r) => setTimeout(r, 600));

  // Screenshot 2: Villkor & Checklist section
  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/om_page_desktop_villkor.png',
  });
  console.log('Saved om_page_desktop_villkor.png');

  // Screenshot 3: Mobile view
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 500));

  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/om_page_mobile_hero.png',
  });
  console.log('Saved om_page_mobile_hero.png');

  // Scroll to villkor on mobile
  await page.evaluate(() => {
    document.getElementById('villkor')?.scrollIntoView();
  });
  await new Promise((r) => setTimeout(r, 500));

  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/om_page_mobile_villkor.png',
  });
  console.log('Saved om_page_mobile_villkor.png');

  await browser.close();
  console.log('All tests and screenshots completed successfully!');
}

run().catch((err) => {
  console.error('Test script failed:', err);
  process.exit(1);
});
