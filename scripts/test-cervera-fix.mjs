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

  // 1. Pre-set user preferences to match media_1790949420225.png exactly:
  // Cervera selected, 1995 kr, allowPartnerStores: false, allowGiftCards: true, allowZupergift: true
  console.log('Setting up exact test preferences...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem(
      'poangkollen_user_preferences_v2',
      JSON.stringify({
        selectedStoreIds: ['cervera'],
        selectedCategoryIds: [],
        purchaseAmountKr: 1995,
        rawAmountInput: '1995',
        allowPartnerStores: false,
        allowGiftCards: true,
        allowZupergift: true,
        onlyCampaigns: false,
        selectedCardIds: [],
      })
    );
  });

  // Reload with preferences active
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1000));

  // 2. Inspect rendered cards
  const resultsInfo = await page.evaluate(() => {
    const heading = document.querySelector('h2, .text-xl, .font-black')?.textContent || '';
    const cards = Array.from(document.querySelectorAll('.rounded-2xl.border'));
    return {
      heading,
      totalCards: cards.length,
      cards: cards.map((c) => ({
        fullText: c.innerText,
        hasCervera: c.innerText.includes('Cervera'),
        hasKampanjBadge: c.innerText.includes('Kampanj'),
        hasDirectGiftcard: c.innerText.includes('SAS Presentkort → Cervera'),
        hasZupergiftRoute: c.innerText.includes('SAS Presentkort → Zupergift → Cervera'),
      })),
    };
  });

  console.log('Results summary:', JSON.stringify(resultsInfo, null, 2));

  // Verify only 1 alternative is found (the real Zupergift route)
  if (resultsInfo.totalCards !== 1) {
    throw new Error(`Expected exactly 1 result for Cervera (Zupergift), but found ${resultsInfo.totalCards}!`);
  }

  const cerveraCard = resultsInfo.cards[0];

  // Verify phantom route is gone
  if (cerveraCard.hasDirectGiftcard) {
    throw new Error('FAILED: Phantom direct giftcard route "SAS Presentkort → Cervera" was found!');
  }

  // Verify false campaign badge is gone
  if (cerveraCard.hasKampanjBadge) {
    throw new Error('FAILED: False Kampanj badge is still displayed on Cervera!');
  }

  // Verify correct route
  if (!cerveraCard.hasZupergiftRoute) {
    throw new Error('FAILED: Expected Zupergift route for Cervera was not found!');
  }

  console.log('SUCCESS: Exactly 1 card rendered, phantom direct card is removed, Kampanj badge is gone!');

  // Take screenshot of clean Cervera page
  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/cervera_fixed_verified.png',
  });
  console.log('Saved cervera_fixed_verified.png');

  // 3. Test "Endast kampanjer" filter: Cervera should NOT be shown when active
  console.log('Activating "Endast kampanjer" toggle...');
  await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    const kampanjLabel = labels.find((l) => l.textContent && l.textContent.includes('Endast kampanjer'));
    kampanjLabel?.querySelector('button')?.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  const afterFilterResults = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.rounded-2xl.border'));
    const cerveraCards = cards.filter((c) => c.innerText.includes('Cervera – via'));
    const bodyText = document.body.innerText;
    return {
      cerveraCardCount: cerveraCards.length,
      hasEmptyCampaignNotice:
        bodyText.includes('Inga aktiva kampanjer matchar ditt val') ||
        bodyText.includes('Inga alternativ matchar dina filter'),
    };
  });

  console.log('Results with "Endast kampanjer" active:', afterFilterResults);

  if (afterFilterResults.cerveraCardCount !== 0) {
    throw new Error('FAILED: Cervera still appears when "Endast kampanjer" is active, even though it is not a campaign!');
  }

  if (!afterFilterResults.hasEmptyCampaignNotice) {
    throw new Error('FAILED: Expected empty campaign notice was not shown!');
  }

  await page.screenshot({
    path: 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/cervera_only_campaigns_empty.png',
  });
  console.log('Saved cervera_only_campaigns_empty.png');

  await browser.close();
  console.log('ALL CERVERA CAMPAIGN & TEST DATA FIX TESTS PASSED 100% PERFECTLY!');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
