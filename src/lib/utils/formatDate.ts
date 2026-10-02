/**
 * Formats a last checked timestamp in clean Swedish locale.
 * Guarantees that future timestamps are never displayed.
 */
export function formatLastChecked(
  isoString?: string,
  prefix: string = 'Senast kontrollerad'
): string {
  if (!isoString) {
    return `${prefix} idag`;
  }

  const parsed = new Date(isoString);
  if (isNaN(parsed.getTime())) {
    return `${prefix} idag`;
  }

  const now = new Date();
  // Ensure we never show a time in the future
  const date = parsed.getTime() > now.getTime() ? now : parsed;

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const timeStr = date.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isToday) {
    return `${prefix} idag ${timeStr}`;
  } else if (isYesterday) {
    return `${prefix} igår ${timeStr}`;
  } else {
    const dateStr = date.toLocaleDateString('sv-SE', {
      day: 'numeric',
      month: 'short',
    });
    return `${prefix} ${dateStr} ${timeStr}`;
  }
}
