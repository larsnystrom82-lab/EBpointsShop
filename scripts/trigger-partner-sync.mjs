async function run() {
  console.log('1. Logging in as admin...');
  const loginRes = await fetch('http://localhost:3000/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'eurobonus2026' }),
  });
  const cookie = loginRes.headers.get('set-cookie');
  console.log('Login status:', loginRes.status, 'Cookie:', !!cookie);

  console.log('2. Calling POST /api/admin/sync-partner ...');
  const syncRes = await fetch('http://localhost:3000/api/admin/sync-partner', {
    method: 'POST',
    headers: { Cookie: cookie || '' },
  });
  const syncData = await syncRes.json();
  console.log('Sync response:', JSON.stringify(syncData, null, 2));

  console.log('3. Checking DB after sync...');
  const cfgRes = await fetch('http://localhost:3000/api/config');
  const cfg = await cfgRes.json();
  console.log('Total stores in config:', cfg.stores?.length);
  console.log('Last partner sync:', cfg.lastPartnerSync);
  
  // Show a few sample stores
  const sample = cfg.stores.filter(s => s.partnerRule?.hasPartnerLink).slice(0, 5);
  console.log('Sample partner stores:');
  for (const s of sample) {
    console.log(` - ${s.name} (${s.slug}): ${s.partnerRule.bonusPer100Kr}p / 100kr (Campaign: ${s.partnerRule.isCampaign})`);
  }
}

run().catch(console.error);
