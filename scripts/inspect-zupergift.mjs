async function testFetch() {
  try {
    console.log('Fetching https://zupergift.com/se/alla-presentkort ...');
    const res = await fetch('https://zupergift.com/se/alla-presentkort', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    console.log('HTTP Status:', res.status, res.statusText);
    const text = await res.text();
    console.log('Downloaded length:', text.length, 'bytes');

    if (text.includes('__NEXT_DATA__')) {
      console.log('Found __NEXT_DATA__ script!');
      const match = text.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
      if (match) {
        const json = JSON.parse(match[1]);
        const pageProps = json.props?.pageProps;
        console.log('pageProps keys:', Object.keys(pageProps || {}));

        // Look for cards, products, brands, or categories
        for (const key of Object.keys(pageProps || {})) {
          if (Array.isArray(pageProps[key])) {
            console.log(`Array prop "${key}" with length:`, pageProps[key].length);
            if (pageProps[key].length > 0) {
              console.log(`Sample item in "${key}":`, JSON.stringify(pageProps[key][0], null, 2));
            }
          }
        }
      }
    } else {
      console.log('__NEXT_DATA__ not found. Checking HTML for brand links or cards...');
      // Look for presentkort hrefs
      const regex = /href=["'](\/se\/presentkort\/[a-z0-9-]+)["']/gi;
      const matches = Array.from(text.matchAll(regex)).map(m => m[1]);
      console.log('Found links count:', matches.length);
      console.log('Sample links:', Array.from(new Set(matches)).slice(0, 15));
    }
  } catch (err) {
    console.error('Error fetching Zupergift:', err);
  }
}

testFetch();
