import http from 'node:http';

function makeRawRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function testSeoAndRedirects() {
  const baseUrl = 'http://127.0.0.1:3000';
  let passed = true;

  console.log('--- 1. Testing Sitemap ---');
  const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`);
  const sitemapText = await sitemapRes.text();
  console.log('Sitemap status:', sitemapRes.status);
  const expectedUrls = [
    'https://bonuslotsen.se',
    'https://bonuslotsen.se/lankar',
    'https://bonuslotsen.se/om',
    'https://bonuslotsen.se/feedback',
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
  if (robotsText.includes('Sitemap: https://bonuslotsen.se/sitemap.xml')) {
    console.log('✓ Robots points to https://bonuslotsen.se/sitemap.xml');
  } else {
    console.error('✗ Robots MISSING sitemap pointer');
    passed = false;
  }

  console.log('\n--- 3. Testing Canonical tags ---');
  const pagesToTest = [
    { path: '/', expectedCanonical: 'https://bonuslotsen.se' },
    { path: '/om', expectedCanonical: 'https://bonuslotsen.se/om' },
    { path: '/lankar', expectedCanonical: 'https://bonuslotsen.se/lankar' },
    { path: '/feedback', expectedCanonical: 'https://bonuslotsen.se/feedback' },
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

  console.log('\n--- 4. Testing Middleware 301 Redirects ---');
  const redirectHosts = [
    'www.bonuslotsen.se',
    'ebpointsshop.onrender.com',
    'old-domain.com',
  ];

  for (const host of redirectHosts) {
    const rawRes = await makeRawRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/om?filter=test',
      method: 'GET',
      headers: {
        Host: host,
      },
    });

    console.log(`Raw Host "${host}" -> status: ${rawRes.statusCode}, location: ${rawRes.headers.location}`);
    if (rawRes.statusCode === 301 && rawRes.headers.location === 'https://bonuslotsen.se/om?filter=test') {
      console.log(`✓ Correct 301 redirect for raw Host: ${host}`);
    } else {
      console.error(`✗ Incorrect redirect for raw Host: ${host}`);
      passed = false;
    }

    // Also test X-Forwarded-Host (used by reverse proxies such as Render)
    const forwardedRes = await makeRawRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/feedback',
      method: 'GET',
      headers: {
        'X-Forwarded-Host': host,
      },
    });

    console.log(`X-Forwarded-Host "${host}" -> status: ${forwardedRes.statusCode}, location: ${forwardedRes.headers.location}`);
    if (forwardedRes.statusCode === 301 && forwardedRes.headers.location === 'https://bonuslotsen.se/feedback') {
      console.log(`✓ Correct 301 redirect for X-Forwarded-Host: ${host}`);
    } else {
      console.error(`✗ Incorrect redirect for X-Forwarded-Host: ${host}`);
      passed = false;
    }
  }

  // Also test that canonical host bonuslotsen.se is NOT redirected
  const canonicalRes = await makeRawRequest({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/om',
    method: 'GET',
    headers: {
      Host: 'bonuslotsen.se',
    },
  });
  console.log(`Host "bonuslotsen.se" -> status: ${canonicalRes.statusCode}`);
  if (canonicalRes.statusCode === 200) {
    console.log('✓ Canonical host bonuslotsen.se returns 200 without redirect');
  } else {
    console.error('✗ Canonical host returned non-200');
    passed = false;
  }

  if (passed) {
    console.log('\n🎉 ALL SEO & DOMAIN REDIRECT CHECKS PASSED!');
  } else {
    console.error('\n❌ SOME CHECKS FAILED');
    process.exit(1);
  }
}

testSeoAndRedirects().catch((err) => {
  console.error(err);
  process.exit(1);
});
