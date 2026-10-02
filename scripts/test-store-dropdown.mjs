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
  await page.setViewport({ width: 1280, height: 950, deviceScaleFactor: 2 });

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  // 1. Initial State: Click store dropdown button
  console.log('Finding store dropdown trigger button...');
  const triggerSelector = 'button[aria-haspopup="listbox"]';
  await page.waitForSelector(triggerSelector);
  
  const initialText = await page.$eval(triggerSelector, el => el.innerText);
  console.log('Initial trigger text:', initialText);

  // Click to open dropdown
  await page.click(triggerSelector);
  await new Promise(r => setTimeout(r, 400));

  // Take screenshot of open dropdown with initial list
  await page.screenshot({
    path: path.join(artifactDir, 'store_dropdown_initial_open.png'),
    fullPage: false,
  });
  console.log('Saved store_dropdown_initial_open.png');

  // 2. Search for "cervera" and check it
  const searchInputSelector = 'input[placeholder*="Sök butik"]';
  await page.type(searchInputSelector, 'cervera');
  await new Promise(r => setTimeout(r, 300));

  // Click the Cervera item in the dropdown
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const cerveraBtn = buttons.find(b => b.innerText.includes('Cervera'));
    if (cerveraBtn) cerveraBtn.click();
  });
  console.log('Checked Cervera');
  await new Promise(r => setTimeout(r, 300));

  // 3. Clear search and search for "ikea"
  await page.click('button[aria-label="Rensa sökning"]');
  await new Promise(r => setTimeout(r, 200));
  await page.type(searchInputSelector, 'ikea');
  await new Promise(r => setTimeout(r, 300));

  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const ikeaBtn = buttons.find(b => b.innerText.includes('IKEA'));
    if (ikeaBtn) ikeaBtn.click();
  });
  console.log('Checked IKEA');
  await new Promise(r => setTimeout(r, 300));

  // 4. Search for "stadium"
  await page.click('button[aria-label="Rensa sökning"]');
  await new Promise(r => setTimeout(r, 200));
  await page.type(searchInputSelector, 'stadium');
  await new Promise(r => setTimeout(r, 300));

  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const stadiumBtn = buttons.find(b => b.innerText.includes('Stadium') && !b.innerText.includes('Outlet'));
    if (stadiumBtn) stadiumBtn.click();
  });
  console.log('Checked Stadium');
  await new Promise(r => setTimeout(r, 300));

  // 5. Clear search query using the clear button so we see all selected stores pinned at the top!
  await page.click('button[aria-label="Rensa sökning"]');
  await new Promise(r => setTimeout(r, 400));

  await page.screenshot({
    path: path.join(artifactDir, 'store_dropdown_selected_top.png'),
    fullPage: false,
  });
  console.log('Saved store_dropdown_selected_top.png');

  // 6. Close dropdown by clicking "Klar"
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const klarBtn = buttons.find(b => b.innerText.trim() === 'Klar');
    if (klarBtn) klarBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  const afterText = await page.$eval(triggerSelector, el => el.innerText);
  console.log('Trigger text after selection:', afterText);

  // Take screenshot of desktop results
  await page.screenshot({
    path: path.join(artifactDir, 'desktop_with_selected_stores.png'),
    fullPage: false,
  });
  console.log('Saved desktop_with_selected_stores.png');

  // 7. Mobile View (375x812)
  console.log('Capturing mobile view...');
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  // Re-open dropdown on mobile
  await page.waitForSelector(triggerSelector);
  await page.click(triggerSelector);
  await new Promise(r => setTimeout(r, 400));

  await page.screenshot({
    path: path.join(artifactDir, 'mobile_store_dropdown.png'),
    fullPage: false,
  });
  console.log('Saved mobile_store_dropdown.png');

  await browser.close();
  console.log('All tests completed successfully!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
