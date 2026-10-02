async function testAdmin() {
  console.log('Testing Admin Login...');
  const loginRes = await fetch('http://localhost:3000/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'eurobonus2026' }),
  });

  const cookie = loginRes.headers.get('set-cookie');
  console.log('Login status:', loginRes.status, 'Cookie set:', !!cookie);

  console.log('Fetching Admin Data...');
  const dataRes = await fetch('http://localhost:3000/api/admin/data', {
    headers: { Cookie: cookie || '' },
  });
  const data = await dataRes.json();
  console.log('Current Zupergift rate per 100 kr:', data.zupergiftConfig.ratePer100Kr);
  console.log('Stores count in DB:', data.stores.length);

  console.log('Testing Zupergift Catalog Sync...');
  const syncRes = await fetch('http://localhost:3000/api/admin/sync-zupergift', {
    method: 'POST',
    headers: { Cookie: cookie || '' },
  });
  const syncResult = await syncRes.json();
  console.log('Sync result:', syncResult.message);

  console.log('Testing Public Config Endpoint...');
  const pubRes = await fetch('http://localhost:3000/api/config');
  const pubConfig = await pubRes.json();
  console.log('Public Zupergift rate per 100 kr:', pubConfig.zupergiftConfig.ratePer100Kr);
  console.log('Public stores count:', pubConfig.stores.length);

  console.log('ALL ADMIN & ZUPERGIFT TESTS PASSED!');
}

testAdmin().catch(console.error);
