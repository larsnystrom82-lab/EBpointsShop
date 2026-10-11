import http from 'http';

function checkRedirect(host, path, expectedLocation) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port: 3000,
        path,
        headers: {
          Host: host,
        },
      },
      (res) => {
        const location = res.headers.location;
        const isRedirect = res.statusCode === 301 || res.statusCode === 308;
        if (isRedirect && location === expectedLocation) {
          console.log(`✓ ${host}${path} (${res.statusCode}) -> ${location}`);
          resolve(true);
        } else {
          console.error(`✗ FAILED: ${host}${path} got status ${res.statusCode}, location: ${location} (expected: ${expectedLocation})`);
          resolve(false);
        }
      }
    );
    req.on('error', (err) => {
      console.error(`✗ Error requesting ${host}${path}:`, err.message);
      resolve(false);
    });
    req.end();
  });
}

async function testAll() {
  console.log('--- Testing Permanent Domain Redirects ---');
  const tests = [
    { host: 'bonuslotsen.se', path: '/', expected: 'https://www.poangpiloten.se/' },
    { host: 'www.bonuslotsen.se', path: '/om', expected: 'https://www.poangpiloten.se/om' },
    { host: 'bonuslotsen.se', path: '/lankar', expected: 'https://www.poangpiloten.se/lankar' },
    { host: 'bonuslotsen.se', path: '/feedback', expected: 'https://www.poangpiloten.se/feedback' },
    { host: 'poangpiloten.se', path: '/', expected: 'https://www.poangpiloten.se/' },
    { host: 'poangpiloten.se', path: '/lankar', expected: 'https://www.poangpiloten.se/lankar' },
  ];

  let allPassed = true;
  for (const t of tests) {
    const passed = await checkRedirect(t.host, t.path, t.expected);
    if (!passed) allPassed = false;
  }

  if (allPassed) {
    console.log('\n✓ ALL DOMAIN REDIRECTS CONFIRMED AND WORKING AS EXPECTED!');
    process.exit(0);
  } else {
    console.error('\n✗ SOME REDIRECTS FAILED!');
    process.exit(1);
  }
}

testAll();
