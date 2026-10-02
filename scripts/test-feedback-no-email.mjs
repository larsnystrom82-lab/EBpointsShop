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

  // 1. Visit root "/" and open feedback modal
  console.log('Navigating to root "/"...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 800));

  // Click floating feedback button or navbar feedback button
  const feedbackBtn = await page.$('button[aria-label="Lämna förslag eller feedback"]');
  if (!feedbackBtn) throw new Error('Feedback button not found');
  await feedbackBtn.click();
  await new Promise((r) => setTimeout(r, 500));

  // Check if email field exists in the modal
  console.log('Checking modal for email input...');
  const modalEmailInput = await page.$('#feedback-email');
  const modalText = await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"]');
    return modal ? modal.textContent : '';
  });

  console.log('Modal email input element exists:', !!modalEmailInput);
  console.log('Modal text includes "E-postadress":', modalText.includes('E-postadress'));

  if (modalEmailInput || modalText.includes('E-postadress')) {
    throw new Error('FAILED: Email input or label still exists in the feedback modal!');
  }

  // Take screenshot of the modal without email
  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/feedback_modal_no_email.png',
  });
  console.log('Saved feedback_modal_no_email.png');

  // Fill in message and submit
  console.log('Submitting feedback from modal without email...');
  const textarea = await page.$('#feedback-message');
  if (!textarea) throw new Error('Textarea not found');
  await textarea.type('Toppenbra sida! Jag föreslår en mörk bakgrund (dark mode) för nattläsning.');

  const submitBtn = await page.$('button[type="submit"]');
  if (!submitBtn) throw new Error('Submit button not found');
  await submitBtn.click();
  await new Promise((r) => setTimeout(r, 1000));

  const successText = await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"]');
    return modal ? modal.textContent : '';
  });
  console.log('Submitted successfully:', successText.includes('Tack för ditt bidrag'));
  if (!successText.includes('Tack för ditt bidrag')) {
    throw new Error('FAILED: Submission success view was not displayed');
  }

  // 2. Test dedicated /feedback page
  console.log('Navigating to /feedback page...');
  await page.goto('http://localhost:3000/feedback', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 600));

  const pageEmailInput = await page.$('#feedback-email-page');
  const pageBodyText = await page.evaluate(() => document.body.innerText);

  console.log('/feedback email input exists:', !!pageEmailInput);
  console.log('/feedback page includes "Din e-postadress":', pageBodyText.includes('Din e-postadress'));

  if (pageEmailInput || pageBodyText.includes('Din e-postadress')) {
    throw new Error('FAILED: Email input or label still exists on the /feedback page!');
  }

  // Take screenshot of /feedback page without email
  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/feedback_page_no_email.png',
  });
  console.log('Saved feedback_page_no_email.png');

  // Submit on /feedback page
  console.log('Submitting feedback from /feedback page without email...');
  const pageTextarea = await page.$('textarea');
  if (pageTextarea) {
    await pageTextarea.type('Allmän feedback: Supersmidigt och enkelt gränssnitt!');
  }
  const pageSubmitBtn = await page.$('button[type="submit"]');
  if (pageSubmitBtn) {
    await pageSubmitBtn.click();
    await new Promise((r) => setTimeout(r, 1000));
  }

  const pageSuccess = await page.evaluate(() =>
    document.body.innerText.includes('Tack för ditt förslag')
  );
  console.log('Page submitted successfully:', pageSuccess);
  if (!pageSuccess) {
    throw new Error('FAILED: Page submission success was not displayed');
  }

  await browser.close();
  console.log('ALL TESTS FOR EMAIL FIELD REMOVAL PASSED 100% PERFECTLY!');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
