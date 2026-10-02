import puppeteer from 'puppeteer-core';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1000));

  // Find store dropdown and select Cervera
  const storeTrigger = await page.$('button#store-dropdown-trigger');
  if (storeTrigger) {
    await storeTrigger.click();
    await new Promise((r) => setTimeout(r, 400));

    const searchBox = await page.$('input[placeholder*="Sök butik"]');
    if (searchBox) {
      await searchBox.type('Cervera');
      await new Promise((r) => setTimeout(r, 400));

      const cerveraRow = await page.$('button[role="option"]');
      if (cerveraRow) {
        await cerveraRow.click();
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  }

  // Close dropdown if open
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 600));

  const texts = await page.$$eval('*', (nodes) => {
    return nodes
      .filter((n) => n.children.length === 0 && n.textContent && n.textContent.includes('Senast kontrollerad'))
      .map((n) => n.textContent.trim());
  });

  console.log('Checked timestamps on page:', texts);

  const screenshotPath =
    'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/cervera_timestamp_verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Saved screenshot to:', screenshotPath);

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
