/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Currency } from '../types';

export const CURRENCY_LIST: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar (USD)', rate: 1.0 },
  { code: 'EUR', symbol: '€', name: 'Euro (EUR)', rate: 0.92 },
  { code: 'GBP', symbol: '£', name: 'British Pound (GBP)', rate: 0.78 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (JPY)', rate: 155.5 },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CAD)', rate: 1.36 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (AUD)', rate: 1.51 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)', rate: 83.5 },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc (CHF)', rate: 0.89 }
];

export function formatAmount(amount: number, currency: Currency, options?: Intl.NumberFormatOptions): string {
  const converted = amount * currency.rate;
  return `${currency.symbol}${converted.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options
  })}`;
}
