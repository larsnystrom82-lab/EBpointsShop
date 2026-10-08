async function testSeo() {
  const baseUrl = 'http://127.0.0.1:3000';
  let passed = true;

  console.log('--- 1. Testing Sitemap ---');
  const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`);
  const sitemapText = await sitemapRes.text();
  console.log('Sitemap status:', sitemapRes.status);
  const expectedUrls = [
    'https://www.bonuslotsen.se',
    'https://www.bonuslotsen.se/lankar',
    'https://www.bonuslotsen.se/om',
    'https://www.bonuslotsen.se/feedback',
  ];
  for (const url of expectedUrls) {
    if (sitemapText.includes(`<loc>${url}</loc>`)) {
      console.log(`✓ Sitemap contains ${url}`);
    } else {
      console.error(`✗ Sitemap MISSING ${url}`);
      passed = false;
    }
  }

  console.log('\n--- 2. Testing Robots.txt ---');
  const robotsRes = await fetch(`${baseUrl}/robots.txt`);
  const robotsText = await robotsRes.text();
  console.log('Robots status:', robotsRes.status);
  if (robotsText.includes('Sitemap: https://www.bonuslotsen.se/sitemap.xml')) {
    console.log('✓ Robots points to https://www.bonuslotsen.se/sitemap.xml');
  } else {
    console.error('✗ Robots MISSING sitemap pointer');
    passed = false;
  }

  console.log('\n--- 3. Testing Canonical tags ---');
  const pagesToTest = [
    { path: '/', expectedCanonical: 'https://www.bonuslotsen.se' },
    { path: '/om', expectedCanonical: 'https://www.bonuslotsen.se/om' },
    { path: '/lankar', expectedCanonical: 'https://www.bonuslotsen.se/lankar' },
    { path: '/feedback', expectedCanonical: 'https://www.bonuslotsen.se/feedback' },
  ];

  for (const p of pagesToTest) {
    const res = await fetch(`${baseUrl}${p.path}`);
    const html = await res.text();
    const canonicalMatch = html.match(/<link rel="canonical" href="([^"]+)"/);
    if (canonicalMatch) {
      console.log(`✓ ${p.path} canonical tag: ${canonicalMatch[1]}`);
      if (!canonicalMatch[1].startsWith(p.expectedCanonical)) {
        console.error(`✗ Expected canonical ${p.expectedCanonical}, got ${canonicalMatch[1]}`);
        passed = false;
      }
    } else {
      console.error(`✗ No canonical tag found on ${p.path}`);
      passed = false;
    }
  }

  if (passed) {
    console.log('\n🎉 ALL SEO CHECKS PASSED!');
  } else {
    console.error('\n❌ SOME CHECKS FAILED');
    process.exit(1);
  }
}

testSeo().catch((err) => {
  console.error(err);
  process.exit(1);
});
