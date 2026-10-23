export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const g = globalThis as unknown as {
      __poangpilotenDailySyncStarted?: boolean;
      __poangpilotenLastSyncDate?: string;
    };

    if (g.__poangpilotenDailySyncStarted) {
      return;
    }
    g.__poangpilotenDailySyncStarted = true;

    // Check every 60 seconds if UTC time is 01:00 (03:00 CEST / 02:00 CET)
    setInterval(async () => {
      try {
        const now = new Date();
        const utcHour = now.getUTCHours();
        const utcMinute = now.getUTCMinutes();
        const dateKey = now.toISOString().slice(0, 10); // YYYY-MM-DD

        if (utcHour === 1 && utcMinute < 5 && g.__poangpilotenLastSyncDate !== dateKey) {
          g.__poangpilotenLastSyncDate = dateKey;
          console.log(`[DailySync] Startar schemalagd nattlig synkronisering (${now.toISOString()})...`);

          const { syncSasPartnerStores } = await import('@/lib/services/sas-partner-sync');
          const { syncSasGiftCardStores } = await import('@/lib/services/sas-giftcard-sync');
          const { syncZupergiftCatalog } = await import('@/lib/services/zupergift-sync');

          const pRes = await syncSasPartnerStores().catch((err) => ({
            success: false,
            message: String(err),
          }));
          console.log('[DailySync] Partner-synk:', pRes.message);

          const gcRes = await syncSasGiftCardStores().catch((err) => ({
            success: false,
            message: String(err),
          }));
          console.log('[DailySync] SAS Presentkort-synk:', gcRes.message);

          const zgRes = await syncZupergiftCatalog().catch((err) => ({
            success: false,
            message: String(err),
          }));
          console.log('[DailySync] Zupergift-synk:', zgRes.message);
        }
      } catch (err) {
        console.error('[DailySync] Fel vid schemalagd synk:', err);
      }
    }, 60_000);
  }
}
