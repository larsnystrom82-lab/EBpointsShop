import fs from 'fs';

const html = fs.readFileSync('zupergift_sample.html', 'utf-8');

// Search for product card structures in HTML
// Look for card wrappers or headings
const productCardRegex = /<a\s+[^>]*href=["']\/se\/([a-z0-9-]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
let match;
const products = new Map();

while ((match = productCardRegex.exec(html)) !== null) {
  const slug = match[1];
  const innerHtml = match[2];

  // Try to find image and title
  const imgMatch = innerHtml.match(/srcSet=["']([^"']+)["']|src=["']([^"']+)["']/i);
  const titleMatch = innerHtml.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i) ||
                     innerHtml.match(/class=["'][^"']*title[^"']*["'][^>]*>([\s\S]*?)<\//i) ||
                     innerHtml.match(/alt=["']([^"']+)["']/i);

  if (!slug.includes('alla-presentkort') && !slug.includes('faq') && !slug.includes('company') && !slug.includes('redeem')) {
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : slug;
    const img = imgMatch ? (imgMatch[1] || imgMatch[2]).split(' ')[0] : undefined;

    if (!products.has(slug)) {
      products.set(slug, { slug, title, image: img });
    }
  }
}

console.log('Total discovered products/stores in Zupergift:', products.size);
console.log('Sample discovered products:');
console.log(Array.from(products.values()).slice(0, 25));
