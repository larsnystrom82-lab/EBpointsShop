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

  // 1. Check 'all' state count
  const allStats = await page.evaluate(() => {
    const h2 = document.querySelector('h2')?.textContent;
    return { h2 };
  });
  console.log('1. All filter state:', allStats);

  // 2. Click 'Endast' button in Engångsbonus filter
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const onlyBtn = buttons.find((b) => b.textContent && b.textContent.includes('Endast') && !b.textContent.includes('kampanjer'));
    if (onlyBtn) onlyBtn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  const onlyStats = await page.evaluate(() => {
    const h2 = document.querySelector('h2')?.textContent;
    const badgePresent = document.body.textContent.includes('Endast engångsbonusar');
    const articles = Array.from(document.querySelectorAll('article'));
    const cardData = articles.map((a) => {
      const title = a.querySelector('h3, div')?.textContent?.trim() || '';
      const hasOneTimeBadge = Array.from(a.querySelectorAll('span')).some((s) => s.textContent.includes('Engångsbonus'));
      return { title: title.slice(0, 30), hasOneTimeBadge };
    });
    return {
      h2,
      badgePresent,
      totalCards: cardData.length,
      allHaveOneTimeBadge: cardData.every((c) => c.hasOneTimeBadge),
      samples: cardData.slice(0, 5),
    };
  });
  console.log('2. Only filter state:', onlyStats);

  const screenshotOnly =
    'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/onetime_filter_only_verified.png';
  await page.screenshot({ path: screenshotOnly, fullPage: false });
  console.log('Saved only screenshot to:', screenshotOnly);

  // 3. Click 'Exkludera' button in Engångsbonus filter
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const excludeBtn = buttons.find((b) => b.textContent && b.textContent.trim() === 'Exkludera');
    if (excludeBtn) excludeBtn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  const excludeStats = await page.evaluate(() => {
    const h2 = document.querySelector('h2')?.textContent;
    const badgePresent = document.body.textContent.includes('Exkluderat engångsbonusar');
    const articles = Array.from(document.querySelectorAll('article'));
    const anyHasOneTimeBadge = articles.some((a) => {
      return Array.from(a.querySelectorAll('span')).some((s) => s.textContent.includes('Engångsbonus'));
    });
    return {
      h2,
      badgePresent,
      totalCards: articles.length,
      anyHasOneTimeBadge,
    };
  });
  console.log('3. Exclude filter state:', excludeStats);

  const screenshotExclude =
    'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/onetime_filter_exclude_verified.png';
  await page.screenshot({ path: screenshotExclude, fullPage: false });
  console.log('Saved exclude screenshot to:', screenshotExclude);

  // 4. Test mobile view on 'only'
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const onlyBtn = buttons.find((b) => b.textContent && b.textContent.includes('Endast') && !b.textContent.includes('kampanjer'));
    if (onlyBtn) onlyBtn.click();
  });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await new Promise((r) => setTimeout(r, 500));

  const mobileScreenshot =
    'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/onetime_filter_mobile_verified.png';
  await page.screenshot({ path: mobileScreenshot, fullPage: false });
  console.log('Saved mobile screenshot to:', mobileScreenshot);

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
