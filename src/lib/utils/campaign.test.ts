import { describe, it, expect } from 'vitest';
import { isCampaignActive, getCampaignRemainingInfo, getCampaignOfferSummary } from './campaign';

describe('campaign utilities', () => {
  const mockNow = new Date('2026-10-08T12:00:00Z');

  describe('isCampaignActive', () => {
    it('returns false when isCampaign is false or undefined', () => {
      expect(isCampaignActive(false, '2026-10-15', mockNow)).toBe(false);
      expect(isCampaignActive(undefined, '2026-10-15', mockNow)).toBe(false);
      expect(isCampaignActive(null, '2026-10-15', mockNow)).toBe(false);
    });

    it('returns true when isCampaign is true and no validUntil provided', () => {
      expect(isCampaignActive(true, null, mockNow)).toBe(true);
      expect(isCampaignActive(true, undefined, mockNow)).toBe(true);
      expect(isCampaignActive(true, '', mockNow)).toBe(true);
    });

    it('returns true when validUntil date is in the future', () => {
      expect(isCampaignActive(true, '2026-10-11', mockNow)).toBe(true);
      expect(isCampaignActive(true, '2026-10-31', mockNow)).toBe(true);
    });

    it('returns true when validUntil is today (valid through end of day)', () => {
      expect(isCampaignActive(true, '2026-10-08', mockNow)).toBe(true);
    });

    it('returns false when validUntil date is in the past', () => {
      expect(isCampaignActive(true, '2026-10-07', mockNow)).toBe(false);
      expect(isCampaignActive(true, '2026-09-30', mockNow)).toBe(false);
    });

    it('returns false when validUntil text indicates expired relative time', () => {
      expect(isCampaignActive(true, 'för 1 dag sedan', mockNow)).toBe(false);
    });
  });

  describe('getCampaignRemainingInfo', () => {
    it('returns null when validUntil is empty or null', () => {
      expect(getCampaignRemainingInfo(null, mockNow)).toBeNull();
      expect(getCampaignRemainingInfo('', mockNow)).toBeNull();
    });

    it('correctly calculates remaining days and formatting for future dates', () => {
      const info = getCampaignRemainingInfo('2026-10-11', mockNow);
      expect(info).not.toBeNull();
      expect(info?.daysLeft).toBe(3);
      expect(info?.isExpired).toBe(false);
      expect(info?.text).toBe('3 dagar kvar');
      expect(info?.fullText).toContain('3 dagar kvar');
      expect(info?.endDateFormatted).toContain('11 okt');
    });

    it('correctly handles tomorrow', () => {
      const info = getCampaignRemainingInfo('2026-10-09', mockNow);
      expect(info).not.toBeNull();
      expect(info?.daysLeft).toBe(1);
      expect(info?.isExpired).toBe(false);
      expect(info?.text).toBe('1 dag kvar');
      expect(info?.fullText).toContain('imorgon');
    });

    it('correctly handles today', () => {
      const info = getCampaignRemainingInfo('2026-10-08', mockNow);
      expect(info).not.toBeNull();
      expect(info?.daysLeft).toBe(0);
      expect(info?.isExpired).toBe(false);
      expect(info?.text).toBe('Sista dagen idag');
      expect(info?.fullText).toContain('idag');
    });

    it('correctly handles expired dates', () => {
      const info = getCampaignRemainingInfo('2026-10-07', mockNow);
      expect(info).not.toBeNull();
      expect(info?.isExpired).toBe(true);
      expect(info?.text).toBe('Utgången');
    });
  });

  describe('getCampaignOfferSummary', () => {
    it('returns 4x poäng for Björn Borg (100p vs regular 25p)', () => {
      const summary = getCampaignOfferSummary({
        currentBonusPer100Kr: 100,
        regularBonusPer100Kr: 25,
      });
      expect(summary).not.toBeNull();
      expect(summary?.badgeText).toBe('4x poäng');
      expect(summary?.detailText).toContain('Just nu 100 p / 100 kr (ord. 25 p / 100 kr)');
    });

    it('returns Dubbla poäng when points are doubled (50p vs regular 25p)', () => {
      const summary = getCampaignOfferSummary({
        currentBonusPer100Kr: 50,
        regularBonusPer100Kr: 25,
      });
      expect(summary).not.toBeNull();
      expect(summary?.badgeText).toBe('Dubbla poäng');
      expect(summary?.detailText).toContain('Just nu 50 p / 100 kr (ord. 25 p / 100 kr)');
    });

    it('returns Trippla poäng when points are tripled (75p vs regular 25p)', () => {
      const summary = getCampaignOfferSummary({
        currentBonusPer100Kr: 75,
        regularBonusPer100Kr: 25,
      });
      expect(summary).not.toBeNull();
      expect(summary?.badgeText).toBe('Trippla poäng');
    });

    it('returns +X p extra when ratio is non-integer (75p vs regular 50p)', () => {
      const summary = getCampaignOfferSummary({
        currentBonusPer100Kr: 75,
        regularBonusPer100Kr: 50,
      });
      expect(summary).not.toBeNull();
      expect(summary?.badgeText).toBe('+25 p extra');
    });

    it('handles fixed offer campaign (BookBeat 1000p vs regular 400p)', () => {
      const summary = getCampaignOfferSummary({
        currentFixedPoints: 1000,
        regularFixedPoints: 400,
      });
      expect(summary).not.toBeNull();
      expect(summary?.badgeText).toBe('+600 p extra');
      expect(summary?.detailText).toContain('(ord. 400 p)');
    });

    it('returns null if no regular points or current points <= regular points', () => {
      expect(getCampaignOfferSummary({ currentBonusPer100Kr: 25, regularBonusPer100Kr: 25 })).toBeNull();
      expect(getCampaignOfferSummary({ currentBonusPer100Kr: 25, regularBonusPer100Kr: undefined })).toBeNull();
    });
  });
});

