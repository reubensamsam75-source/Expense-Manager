/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TimeframePeriod } from '../types';

function toIsoDateLocal(d: Date): string {
  const yyyy = d.getFullYear().toString();
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

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

  month += 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }

  const daysInNextMonth = new Date(year, month, 0).getDate();
  const clampedDay = Math.min(day, daysInNextMonth);

  const yyyy = year.toString();
  const mm = month.toString().padStart(2, '0');
  const dd = clampedDay.toString().padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Calculates the next occurrence date based on daily, weekly, monthly, or yearly frequency.
 */
export function getNextOccurrenceDate(dateStr: string, frequency: TimeframePeriod): string {
  if (!dateStr || !dateStr.includes('-')) {
    dateStr = new Date().toISOString().split('T')[0];
  }

  if (frequency === 'monthly') {
    return getNextMonthDate(dateStr);
  }

  const [year, month, day] = dateStr.split('-').map(Number);

  if (frequency === 'daily') {
    const d = new Date(year, month - 1, day + 1);
    return toIsoDateLocal(d);
  }

  if (frequency === 'weekly') {
    const d = new Date(year, month - 1, day + 7);
    return toIsoDateLocal(d);
  }

  // yearly
  const nextYear = year + 1;
  const maxDaysInMonth = new Date(nextYear, month, 0).getDate();
  const clampedDay = Math.min(day, maxDaysInMonth);
  return `${nextYear}-${month.toString().padStart(2, '0')}-${clampedDay.toString().padStart(2, '0')}`;
}

/**
 * Checks whether a YYYY-MM-DD transaction date falls inside the selected timeframe period.
 */
export function isDateInTimeframe(
  dateStr: string,
  period: TimeframePeriod,
  referenceDate: Date = new Date()
): boolean {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

  const todayStr = toIsoDateLocal(referenceDate);

  if (period === 'daily') {
    return dateStr === todayStr;
  }

  if (period === 'weekly') {
    const [y, m, d] = dateStr.split('-').map(Number);
    const txTime = new Date(y, m - 1, d).getTime();
    const endOfToday = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate()
    ).getTime();
    const startOfWeek = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate() - 6
    ).getTime();
    return txTime >= startOfWeek && txTime <= endOfToday;
  }

  if (period === 'monthly') {
    const monthPrefix = `${referenceDate.getFullYear()}-${(referenceDate.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`;
    return dateStr.startsWith(monthPrefix);
  }

  // yearly
  const yearPrefix = `${referenceDate.getFullYear()}-`;
  return dateStr.startsWith(yearPrefix);
}

export function getTimeframeLabel(period: TimeframePeriod): string {
  switch (period) {
    case 'daily':
      return 'Today';
    case 'weekly':
      return 'Last 7 Days';
    case 'monthly':
      return 'This Month';
    case 'yearly':
      return 'This Year';
  }
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
