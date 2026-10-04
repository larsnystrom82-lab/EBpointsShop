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
  console.log('1. Testing root "/" is "Jämför bonuspoäng"...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  const title = await page.title();
  console.log('Page title:', title);
  if (!title.includes('Jämför bonuspoäng')) {
    throw new Error(`Expected page title to include "Jämför bonuspoäng", got "${title}"`);
  }

  const h1Text = await page.$eval('h1', (el) => el.textContent.trim());
  console.log('H1 text:', h1Text);
  if (h1Text !== 'Jämför bonuspoäng') {
    throw new Error(`Expected H1 to be "Jämför bonuspoäng", got "${h1Text}"`);
  }

  const isHomeActive = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('nav a'));
    const link = links.find((l) => l.textContent.trim() === 'Jämför bonuspoäng');
    return link ? link.classList.contains('text-blue-600') && link.classList.contains('border-b-2') : false;
  });
  console.log('Is "Jämför bonuspoäng" link active on /:', isHomeActive);
  if (!isHomeActive) {
    throw new Error('Expected "Jämför bonuspoäng" link to have active styling on /');
  }

  // Take screenshot of home page
  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/home_page_jamfor_bonuspoang.png',
  });
  console.log('Saved home_page_jamfor_bonuspoang.png');

  // 2. Go to /guider and click Eurobonus-jakten icon
  console.log('2. Navigating to /guider...');
  await page.goto('http://localhost:3000/guider', { waitUntil: 'networkidle2' });
  if (!page.url().includes('/guider')) {
    throw new Error('Failed to navigate to /guider');
  }

  console.log('Clicking the Eurobonus-jakten icon / logo in navbar...');
  const logoLink = await page.$('nav a[aria-label*="Eurobonus-jakten"]');
  if (!logoLink) {
    throw new Error('Could not find Eurobonus-jakten logo link with aria-label in navbar');
  }
  await logoLink.click();
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  console.log('URL after clicking Eurobonus-jakten logo:', page.url());
  if (page.url() !== 'http://localhost:3000/') {
    throw new Error(`Expected http://localhost:3000/ after clicking logo, got ${page.url()}`);
  }

  // 3. Go to /om and click Eurobonus-jakten icon
  console.log('3. Navigating to /om...');
  await page.goto('http://localhost:3000/om', { waitUntil: 'networkidle2' });
  if (!page.url().includes('/om')) {
    throw new Error('Failed to navigate to /om');
  }

  console.log('Clicking the Eurobonus-jakten icon / logo in navbar from /om...');
  const logoLinkFromOm = await page.$('nav a[aria-label*="Eurobonus-jakten"]');
  await logoLinkFromOm.click();
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  console.log('URL after clicking Eurobonus-jakten logo from /om:', page.url());
  if (page.url() !== 'http://localhost:3000/') {
    throw new Error(`Expected http://localhost:3000/ after clicking logo, got ${page.url()}`);
  }

  // 4. Test redirect from /jamfor
  console.log('4. Testing redirect from /jamfor...');
  await page.goto('http://localhost:3000/jamfor', { waitUntil: 'networkidle2' });
  console.log('URL after visiting /jamfor:', page.url());
  if (page.url() !== 'http://localhost:3000/') {
    throw new Error(`Expected redirect to http://localhost:3000/, got ${page.url()}`);
  }

  // 5. Test redirect from /jamfor-bonuspoang
  console.log('5. Testing redirect from /jamfor-bonuspoang...');
  await page.goto('http://localhost:3000/jamfor-bonuspoang', { waitUntil: 'networkidle2' });
  console.log('URL after visiting /jamfor-bonuspoang:', page.url());
  if (page.url() !== 'http://localhost:3000/') {
    throw new Error(`Expected redirect to http://localhost:3000/, got ${page.url()}`);
  }

  await browser.close();
  console.log('All home navigation tests passed successfully!');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
