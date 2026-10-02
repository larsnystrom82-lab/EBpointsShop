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

  // Desktop full page
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  // Open instructions on first result card
  const instructionButtons = await page.$$('button');
  for (const btn of instructionButtons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('Visa instruktion')) {
      await btn.click();
      break;
    }
  }

  await new Promise(r => setTimeout(r, 400));

  await page.screenshot({
    path: path.join(artifactDir, 'desktop_instructions_expanded.png'),
    fullPage: false,
  });

  // Mobile results view (scrolled to results)
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    window.scrollTo(0, 1100);
  });
  await new Promise(r => setTimeout(r, 400));

  await page.screenshot({
    path: path.join(artifactDir, 'mobile_results_view.png'),
    fullPage: false,
  });

  await browser.close();
  console.log('Additional interactive screenshots captured successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
