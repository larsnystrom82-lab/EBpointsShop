import puppeteer from 'puppeteer-core';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,1000'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });

  // 1. Visit root "/"
  console.log('Navigating to root "/"...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 600));

  // Check floating feedback button
  const floatingBtn = await page.$('button[aria-label="Lämna förslag eller feedback"]');
  if (!floatingBtn) {
    throw new Error('Floating feedback button not found on home page');
  }

  // Check navbar feedback button
  const navbarFeedbackBtn = await page.$('nav button[title*="Lämna förslag"]');
  if (!navbarFeedbackBtn) {
    throw new Error('Navbar feedback button not found');
  }

  // 2. Open modal via Navbar button
  console.log('Clicking navbar feedback button...');
  await navbarFeedbackBtn.click();
  await new Promise((r) => setTimeout(r, 500));

  // Verify modal is open
  const modalTitle = await page.$eval('#feedback-modal-title', (el) => el.textContent.trim());
  console.log('Modal title:', modalTitle);
  if (!modalTitle.includes('Lämna förslag & feedback')) {
    throw new Error(`Expected modal title to include "Lämna förslag & feedback", got "${modalTitle}"`);
  }

  // Capture screenshot of open modal
  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/feedback_modal_opened.png',
  });
  console.log('Saved feedback_modal_opened.png');

  // 3. Fill in feedback form
  console.log('Filling in feedback form...');
  const textarea = await page.$('#feedback-message');
  await textarea.type('Jag föreslår att ni lägger till en funktion för att exportera sina poängberäkningar till Excel eller PDF!');

  const emailInput = await page.$('#feedback-email');
  await emailInput.type('testare@poangkollen.se');

  // Submit form
  console.log('Submitting feedback...');
  const submitBtn = await page.$('button[type="submit"]');
  await submitBtn.click();
  await new Promise((r) => setTimeout(r, 1000));

  // Verify success screen
  const successText = await page.evaluate(() => document.body.innerText);
  if (!successText.includes('Tack för ditt bidrag!')) {
    throw new Error('Expected success screen with "Tack för ditt bidrag!"');
  }

  // Capture screenshot of success state
  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/feedback_modal_success.png',
  });
  console.log('Saved feedback_modal_success.png');

  // Close modal
  const closeSuccessBtn = await page.$('button[type="button"]');
  await closeSuccessBtn.click();
  await new Promise((r) => setTimeout(r, 500));

  // 4. Test dedicated /feedback page
  console.log('Testing dedicated /feedback page...');
  await page.goto('http://localhost:3000/feedback', { waitUntil: 'networkidle2' });
  const feedbackPageHeading = await page.$eval('h1', (el) => el.textContent.trim());
  console.log('/feedback heading:', feedbackPageHeading);
  if (!feedbackPageHeading.includes('Lämna förslag & feedback')) {
    throw new Error(`Expected /feedback heading to include "Lämna förslag & feedback", got "${feedbackPageHeading}"`);
  }

  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/feedback_page_verified.png',
  });
  console.log('Saved feedback_page_verified.png');

  // 5. Test admin page shows the submitted feedback
  console.log('Testing admin page shows received feedback...');
  // Set auth cookie
  await page.setCookie({
    name: 'poangkollen_admin_auth',
    value: 'authenticated_valid_token',
    domain: 'localhost',
    path: '/',
  });
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 800));

  // Click Feedback & Rapporter tab
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const target = btns.find((b) => b.textContent && b.textContent.includes('Feedback & Rapporter'));
    target?.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  // Verify the submitted suggestion appears
  const adminPageText = await page.evaluate(() => document.body.innerText);
  console.log('Admin reports text snippet has suggestion:', adminPageText.includes('exportera sina poängberäkningar'));
  if (!adminPageText.includes('exportera sina poängberäkningar')) {
    throw new Error('Submitted feedback was not found in admin reports tab');
  }

  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/admin_feedback_verified.png',
  });
  console.log('Saved admin_feedback_verified.png');

  await browser.close();
  console.log('All feedback flow tests passed completely!');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
