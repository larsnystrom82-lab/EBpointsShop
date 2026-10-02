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

  // Toggle "Endast kampanjer"
  await page.evaluate(() => {
    const switches = Array.from(document.querySelectorAll('button[role="switch"]'));
    const sw = switches.find((s) => s.parentElement && s.parentElement.textContent.includes('kampanjer'));
    if (sw) sw.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  const stats = await page.evaluate(() => {
    const h2 = document.querySelector('h2')?.textContent;
    const cards = Array.from(document.querySelectorAll('article')).map((a) => {
      const title = a.querySelector('h3, div')?.textContent || '';
      const hasKampanjBadge = Array.from(a.querySelectorAll('span')).some((s) => s.textContent === 'Kampanj');
      return { title: title.slice(0, 30), hasKampanjBadge };
    });
    return { h2, cardCount: cards.length, allHaveBadge: cards.every((c) => c.hasKampanjBadge) };
  });
  console.log('Campaign filter test stats:', stats);

  const screenshotPath =
    'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/campaign_filter_active_verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Saved campaign filter screenshot to:', screenshotPath);

  // Test mobile viewport
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await new Promise((r) => setTimeout(r, 500));
  const mobileScreenshot =
    'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/campaign_filter_mobile_verified.png';
  await page.screenshot({ path: mobileScreenshot, fullPage: false });
  console.log('Saved mobile screenshot to:', mobileScreenshot);

  await browser.close();
}

run().catch(console.error);
