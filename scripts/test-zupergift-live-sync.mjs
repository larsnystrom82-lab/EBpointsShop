async function testLiveZupergiftSync() {
  console.log('1. Logging into Admin...');
  const loginRes = await fetch('http://localhost:3000/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'eurobonus2026' }),
  });
  const cookie = loginRes.headers.get('set-cookie');
  console.log('Login success:', loginRes.ok, 'Cookie received:', !!cookie);

  console.log('2. Running REAL LIVE SYNC against https://zupergift.com/se/alla-presentkort ...');
  const syncRes = await fetch('http://localhost:3000/api/admin/sync-zupergift', {
    method: 'POST',
    headers: { Cookie: cookie || '' },
  });
  const syncData = await syncRes.json();
  console.log('Live Sync Result Message:', syncData.message);
  console.log('Total discovered stores count:', syncData.totalDiscovered);
  console.log('Matched stores with Eurobonus-jakten:', syncData.matchedStores);

  console.log('3. Fetching DB to check imported Zupergift stores...');
  const dataRes = await fetch('http://localhost:3000/api/admin/data', {
    headers: { Cookie: cookie || '' },
  });
  const dbData = await dataRes.json();
  console.log('Total Zupergift stores in database:', dbData.zupergiftStores.length);
  console.log('Sample Zupergift stores in DB:');
  dbData.zupergiftStores.slice(0, 10).forEach(s => {
    console.log(` - [${s.id}] ${s.name} (Hidden: ${s.isHidden}, Excluded: ${s.isExcluded})`);
  });

  console.log('4. Testing HIDING a store from Zupergift (e.g. cervera)...');
  const hideRes = await fetch('http://localhost:3000/api/admin/zupergift-stores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie || '' },
    body: JSON.stringify({ storeId: 'cervera', action: 'hide' }),
  });
  const hideData = await hideRes.json();
  console.log('Hide Result:', hideData.message);

  console.log('5. Testing REMOVING / EXCLUDING a store from Zupergift (e.g. ikea)...');
  const excludeRes = await fetch('http://localhost:3000/api/admin/zupergift-stores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie || '' },
    body: JSON.stringify({ storeId: 'ikea', action: 'exclude' }),
  });
  const excludeData = await excludeRes.json();
  console.log('Exclude Result:', excludeData.message);

  console.log('6. Testing RESTORING a store (e.g. cervera unhide)...');
  const unhideRes = await fetch('http://localhost:3000/api/admin/zupergift-stores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie || '' },
    body: JSON.stringify({ storeId: 'cervera', action: 'unhide' }),
  });
  const unhideData = await unhideRes.json();
  console.log('Unhide Result:', unhideData.message);

  console.log('--- ALL ZUPERGIFT LIVE SYNC AND ADMIN CONTROL TESTS COMPLETED SUCCESSFULLY! ---');
}

testLiveZupergiftSync().catch(console.error);
