import puppeteer from 'puppeteer-core';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testOverlap() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Test Desktop
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Scroll down to make ScrollToTopButton appear
  await page.evaluate(() => window.scrollTo(0, 800));
  await new Promise((r) => setTimeout(r, 400));

  const desktopBoxes = await page.evaluate(() => {
    const scrollBtn = document.querySelector('button[title="Scrolla till toppen"]');
    const feedbackBtn = document.querySelector('button[title*="Lämna förbättringsförslag"]');
    if (!scrollBtn || !feedbackBtn) return null;
    const r1 = scrollBtn.getBoundingClientRect();
    const r2 = feedbackBtn.getBoundingClientRect();
    return {
      scroll: { top: r1.top, bottom: r1.bottom, left: r1.left, right: r1.right, height: r1.height },
      feedback: { top: r2.top, bottom: r2.bottom, left: r2.left, right: r2.right, height: r2.height },
    };
  });

  console.log('Desktop Boxes:', desktopBoxes);
  if (!desktopBoxes) {
    throw new Error('Could not find buttons on desktop');
  }

  // Scroll button must be strictly ABOVE feedback button: scroll.bottom < feedback.top
  const desktopGap = desktopBoxes.feedback.top - desktopBoxes.scroll.bottom;
  console.log('Desktop vertical gap between buttons:', desktopGap, 'px');
  if (desktopGap < 0) {
    throw new Error(`Buttons overlap on desktop! Gap: ${desktopGap}px`);
  }

  // Test Mobile
  await page.setViewport({ width: 375, height: 667, isMobile: true });
  await page.evaluate(() => window.scrollTo(0, 800));
  await new Promise((r) => setTimeout(r, 400));

  const mobileBoxes = await page.evaluate(() => {
    const scrollBtn = document.querySelector('button[title="Scrolla till toppen"]');
    const feedbackBtn = document.querySelector('button[title*="Lämna förbättringsförslag"]');
    if (!scrollBtn || !feedbackBtn) return null;
    const r1 = scrollBtn.getBoundingClientRect();
    const r2 = feedbackBtn.getBoundingClientRect();
    return {
      scroll: { top: r1.top, bottom: r1.bottom, left: r1.left, right: r1.right, height: r1.height },
      feedback: { top: r2.top, bottom: r2.bottom, left: r2.left, right: r2.right, height: r2.height },
    };
  });

  console.log('Mobile Boxes:', mobileBoxes);
  if (!mobileBoxes) {
    throw new Error('Could not find buttons on mobile');
  }

  const mobileGap = mobileBoxes.feedback.top - mobileBoxes.scroll.bottom;
  console.log('Mobile vertical gap between buttons:', mobileGap, 'px');
  if (mobileGap < 0) {
    throw new Error(`Buttons overlap on mobile! Gap: ${mobileGap}px`);
  }

  console.log('SUCCESS: No overlap on desktop or mobile!');
  await browser.close();
}

testOverlap().catch((err) => {
  console.error('Overlap test failed:', err);
  process.exit(1);
});
