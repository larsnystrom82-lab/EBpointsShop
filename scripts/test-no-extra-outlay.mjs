import puppeteer from 'puppeteer-core';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1000));

  // Open store dropdown
  const storeTrigger = await page.$('button[aria-haspopup="listbox"]');
  if (storeTrigger) {
    await storeTrigger.click();
    await new Promise((r) => setTimeout(r, 400));

    const searchBox = await page.$('input[placeholder*="Sök butik"]');
    if (searchBox) {
      await searchBox.type('AG1');
      await new Promise((r) => setTimeout(r, 400));

      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const ag1Btn = buttons.find((b) => b.textContent && b.textContent.includes('AG1'));
        if (ag1Btn) ag1Btn.click();
      });
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  // Close dropdown
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 600));

  const screenshotPath =
    'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/ag1_without_extra_outlay.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Saved screenshot to:', screenshotPath);

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
