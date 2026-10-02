import puppeteer from 'puppeteer-core';
import fs from 'fs';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  const apiRequests = [];

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('loyaltykey.com') || url.includes('/api/') || url.includes('merchant') || url.includes('stores')) {
      apiRequests.push({
        url,
        status: response.status(),
        contentType: response.headers()['content-type'],
      });
      try {
        const text = await response.text();
        console.log(`[API RESPONSE] ${response.status()} ${url}`);
        if (text.length < 500000) {
          fs.writeFileSync(`./scripts/api-response-${apiRequests.length}.json`, text, 'utf8');
          console.log(`Saved api-response-${apiRequests.length}.json (length: ${text.length})`);
        }
      } catch (e) {
        // Ignore binary or stream
      }
    }
  });

  console.log('Navigating to https://onlineshopping.flysas.com/sv-SE/alla-butiker...');
  await page.goto('https://onlineshopping.flysas.com/sv-SE/alla-butiker', { waitUntil: 'networkidle2', timeout: 30000 });

  console.log('Page loaded! Title:', await page.title());
  
  // Extract rendered merchant cards or store names from the DOM
  const storeNames = await page.evaluate(() => {
    const elements = document.querySelectorAll('a[href*="/sv-SE/"], [class*="merchant"], [class*="store"]');
    return Array.from(elements).map(el => ({
      text: el.innerText.trim(),
      href: el.getAttribute('href'),
      className: el.className
    })).filter(x => x.text && x.href);
  });

  console.log(`Found ${storeNames.length} potential store links in DOM`);
  console.log('Sample links (first 10):', storeNames.slice(0, 10));

  await browser.close();
}

main().catch(console.error);
