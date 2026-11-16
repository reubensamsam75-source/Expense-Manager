/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Transaction, Currency } from '../types';
import { CATEGORY_STYLES } from '../utils/mockData';
import { formatAmount } from '../utils/currency';

interface FinanceChartsProps {
  transactions: Transaction[];
  activeCurrency: Currency;
}

export const FinanceCharts: React.FC<FinanceChartsProps> = ({ transactions, activeCurrency }) => {
  const currentMonthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"

  // Filter current month expenses
  const expenses = useMemo(() => {
    return transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonthStr));
  }, [transactions, currentMonthStr]);

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

  // Aggregate weekly spending
  const weeklyData = useMemo(() => {
    const weeks = [0, 0, 0, 0]; // W1 (1-7), W2 (8-14), W3 (15-21), W4 (22+)
    expenses.forEach((e) => {
      const day = parseInt(e.date.split('-')[2] || '1', 10);
      if (day <= 7) weeks[0] += e.amount;
      else if (day <= 14) weeks[1] += e.amount;
      else if (day <= 21) weeks[2] += e.amount;
      else weeks[3] += e.amount;
    });
    return weeks;
  }, [expenses]);

  const maxWeekly = useMemo(() => {
    const max = Math.max(...weeklyData);
    return max > 0 ? max : 100;
  }, [weeklyData]);

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

      // Calculate path coordinates for SVG stroke-dasharray approach
      const circumference = 2 * Math.PI * donutRadius;
      const strokeDashoffset = circumference - (item.percentage / 100) * circumference;
      const strokeDasharray = `${circumference} ${circumference}`;
      
      // Calculate start and end coordinates for tooltip placements if needed
      return {
        ...item,
        strokeDasharray,
        strokeDashoffset,
        rotation: startAngle - 90 // Start at top
      };
    });
  }, [categoryData]);

  return (
    <div id="financial-charts-container" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
      
      {/* 1. Category Share Donut */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Category Expense Share</h3>
          <p className="text-[10px] text-slate-400">Total spent this month: {formatAmount(totalExpense, activeCurrency)}</p>
        </div>

        {totalExpense === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-xs text-slate-400 border border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
            No expenses logged for this month
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
              {/* Inner Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Spent</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">{formatAmount(totalExpense, activeCurrency)}</span>
              </div>
            </div>

            {/* Legends List */}
            <div className="flex-1 space-y-2 max-h-36 overflow-y-auto pr-1">
              {categoryData.slice(0, 4).map((item, i) => {
                const style = CATEGORY_STYLES[item.category] || CATEGORY_STYLES['Others'];
                return (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full ${style.bg} border ${style.border}`} />
                      <span className="text-slate-600 dark:text-slate-300 truncate font-medium">{item.category}</span>
                    </div>
                    <span className="text-slate-800 dark:text-slate-100 font-semibold font-mono">
                      {Math.round(item.percentage)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Weekly Spending Bar Chart */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Weekly Expenditures</h3>
          <p className="text-[10px] text-slate-400">Weekly breakdown of cash outflows</p>
        </div>

        {totalExpense === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-xs text-slate-400 border border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
            No expenses logged for this month
          </div>
        ) : (
          <div className="flex h-32 items-end justify-between px-2 pt-4">
            {weeklyData.map((val, i) => {
              const hPercent = (val / maxWeekly) * 100;
              return (
                <div key={i} className="flex flex-col items-center flex-1 group">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 dark:bg-slate-800 text-white rounded-md text-[10px] px-1.5 py-0.5 mb-1.5 shadow-md z-10 font-mono">
                    {formatAmount(val, activeCurrency)}
                  </div>
                  {/* Bar shape */}
                  <div className="w-8 bg-slate-100 dark:bg-slate-800 rounded-md h-24 flex items-end overflow-hidden">
                    <div
                      style={{ height: `${Math.max(hPercent, 5)}%` }}
                      className="w-full bg-indigo-500 group-hover:bg-indigo-600 transition-all rounded-md"
                    />
                  </div>
                  {/* Label */}
                  <span className="text-[10px] text-slate-400 font-mono mt-1.5 font-semibold">
                    Week {i + 1}
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
