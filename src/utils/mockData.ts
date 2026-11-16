/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Transaction, Budget, Goal } from '../types';

export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Housing',
  'Transportation',
  'Entertainment',
  'Healthcare',
  'Education',
  'Others'
] as const;

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investments',
  'Dividends',
  'Business',
  'Bonus & Gifts',
  'Refunds & Cashback',
  'Rental Income',
  'Other Income'
] as const;

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 't-1',
    amount: 3200,
    category: 'Salary',
    date: '2026-06-01',
    description: 'Monthly Salary Payment',
    type: 'income',
    paymentMethod: 'Bank Transfer'
  },
  {
    id: 't-2',
    amount: 1200,
    category: 'Housing',
    date: '2026-06-02',
    description: 'Apartment Rent',
    type: 'expense',
    paymentMethod: 'Bank Transfer',
    isRecurring: true,
    recurringFrequency: 'monthly'
  },
  {
    id: 't-3',
    amount: 84.50,
    category: 'Food & Dining',
    date: '2026-06-05',
    description: 'Weekly Grocery Store Run',
    type: 'expense',
    paymentMethod: 'Debit Card'
  },
  {
    id: 't-4',
    amount: 150.00,
    category: 'Shopping',
    date: '2026-06-10',
    description: 'Summer Wardrobe Clothes',
    type: 'expense',
    paymentMethod: 'Credit Card'
  },
  {
    id: 't-5',
    amount: 45.00,
    category: 'Transportation',
    date: '2026-06-12',
    description: 'Gas Station Refuel',
    type: 'expense',
    paymentMethod: 'Credit Card'
  },
  {
    id: 't-6',
    amount: 15.99,
    category: 'Entertainment',
    date: '2026-06-15',
    description: 'Netflix Premium Subscription',
    type: 'expense',
    paymentMethod: 'Credit Card',
    isRecurring: true,
    recurringFrequency: 'monthly'
  },
  {
    id: 't-7',
    amount: 12.50,
    category: 'Food & Dining',
    date: '2026-06-18',
    description: 'Starbucks Coffee & Pastry',
    type: 'expense',
    paymentMethod: 'Cash'
  },
  {
    id: 't-8',
    amount: 350.00,
    category: 'Freelance',
    date: '2026-06-20',
    description: 'Freelance Web Design Gig',
    type: 'income',
    paymentMethod: 'Bank Transfer'
  },
  {
    id: 't-9',
    amount: 120.00,
    category: 'Healthcare',
    date: '2026-06-22',
    description: 'Dental Checkup Appointment',
    type: 'expense',
    paymentMethod: 'Debit Card'
  },
  {
    id: 't-10',
    amount: 42.10,
    category: 'Food & Dining',
    date: '2026-06-25',
    description: 'Sushi Dinner with Friends',
    type: 'expense',
    paymentMethod: 'Debit Card'
  }
];

export const INITIAL_BUDGETS: Budget[] = [
  { category: 'Food & Dining', limit: 400 },
  { category: 'Shopping', limit: 250 },
  { category: 'Housing', limit: 1200 },
  { category: 'Transportation', limit: 150 },
  { category: 'Entertainment', limit: 100 },
  { category: 'Healthcare', limit: 200 }
];

export const INITIAL_GOALS: Goal[] = [
  {
    id: 'g-1',
    title: 'Japan Vacation Trip',
    targetAmount: 3500,
    currentAmount: 1800,
    deadline: '2026-12-15'
  },
  {
    id: 'g-2',
    title: 'Emergency Rainy Day Fund',
    targetAmount: 5000,
    currentAmount: 3000,
    deadline: '2026-09-30'
  }
];

export const CATEGORY_STYLES: Record<string, { icon: string; bg: string; text: string; border: string }> = {
  // Expense categories
  'Food & Dining': { icon: 'Utensils', bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  'Shopping': { icon: 'ShoppingBag', bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  'Housing': { icon: 'Home', bg: 'bg-indigo-50 dark:bg-indigo-950/20', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
  'Transportation': { icon: 'Car', bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  'Entertainment': { icon: 'Tv', bg: 'bg-purple-50 dark:bg-purple-950/20', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  'Healthcare': { icon: 'HeartPulse', bg: 'bg-rose-50 dark:bg-rose-950/20', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800' },
  'Education': { icon: 'GraduationCap', bg: 'bg-cyan-50 dark:bg-cyan-950/20', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800' },
  'Others': { icon: 'DollarSign', bg: 'bg-slate-50 dark:bg-slate-950/20', text: 'text-slate-700 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-800' },

  // Income categories
  'Salary': { icon: 'Wallet', bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  'Freelance': { icon: 'Sparkles', bg: 'bg-teal-50 dark:bg-teal-950/20', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800' },
  'Investments': { icon: 'TrendingUp', bg: 'bg-indigo-50 dark:bg-indigo-950/20', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
  'Dividends': { icon: 'PieChart', bg: 'bg-cyan-50 dark:bg-cyan-950/20', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800' },
  'Business': { icon: 'Coins', bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  'Bonus & Gifts': { icon: 'Sparkle', bg: 'bg-purple-50 dark:bg-purple-950/20', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  'Refunds & Cashback': { icon: 'RefreshCw', bg: 'bg-lime-50 dark:bg-lime-950/20', text: 'text-lime-700 dark:text-lime-400', border: 'border-lime-200 dark:border-lime-800' },
  'Rental Income': { icon: 'Home', bg: 'bg-sky-50 dark:bg-sky-950/20', text: 'text-sky-700 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-800' },
  'Other Income': { icon: 'TrendingUp', bg: 'bg-teal-50 dark:bg-teal-950/20', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800' },
  'Income': { icon: 'TrendingUp', bg: 'bg-teal-50 dark:bg-teal-950/20', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800' }
};
