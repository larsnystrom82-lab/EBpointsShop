const fs = require('fs');

const path = 'C:/Users/larsn/.gemini/antigravity/brain/2d148995-581c-49fb-9a49-d1d9f7691112/.system_generated/steps/1963/content.md';
const content = fs.readFileSync(path, 'utf8');

const regex = /<a\s+[^>]*href=["'](https:\/\/eurobonusguiden\.se\/[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
const links = [];
const seen = new Set();

let match;
while ((match = regex.exec(content)) !== null) {
  const url = match[1];
  const text = match[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();
  if (text && !url.includes('/wp-content') && !url.includes('/feed') && !seen.has(url)) {
    seen.add(url);
    links.push({ url, text });
  }
}

console.log(JSON.stringify(links, null, 2));
