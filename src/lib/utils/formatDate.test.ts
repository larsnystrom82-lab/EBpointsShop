import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatLastChecked } from './formatDate';

describe('formatLastChecked', () => {
  beforeEach(() => {
    // Lock system time to 2026-10-02 13:15:00 UTC (15:15 CEST or similar)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-02T13:15:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats an earlier timestamp from today with time in Swedish', () => {
    // 10:47:57 UTC is today
    const res = formatLastChecked('2026-10-02T10:47:57.278Z');
    expect(res).toMatch(/^Senast kontrollerad idag \d{2}:\d{2}$/);
  });

  it('never displays a timestamp in the future (clamps to now)', () => {
    // Pass a future timestamp like 14:32 UTC (when system clock is locked to 13:15 UTC)
    const futureTime = '2026-10-02T14:32:00Z';
    const res = formatLastChecked(futureTime);
    
    // It should clamp to now (13:15 in UTC or local equivalent) and NOT show 14:32
    expect(res).not.toContain('14:32');
    expect(res).toMatch(/^Senast kontrollerad idag \d{2}:\d{2}$/);
  });

  it('handles fallback when timestamp is missing or invalid', () => {
    expect(formatLastChecked(undefined)).toBe('Senast kontrollerad idag');
    expect(formatLastChecked('not-a-date')).toBe('Senast kontrollerad idag');
  });

  it('supports custom prefix', () => {
    const res = formatLastChecked('2026-10-02T10:47:57.278Z', 'Kontrollerad');
    expect(res).toMatch(/^Kontrollerad idag \d{2}:\d{2}$/);
  });

  it('formats yesterday properly', () => {
    const res = formatLastChecked('2026-10-01T12:00:00Z');
    expect(res).toMatch(/^Senast kontrollerad igår \d{2}:\d{2}$/);
  });
});
