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

  const getTopStores = async () => {
    return await page.evaluate(() => {
      const articles = Array.from(document.querySelectorAll('article'));
      return articles.slice(0, 10).map((a) => {
        const lines = a.innerText.split('\n').filter(Boolean);
        return lines.slice(0, 6).join(' | ');
      });
    });
  };

  console.log('--- BEFORE TOGGLE ---');
  const before = await getTopStores();
  console.log(before);

  // Click toggle
  await page.evaluate(() => {
    const switches = Array.from(document.querySelectorAll('button[role="switch"]'));
    const sw = switches.find((s) => s.parentElement && s.parentElement.textContent.includes('Nivåpoäng'));
    if (sw) sw.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  console.log('--- AFTER TOGGLE ---');
  const after = await getTopStores();
  console.log(after);

  await browser.close();
}

run().catch(console.error);
