/**
 * Helper utilities for partner store and gift card campaigns.
 */

export interface CampaignRemainingInfo {
  text: string;             // e.g. "3 dagar kvar", "Sista dagen idag", "1 dag kvar"
  daysLeft: number;         // number of days remaining (0 = today, negative = expired)
  isExpired: boolean;
  endDateFormatted: string; // e.g. "11 okt"
  fullText: string;         // e.g. "Gäller t.o.m. 11 okt (3 dagar kvar)"
}

/**
 * Checks if a campaign is currently active based on its flag and validUntil date.
 * If campaignValidUntil is in the past, it returns false even if isCampaign is true.
 */
export function isCampaignActive(
  isCampaign: boolean | undefined | null,
  campaignValidUntil: string | null | undefined,
  referenceDate: Date = new Date()
): boolean {
  if (!isCampaign) {
    return false;
  }

  if (!campaignValidUntil || !campaignValidUntil.trim()) {
    // Campaign flagged active without a specific end date
    return true;
  }

  const trimmed = campaignValidUntil.trim();

  // If text says "för X sedan", it's expired
  if (trimmed.toLowerCase().includes(' sedan')) {
    return false;
  }

  // ISO date YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number);
    // Valid through 23:59:59.999 on the specified date
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
    return referenceDate.getTime() <= endOfDay.getTime();
  }

  // Try standard Date parsing for full ISO strings
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return referenceDate.getTime() <= parsed.getTime();
  }

  // If it's a relative Swedish string like "om 2 dagar", it's currently considered active
  return true;
}

/**
 * Calculates remaining time and formatted end date for a campaign.
 */
export function getCampaignRemainingInfo(
  campaignValidUntil: string | null | undefined,
  referenceDate: Date = new Date()
): CampaignRemainingInfo | null {
  if (!campaignValidUntil || !campaignValidUntil.trim()) {
    return null;
  }

  const trimmed = campaignValidUntil.trim();

  // Check for expired relative text like "för 1 dag sedan"
  if (trimmed.toLowerCase().includes(' sedan')) {
    return {
      text: 'Utgången',
      daysLeft: -1,
      isExpired: true,
      endDateFormatted: 'utgången',
      fullText: 'Kampanjen har utgått',
    };
  }

  let endDate: Date | null = null;
  let endOfDay: Date | null = null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number);
    endDate = new Date(year, month - 1, day);
    endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
  } else {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      endDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      endOfDay = parsed;
    }
  }

  if (!endDate || !endOfDay) {
    // If it's a relative string like "om 3 veckor", show as is
    return {
      text: trimmed,
      daysLeft: 1,
      isExpired: false,
      endDateFormatted: trimmed,
      fullText: `Kampanj (${trimmed})`,
    };
  }

  // Format month and day in Swedish locale
  const endDateFormatted = endDate.toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
  });

  const isExpired = referenceDate.getTime() > endOfDay.getTime();

  if (isExpired) {
    return {
      text: 'Utgången',
      daysLeft: -1,
      isExpired: true,
      endDateFormatted,
      fullText: `Kampanjen utgick ${endDateFormatted}`,
    };
  }

  // Calculate calendar days difference (start of today vs start of target day)
  const refStart = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  ).getTime();
  const targetStart = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate()
  ).getTime();

  const daysLeft = Math.max(0, Math.round((targetStart - refStart) / (1000 * 60 * 60 * 24)));

  let text: string;
  let fullText: string;

  if (daysLeft === 0) {
    text = 'Sista dagen idag';
    fullText = `Gäller t.o.m. idag (${endDateFormatted})`;
  } else if (daysLeft === 1) {
    text = '1 dag kvar';
    fullText = `Gäller t.o.m. imorgon (${endDateFormatted})`;
  } else {
    text = `${daysLeft} dagar kvar`;
    fullText = `Gäller t.o.m. ${endDateFormatted} (${daysLeft} dagar kvar)`;
  }

  return {
    text,
    daysLeft,
    isExpired: false,
    endDateFormatted,
    fullText,
  };
}
