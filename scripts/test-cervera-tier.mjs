import puppeteer from 'puppeteer-core';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1000));

  // Select Cervera in dropdown
  const storeTrigger = await page.$('button[aria-haspopup="listbox"]');
  if (storeTrigger) {
    await storeTrigger.click();
    await new Promise((r) => setTimeout(r, 400));
    const searchBox = await page.$('input[placeholder*="Sök butik"]');
    if (searchBox) {
      await searchBox.type('Cervera');
      await new Promise((r) => setTimeout(r, 400));
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const cerveraBtn = buttons.find((b) => b.textContent && b.textContent.includes('Cervera'));
        if (cerveraBtn) cerveraBtn.click();
      });
      await new Promise((r) => setTimeout(r, 400));
    }
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 500));
  }

  const getResults = async () => {
    return await page.evaluate(() => {
      const articles = Array.from(document.querySelectorAll('article'));
      return articles.map((a) => {
        const lines = a.innerText.split('\n').filter(Boolean);
        return lines.slice(0, 8).join(' | ');
      });
    });
  };

  console.log('--- CERVERA: TIER TOGGLE OFF ---');
  console.log(await getResults());

  // Click toggle
  await page.evaluate(() => {
    const switches = Array.from(document.querySelectorAll('button[role="switch"]'));
    const sw = switches.find((s) => s.parentElement && s.parentElement.textContent.includes('Nivåpoäng'));
    if (sw) sw.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  console.log('--- CERVERA: TIER TOGGLE ON ---');
  console.log(await getResults());

  await browser.close();
}

run().catch(console.error);
