/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Budget, Transaction, Currency } from '../types';
import { LucideIcon } from './LucideIcon';
import { CATEGORY_STYLES } from '../utils/mockData';
import { formatAmount } from '../utils/currency';
import { motion, AnimatePresence } from 'motion/react';

interface BudgetSectionProps {
  budgets: Budget[];
  transactions: Transaction[];
  onUpdateBudget: (category: string, limit: number) => void;
  activeCurrency: Currency;
}

export const BudgetSection: React.FC<BudgetSectionProps> = ({ budgets, transactions, onUpdateBudget, activeCurrency }) => {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [tempLimit, setTempLimit] = useState('');

  // Calculate current month's spending by category (in USD base)
  const getCategorySpending = (category: string): number => {
    const currentMonthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    return transactions
      .filter(t => t.type === 'expense' && t.category === category && t.date.startsWith(currentMonthStr))
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const handleStartEdit = (category: string, currentLimit: number) => {
    setEditingCategory(category);
    setTempLimit((currentLimit * activeCurrency.rate).toFixed(0));
  };

  const handleSaveLimit = (category: string) => {
    const parsed = parseFloat(tempLimit);
    if (isNaN(parsed) || parsed < 0) {
      alert('Please enter a valid positive number');
      return;
    }
    // Limit is entered in active currency, convert back to USD base
    const baseLimit = parsed / activeCurrency.rate;
    onUpdateBudget(category, baseLimit);
    setEditingCategory(null);
  };

  const allCategories = [
    'Food & Dining',
    'Shopping',
    'Housing',
    'Transportation',
    'Entertainment',
    'Healthcare',
    'Education',
    'Others'
  ];

  return (
    <div id="budget-section-container" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <LucideIcon name="PieChart" className="text-indigo-600 dark:text-indigo-400" size={20} />
          <span>Category Budgets</span>
        </h2>
        <span className="text-xs text-slate-400 font-mono">
          Monthly Active
        </span>
      </div>

      <div className="space-y-4">
        {budgets.map((budget) => {
          const spent = getCategorySpending(budget.category);
          const percent = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
          const roundedPercent = Math.min(Math.round(percent), 100);
          
          // Color coding based on budget percentage
          let progressColor = 'bg-emerald-500';
          let textColor = 'text-emerald-700 dark:text-emerald-400';
          let bgColor = 'bg-emerald-500/10';
          
          if (percent >= 90) {
            progressColor = 'bg-rose-500';
            textColor = 'text-rose-600 dark:text-rose-400 font-semibold';
            bgColor = 'bg-rose-500/10';
          } else if (percent >= 70) {
            progressColor = 'bg-amber-500';
            textColor = 'text-amber-600 dark:text-amber-400';
            bgColor = 'bg-amber-500/10';
          }

          const style = CATEGORY_STYLES[budget.category] || CATEGORY_STYLES['Others'];

          return (
            <div key={budget.category} className="border border-slate-100 dark:border-slate-800/80 rounded-xl p-3.5 hover:shadow-2xs transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${style.bg} ${style.text}`}>
                    <LucideIcon name={style.icon} size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">{budget.category}</h3>
                    <p className="text-xs text-slate-400">
                      Spent {formatAmount(spent, activeCurrency)}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <AnimatePresence mode="wait">
                    {editingCategory === budget.category ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex items-center gap-1.5"
                      >
                        <div className="relative">
                          <span className="absolute left-2 top-1 text-xs text-slate-400 font-mono">{activeCurrency.symbol}</span>
                          <input
                            type="number"
                            value={tempLimit}
                            onChange={(e) => setTempLimit(e.target.value)}
                            className="w-20 pl-4 pr-1 py-1 text-xs bg-slate-50 dark:bg-slate-950 rounded-md border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                            autoFocus
                          />
                        </div>
                        <button
                          onClick={() => handleSaveLimit(budget.category)}
                          className="p-1 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition"
                        >
                          <LucideIcon name="CheckCircle" size={13} />
                        </button>
                        <button
                          onClick={() => setEditingCategory(null)}
                          className="p-1 border border-slate-200 dark:border-slate-800 text-slate-400 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        >
                          <LucideIcon name="X" size={13} />
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2"
                      >
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Budget: <span className="font-bold text-slate-800 dark:text-white">{formatAmount(budget.limit, activeCurrency)}</span>
                        </div>
                        <button
                          onClick={() => handleStartEdit(budget.category, budget.limit)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition"
                          title="Adjust Limit"
                        >
                          <LucideIcon name="Calendar" size={13} />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${progressColor}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${roundedPercent}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>{roundedPercent}% allocated</span>
                  <span className={`font-medium ${textColor}`}>
                    {spent > budget.limit 
                      ? `Over by ${formatAmount(spent - budget.limit, activeCurrency)}` 
                      : `${formatAmount(budget.limit - spent, activeCurrency)} left`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add new budget limit quickly for missing categories */}
      {budgets.length < allCategories.length && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Untracked Categories</h3>
          <div className="flex flex-wrap gap-2">
            {allCategories
              .filter(cat => !budgets.some(b => b.category === cat))
              .map(cat => (
                <button
                  key={cat}
                  onClick={() => onUpdateBudget(cat, 200)}
                  className="px-2.5 py-1 text-xs font-medium border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg bg-slate-50 dark:bg-slate-950/20 text-slate-500 transition-all flex items-center gap-1.5"
                >
                  <LucideIcon name="Plus" size={12} />
                  <span>Track {cat}</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
