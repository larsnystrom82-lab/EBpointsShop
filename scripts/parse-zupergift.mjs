import fs from 'fs';

async function parseHtml() {
  const res = await fetch('https://zupergift.com/se/alla-presentkort', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    }
  });
  const html = await res.text();
  fs.writeFileSync('zupergift_sample.html', html, 'utf-8');

  // Search for script tags containing JSON
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let scriptCount = 0;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    scriptCount++;
    const content = match[1];
    if (content.includes('cervera') || content.includes('products') || content.includes('brands') || content.includes('cards')) {
      console.log(`Script #${scriptCount} mentions keywords! Length:`, content.length);
      console.log('Snippet:', content.substring(0, 300));
    }
  }

  // Search for links
  const hrefRegex = /href=["']([^"']+)["']/gi;
  const hrefs = [];
  while ((match = hrefRegex.exec(html)) !== null) {
    hrefs.push(match[1]);
  }
  const filteredHrefs = hrefs.filter(h => !h.startsWith('#') && !h.includes('.css') && !h.includes('.js') && !h.includes('.png'));
  console.log('Sample filtered hrefs:', Array.from(new Set(filteredHrefs)).slice(0, 30));

  // Check if "Cervera" is mentioned in the text
  const cerveraIdx = html.toLowerCase().indexOf('cervera');
  if (cerveraIdx !== -1) {
    console.log('Cervera snippet in HTML:');
    console.log(html.substring(Math.max(0, cerveraIdx - 150), cerveraIdx + 250));
  } else {
    console.log('Cervera not mentioned directly in HTML text.');
  }
}

parseHtml().catch(console.error);
