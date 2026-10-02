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
  await new Promise((r) => setTimeout(r, 1200));

  // Extract all text elements mentioning "kontrollerad"
  const elements = await page.$$eval('*', (nodes) => {
    const matches = [];
    for (const node of nodes) {
      if (node.children.length === 0 && node.textContent && node.textContent.toLowerCase().includes('kontrollerad')) {
        matches.push(node.textContent.trim());
      }
    }
    return matches;
  });

  console.log('Found checked timestamps on page:');
  console.log(JSON.stringify(elements, null, 2));

  // Check if any element contains "14:32"
  const has1432 = elements.some((t) => t.includes('14:32'));
  console.log('Contains 14:32:', has1432);

  // Take screenshot
  const screenshotPath =
    'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/timestamp_fix_verified.png';
  await page.screenshot({
    path: screenshotPath,
    fullPage: false,
  });

  console.log('Screenshot saved to:', screenshotPath);

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
