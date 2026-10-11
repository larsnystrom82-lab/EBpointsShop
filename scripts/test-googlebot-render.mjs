import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const GOOGLEBOT_UA = 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.69 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

async function renderPage(blockApiConfig, outputName) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(GOOGLEBOT_UA);
    await page.setViewport({ width: 412, height: 892, isMobile: true, deviceScaleFactor: 2.625 }); // Standard Googlebot Mobile viewport (Pixel 2/Nexus 5X)

    if (blockApiConfig) {
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (req.url().includes('/api/config')) {
          console.log('[BLOCKED]', req.url());
          req.abort();
        } else {
          req.continue();
        }
      });
    }

    console.log(`Navigating to https://www.poangpiloten.se/ (blockApiConfig: ${blockApiConfig})...`);
    await page.goto('https://www.poangpiloten.se/', { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait a brief moment for any post-render react state
    await new Promise((r) => setTimeout(r, 1500));

    // Capture metrics & text
    const title = await page.title();
    const storeCountText = await page.evaluate(() => {
      const el = document.querySelector('h2, .text-xs.font-semibold, p');
      const body = document.body.innerText;
      const countMatch = body.match(/(\d+)\s+alternativ\s+hittades/i) || body.match(/(\d+)\s+butiker/i);
      const articleCount = document.querySelectorAll('article').length;
      return {
        countMatch: countMatch ? countMatch[0] : null,
        articleCount,
        hasHeader: body.includes('Poängpiloten'),
        hasTelinet: body.includes('Telinet'),
        hasCervera: body.includes('Cervera'),
      };
    });

    console.log(`Results for ${outputName}:`, { title, ...storeCountText });

    const screenshotPath = path.resolve(`scripts/${outputName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`Saved screenshot to ${screenshotPath}`);

    return { title, ...storeCountText, screenshotPath };
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('--- 1. Testing with /api/config BLOCKED (Current robots.txt behavior) ---');
  await renderPage(true, 'googlebot_blocked_api_config');

  console.log('\n--- 2. Testing with /api/config ALLOWED (Desired robots.txt behavior) ---');
  await renderPage(false, 'googlebot_allowed_api_config');
}

main().catch(console.error);
