async function test() {
  const pages = Array.from({ length: 15 }, (_, i) => i + 1);
  const results = await Promise.all(
    pages.map(async (page) => {
      const res = await fetch(
        `https://onlineshopping.loyaltykey.com/api/v1/shops?filter[channel]=SAS&filter[language]=sv&filter[country]=SE&page=${page}`
      );
      return res.json();
    })
  );

  const allShops = results.flatMap((r) => r.data || []);
  console.log(`Fetched ${allShops.length} shops.`);

  // Check how many have campaign
  const campaigns = allShops.filter((s) => s.has_campaign === 1 || s.points_campaign > 0);
  console.log(`Shops with campaign: ${campaigns.length}`);
  console.log('Sample campaign shop:', campaigns[0]?.name, 'points:', campaigns[0]?.points, 'campaign points:', campaigns[0]?.points_campaign);

  // Check overlap with common stores
  const common = ['cervera', 'elgiganten', 'ahlens', 'kitchentime', 'bagaren-och-kocken', 'stadium', 'adlibris', 'zalando', 'ikea'];
  for (const c of common) {
    const found = allShops.find((s) => s.slug.includes(c) || s.name.toLowerCase().includes(c));
    console.log(`Common store "${c}":`, found ? `Found "${found.name}" (slug: ${found.slug}, points: ${found.points})` : 'Not in SAS Online Shopping');
  }
}

test().catch(console.error);
