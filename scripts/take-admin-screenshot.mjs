import puppeteer from 'puppeteer-core';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\larsn\\.gemini\\antigravity\\brain\\2d148995-581c-49fb-9a49-d1d9f7691112';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle0' });

  // Type password
  await page.type('input[type="password"]', 'eurobonus2026');
  await page.click('button[type="submit"]');

  // Wait for dashboard to load
  await page.waitForSelector('button:has-text("Zupergift")', { timeout: 5000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1000));

  await page.screenshot({
    path: path.join(artifactDir, 'admin_portal_preview.png'),
    fullPage: false,
  });

  await browser.close();
  console.log('Admin portal screenshot captured successfully!');
}

main().catch(console.error);
