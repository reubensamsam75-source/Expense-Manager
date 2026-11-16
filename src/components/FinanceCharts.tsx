/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Transaction, Currency, TimeframePeriod } from '../types';
import { CATEGORY_STYLES } from '../utils/mockData';
import { formatAmount } from '../utils/currency';
import { isDateInTimeframe, getTimeframeLabel } from '../utils/dateUtils';

interface FinanceChartsProps {
  transactions: Transaction[];
  activeCurrency: Currency;
  timeframe?: TimeframePeriod;
}

export const FinanceCharts: React.FC<FinanceChartsProps> = ({
  transactions,
  activeCurrency,
  timeframe: rawTimeframe
}) => {
  const timeframe: TimeframePeriod = rawTimeframe ?? 'monthly';
  const now = useMemo(() => new Date(), []);
  const periodLabel = getTimeframeLabel(timeframe);

  // Filter expenses for the active timeframe
  const expenses = useMemo(() => {
    return transactions.filter(
      (t) => t.type === 'expense' && isDateInTimeframe(t.date, timeframe, now)
    );
  }, [transactions, timeframe, now]);

  const totalExpense = useMemo(() => {
    return expenses.reduce((sum, t) => sum + t.amount, 0);
  }, [expenses]);

  // Aggregate by category
  const categoryData = useMemo(() => {
    const agg: Record<string, number> = {};
    expenses.forEach((e) => {
      agg[e.category] = (agg[e.category] || 0) + e.amount;
    });

    const list = Object.entries(agg).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0
    }));

    return list.sort((a, b) => b.amount - a.amount);
  }, [expenses, totalExpense]);

  // Dynamic breakdown bars based on daily / weekly / monthly / yearly
  const breakdownBars = useMemo(() => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const toIso = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (timeframe === 'daily') {
      // Show 5-day trajectory ending Today so daily comparison is visible
      const buckets: Array<{ label: string; value: number }> = [];
      for (let offset = 4; offset >= 0; offset--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
        const iso = toIso(d);
        const sum = transactions
          .filter((t) => t.type === 'expense' && t.date === iso)
          .reduce((acc, t) => acc + t.amount, 0);
        const label =
          offset === 0
            ? 'Today'
            : offset === 1
              ? 'Yest'
              : d.toLocaleDateString(undefined, { weekday: 'short' });
        buckets.push({ label, value: sum });
      }
      return buckets;
    }

    if (timeframe === 'weekly') {
      // Show 7 daily bars for the last 7 days
      const buckets: Array<{ label: string; value: number }> = [];
      for (let offset = 6; offset >= 0; offset--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
        const iso = toIso(d);
        const sum = expenses
          .filter((t) => t.date === iso)
          .reduce((acc, t) => acc + t.amount, 0);
        buckets.push({
          label: d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3),
          value: sum
        });
      }
      return buckets;
    }

    if (timeframe === 'yearly') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const totals = new Array(12).fill(0);
      expenses.forEach((e) => {
        const monthIdx = parseInt(e.date.split('-')[1] || '1', 10) - 1;
        if (monthIdx >= 0 && monthIdx < 12) {
          totals[monthIdx] += e.amount;
        }
      });
      return months.map((m, idx) => ({ label: m, value: totals[idx] }));
    }

    // Default: monthly (Week 1..4)
    const weeks = [0, 0, 0, 0];
    expenses.forEach((e) => {
      const day = parseInt(e.date.split('-')[2] || '1', 10);
      if (day <= 7) weeks[0] += e.amount;
      else if (day <= 14) weeks[1] += e.amount;
      else if (day <= 21) weeks[2] += e.amount;
      else weeks[3] += e.amount;
    });
    return weeks.map((val, i) => ({ label: `Wk ${i + 1}`, value: val }));
  }, [timeframe, expenses, transactions, now]);

  const maxBarValue = useMemo(() => {
    const max = Math.max(...breakdownBars.map((b) => b.value), 0);
    return max > 0 ? max : 100;
  }, [breakdownBars]);

  // Donut chart path rendering parameters
  const donutRadius = 50;
  const donutStrokeWidth = 14;
  const donutCenter = 60;

  const donutSlices = useMemo(() => {
    let accumulatedAngle = 0;
    return categoryData.map((item) => {
      const angle = (item.percentage / 100) * 360;
      const startAngle = accumulatedAngle;
      accumulatedAngle += angle;

      const circumference = 2 * Math.PI * donutRadius;
      const strokeDashoffset = circumference - (item.percentage / 100) * circumference;
      const strokeDasharray = `${circumference} ${circumference}`;

      return {
        ...item,
        strokeDasharray,
        strokeDashoffset,
        rotation: startAngle - 90
      };
    });
  }, [categoryData]);

  const barTitleMap: Record<TimeframePeriod, string> = {
    daily: 'Daily Outflow Trend (5 Days)',
    weekly: 'Daily Expenditures (7 Days)',
    monthly: 'Weekly Expenditures (This Month)',
    yearly: 'Monthly Expenditures (This Year)'
  };

  return (
    <div id="financial-charts-container" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* 1. Category Share Donut */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Category Expense Share ({periodLabel})
          </h3>
          <p className="text-[11px] text-slate-400">
            Total spent ({periodLabel.toLowerCase()}): {formatAmount(totalExpense, activeCurrency)}
          </p>
        </div>

        {totalExpense === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-xs text-slate-400 border border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
            No expenses logged for {periodLabel.toLowerCase()}
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="relative w-32 h-32 shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx={donutCenter}
                  cy={donutCenter}
                  r={donutRadius}
                  fill="transparent"
                  className="stroke-slate-100 dark:stroke-slate-800"
                  strokeWidth={donutStrokeWidth}
                />
                {donutSlices.map((slice, i) => {
                  const style = CATEGORY_STYLES[slice.category] || CATEGORY_STYLES['Others'];
                  const colorClass = style.text.includes('emerald') ? '#34d399' :
                                     style.text.includes('amber') ? '#fbbf24' :
                                     style.text.includes('indigo') ? '#818cf8' :
                                     style.text.includes('blue') ? '#60a5fa' :
                                     style.text.includes('purple') ? '#c084fc' :
                                     style.text.includes('rose') ? '#f43f5e' :
                                     style.text.includes('cyan') ? '#22d3ee' : '#94a3b8';

                  return (
                    <circle
                      key={i}
                      cx={donutCenter}
                      cy={donutCenter}
                      r={donutRadius}
                      fill="transparent"
                      stroke={colorClass}
                      strokeWidth={donutStrokeWidth}
                      strokeDasharray={slice.strokeDasharray}
                      strokeDashoffset={slice.strokeDashoffset}
                      style={{
                        transformOrigin: 'center',
                        transform: `rotate(${slice.rotation}deg)`,
                        transition: 'stroke-dashoffset 0.4s ease'
                      }}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Spent</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white font-mono tabular-nums">
                  {formatAmount(totalExpense, activeCurrency)}
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-2 max-h-36 overflow-y-auto pr-1">
              {categoryData.slice(0, 4).map((item, i) => {
                const style = CATEGORY_STYLES[item.category] || CATEGORY_STYLES['Others'];
                return (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full ${style.bg} border ${style.border}`} />
                      <span className="text-slate-600 dark:text-slate-300 truncate font-medium">{item.category}</span>
                    </div>
                    <span className="text-slate-800 dark:text-slate-100 font-semibold font-mono tabular-nums">
                      {Math.round(item.percentage)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Period Expenditures Bar Chart */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {barTitleMap[timeframe]}
          </h3>
          <p className="text-[11px] text-slate-400">
            Cash outflow breakdown by {timeframe === 'yearly' ? 'month' : timeframe === 'monthly' ? 'week' : 'day'}
          </p>
        </div>

        {breakdownBars.every((b) => b.value === 0) ? (
          <div className="h-44 flex flex-col items-center justify-center text-xs text-slate-400 border border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
            No expenses logged for {periodLabel.toLowerCase()}
          </div>
        ) : (
          <div className="flex h-36 items-end justify-between gap-1 px-1 pt-4">
            {breakdownBars.map((bar, i) => {
              const hPercent = bar.value > 0 ? Math.max((bar.value / maxBarValue) * 100, 6) : 3;
              return (
                <div key={i} className="flex flex-col items-center flex-1 min-w-0 group">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 dark:bg-slate-800 text-white rounded-md text-[10px] px-1.5 py-0.5 mb-1.5 shadow-md z-10 font-mono whitespace-nowrap">
                    {formatAmount(bar.value, activeCurrency)}
                  </div>
                  <div className={`bg-slate-100 dark:bg-slate-800 rounded-md h-24 flex items-end overflow-hidden ${timeframe === 'yearly' ? 'w-3.5 sm:w-5' : 'w-6 sm:w-8'}`}>
                    <div
                      style={{ height: `${hPercent}%` }}
                      className={`w-full rounded-md transition-all ${
                        bar.value > 0
                          ? 'bg-indigo-500 group-hover:bg-indigo-600'
                          : 'bg-slate-200 dark:bg-slate-700/50'
                      }`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-1.5 font-semibold truncate max-w-full">
                    {bar.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
