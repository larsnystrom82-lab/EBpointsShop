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

  page.on('console', (msg) => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', (err) => console.error('BROWSER ERROR:', err));

  // 1. Visit admin with auth cookie
  console.log('Navigating to admin...');
  await page.setCookie({
    name: 'poangkollen_admin_auth',
    value: 'authenticated_valid_token',
    domain: 'localhost',
    path: '/',
  });

  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 800));

  // 2. Click "Kategorier" tab
  console.log('Clicking "Kategorier" tab...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const target = btns.find((b) => b.textContent && b.textContent.includes('Kategorier'));
    if (!target) throw new Error('Kategorier tab button not found');
    target.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/admin_categories_initial.png',
  });
  console.log('Saved admin_categories_initial.png');

  const uid = Date.now().toString().slice(-4);
  const cat1Name = `Skönhetsapotek ${uid}`;
  const cat1Slug = `skonhetsapotek-${uid}`;
  const cat2Name = `Gaming & Streaming ${uid}`;
  const expectedCat2Slug = `gaming-streaming-${uid}`;

  // 3. Create a new category with explicit slug
  console.log(`Creating category "${cat1Name}" with slug "${cat1Slug}"...`);
  const nameInput = await page.$('input[placeholder*="Gaming & Datorer"]');
  if (!nameInput) throw new Error('Name input not found');
  await nameInput.click();
  await nameInput.type(cat1Name);

  const slugInput = await page.$('input[placeholder*="gaming-datorer"]');
  if (!slugInput) throw new Error('Slug input not found');
  await slugInput.click();
  await slugInput.type(cat1Slug);

  await new Promise((r) => setTimeout(r, 300));

  const submitBtn = await page.$('button[type="submit"]');
  if (!submitBtn) throw new Error('Submit button not found');
  await submitBtn.click();

  await new Promise((r) => setTimeout(r, 1200));

  // Verify created category
  let bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes(cat1Name)) {
    throw new Error(`Newly created category "${cat1Name}" not found on page`);
  }
  console.log(`Successfully created "${cat1Name}"!`);

  // 4. Create second category with auto-generated slug
  console.log(`Creating category "${cat2Name}" with auto-generated slug...`);
  const nameInput2 = await page.$('input[placeholder*="Gaming & Datorer"]');
  if (!nameInput2) throw new Error('Name input 2 not found');
  await nameInput2.click();
  await nameInput2.type(cat2Name);

  await new Promise((r) => setTimeout(r, 300));

  const submitBtn2 = await page.$('button[type="submit"]');
  if (!submitBtn2) throw new Error('Submit button 2 not found');
  await submitBtn2.click();

  await new Promise((r) => setTimeout(r, 1200));

  bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes(cat2Name) || !bodyText.includes(expectedCat2Slug)) {
    throw new Error(`Auto-slug category "${cat2Name}" or "${expectedCat2Slug}" not found on page`);
  }
  console.log(`Successfully created "${cat2Name}" with auto-generated slug "${expectedCat2Slug}"!`);

  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/admin_categories_created.png',
  });
  console.log('Saved admin_categories_created.png');

  // 5. Verify category appears in Stores tab dropdown
  console.log('Switching to "Butiker & Partnerregler" tab to verify dropdown...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const target = btns.find((b) => b.textContent && b.textContent.includes('Butiker & Partnerregler'));
    target?.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  const hasNewCategoryInDropdown = await page.evaluate((names) => {
    const selects = Array.from(document.querySelectorAll('select'));
    for (const sel of selects) {
      const options = Array.from(sel.options).map((o) => o.text);
      if (options.includes(names[0]) && options.includes(names[1])) {
        return true;
      }
    }
    return false;
  }, [cat1Name, cat2Name]);

  console.log('New categories found in store select dropdown:', hasNewCategoryInDropdown);
  if (!hasNewCategoryInDropdown) {
    throw new Error('New categories were not present in store category dropdown');
  }

  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/admin_stores_category_dropdown.png',
  });
  console.log('Saved admin_stores_category_dropdown.png');

  // 6. Navigate to home page "/" and verify categories are present in filter
  console.log('Navigating to root "/" to check dynamic category filters...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1000));

  // Find and click the Category dropdown button under label "Kategori"
  console.log('Opening category dropdown on home page...');
  const catButtonClicked = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    const catLabel = labels.find((l) => l.textContent && l.textContent.trim() === 'Kategori');
    const btn = catLabel?.parentElement?.querySelector('button');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  console.log('Category dropdown button clicked:', catButtonClicked);
  await new Promise((r) => setTimeout(r, 600));

  const homeDropdownCategories = await page.evaluate((names) => {
    const allText = document.body.innerText;
    return {
      hasCat1: allText.includes(names[0]),
      hasCat2: allText.includes(names[1]),
    };
  }, [cat1Name, cat2Name]);
  console.log('Home page categories in opened dropdown:', homeDropdownCategories);

  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/home_categories_verified.png',
  });
  console.log('Saved home_categories_verified.png');

  if (!homeDropdownCategories.hasCat1 || !homeDropdownCategories.hasCat2) {
    throw new Error('New categories were not found in home page category filter');
  }

  // 7. Verify category deletion works
  console.log('Returning to admin to test category deletion...');
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 600));

  // Click Kategorier tab
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const target = btns.find((b) => b.textContent && b.textContent.includes('Kategorier'));
    target?.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  // Handle browser confirm dialog
  page.on('dialog', async (dialog) => {
    console.log('Dialog opened with message:', dialog.message());
    await dialog.accept();
  });

  console.log(`Deleting temporary category "${cat1Name}"...`);
  const deleteBtn = await page.$(`button[title='Ta bort kategorin "${cat1Name}"']`);
  if (!deleteBtn) {
    throw new Error(`Delete button for "${cat1Name}" not found`);
  }
  await deleteBtn.click();

  console.log('Waiting for category to disappear from DOM...');
  await page.waitForFunction(
    (name) => !document.body.innerText.includes(name),
    { timeout: 8000 },
    cat1Name
  );
  console.log(`Successfully verified deletion of "${cat1Name}"!`);

  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/admin_categories_after_delete.png',
  });
  console.log('Saved admin_categories_after_delete.png');

  await browser.close();
  console.log('ALL CATEGORY CREATION, INTEGRATION, AND DELETION TESTS PASSED COMPLETELY!');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
