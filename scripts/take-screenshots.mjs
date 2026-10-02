import puppeteer from 'puppeteer-core';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\larsn\\.gemini\\antigravity\\brain\\2d148995-581c-49fb-9a49-d1d9f7691112';

async function main() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Desktop View
  console.log('Capturing Desktop view...');
  await page.setViewport({ width: 1280, height: 1100, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await page.screenshot({
    path: path.join(artifactDir, 'desktop_view.png'),
    fullPage: false,
  });

  // Mobile View
  console.log('Capturing Mobile view...');
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await page.screenshot({
    path: path.join(artifactDir, 'mobile_view.png'),
    fullPage: false,
  });

  await browser.close();
  console.log('Screenshots captured successfully!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
