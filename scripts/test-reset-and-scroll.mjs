import puppeteer from 'puppeteer-core';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testResetAndScroll() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,1000'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  console.log('1. Navigating to home page...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Verify reset button exists in SearchFilterBox
  const resetButton = await page.$('button[title*="Återställ alla filter"]');
  console.log('Found reset filter button in SearchFilterBox:', !!resetButton);
  if (!resetButton) {
    throw new Error('Reset filter button not found in SearchFilterBox');
  }

  // Check scroll to top button: should be hidden initially
  const initialScrollBtn = await page.$('button[title="Scrolla till toppen"]');
  console.log('Scroll to top button initially visible:', !!initialScrollBtn);

  // Scroll down 600px
  console.log('2. Scrolling down 600px...');
  await page.evaluate(() => window.scrollTo(0, 600));
  await new Promise((r) => setTimeout(r, 300));

  const scrolledBtn = await page.$('button[title="Scrolla till toppen"]');
  console.log('Scroll to top button visible after scroll:', !!scrolledBtn);
  if (!scrolledBtn) {
    throw new Error('Scroll to top button did not appear when scrolled');
  }

  // Click scroll to top button
  console.log('3. Clicking scroll to top button...');
  await scrolledBtn.click();
  await new Promise((r) => setTimeout(r, 600));

  const scrollYAfter = await page.evaluate(() => window.scrollY);
  console.log('Scroll Y after click:', scrollYAfter);
  if (scrollYAfter > 50) {
    throw new Error(`Expected scrollY to be near 0, got ${scrollYAfter}`);
  }

  // Test altering a filter, e.g. amount or toggles, then clicking reset
  console.log('4. Testing filter reset functionality...');
  // Type 500 kr into amount
  const amountInput = await page.$('input[placeholder="100 kr"]');
  await amountInput.click({ clickCount: 3 });
  await amountInput.type('500');
  await new Promise((r) => setTimeout(r, 200));

  let amountVal = await page.$eval('input[placeholder="100 kr"]', (el) => el.value);
  console.log('Amount before reset:', amountVal);

  // Click reset
  await resetButton.click();
  await new Promise((r) => setTimeout(r, 200));

  amountVal = await page.$eval('input[placeholder="100 kr"]', (el) => el.value);
  console.log('Amount after reset:', amountVal);
  if (amountVal !== '100 kr') {
    throw new Error(`Expected amount to be reset to "100 kr", got "${amountVal}"`);
  }

  console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
  await browser.close();
}

testResetAndScroll().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
