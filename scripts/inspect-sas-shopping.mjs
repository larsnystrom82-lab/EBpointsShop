import fs from 'fs';

async function main() {
  const res = await fetch('https://onlineshopping.flysas.com/sv-SE', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7',
    },
  });

  const html = await res.text();
  console.log('HTML length on /sv-SE:', html.length);

  // Search for script tags containing NUXT or stores or merchants
  const scriptTags = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (let i = 0; i < scriptTags.length; i++) {
    const s = scriptTags[i];
    if (s.includes('__NUXT__')) {
      console.log(`Script ${i} length:`, s.length);
      fs.writeFileSync('./scripts/nuxt-dump.txt', s, 'utf8');
      console.log('Saved nuxt-dump.txt');
    }
  }

  // Also check if there is an all-stores page:
  const allStoresRes = await fetch('https://onlineshopping.flysas.com/sv-SE/alla-butiker', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });
  console.log('/sv-SE/alla-butiker status:', allStoresRes.status);
  if (allStoresRes.ok) {
    const allHtml = await allStoresRes.text();
    console.log('/sv-SE/alla-butiker length:', allHtml.length);
    fs.writeFileSync('./scripts/alla-butiker.html', allHtml, 'utf8');
  }
}

main().catch(console.error);
