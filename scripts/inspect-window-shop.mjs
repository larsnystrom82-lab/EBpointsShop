import fs from 'fs';

const html = fs.readFileSync('zupergift_sample.html', 'utf-8');
const match = html.match(/window\.shop\s*=\s*JSON\.parse\((["'])([\s\S]*?)\1\);/);

if (match) {
  // It's a JSON string passed to JSON.parse
  try {
    const jsonString = JSON.parse(match[0].replace(/^window\.shop\s*=\s*JSON\.parse\(/, '').replace(/\);$/, ''));
    const data = JSON.parse(jsonString);
    console.log('Top level keys in window.shop:', Object.keys(data));
    if (data.products) {
      console.log('Number of products in Zupergift:', data.products.length);
      console.log('Sample product:', JSON.stringify(data.products[0], null, 2));
    } else if (data.cards) {
      console.log('Number of cards:', data.cards.length);
      console.log('Sample card:', JSON.stringify(data.cards[0], null, 2));
    } else {
      for (const k of Object.keys(data)) {
        if (Array.isArray(data[k])) {
          console.log(`Array "${k}" length:`, data[k].length);
          if (data[k].length > 0) {
            console.log(`Sample item in "${k}":`, data[k][0]);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error parsing JSON:', err);
  }
} else {
  console.log('No regex match for window.shop');
}
