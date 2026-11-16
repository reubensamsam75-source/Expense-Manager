/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Calculates the exact corresponding date in the next month.
 * Handles month-end clamping (e.g., Jan 31 -> Feb 28 or Feb 29) and year wrap-around.
 */
export function getNextMonthDate(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) {
    const today = new Date();
    dateStr = today.toISOString().split('T')[0];
  }

  const parts = dateStr.split('-');
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10); // 1 - 12
  const day = parseInt(parts[2], 10);

  // Increment month
  month += 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }

  // Find max days in the target next month
  // Passing 0 as day returns the last day of the previous month (so new Date(year, month, 0))
  const daysInNextMonth = new Date(year, month, 0).getDate();
  const clampedDay = Math.min(day, daysInNextMonth);

  const yyyy = year.toString();
  const mm = month.toString().padStart(2, '0');
  const dd = clampedDay.toString().padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Format a YYYY-MM-DD string into a clean readable date, e.g. "Oct 18, 2026"
 */
export function formatReadableDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
}
