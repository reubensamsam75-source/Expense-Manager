/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Transaction, Currency } from '../types';
import { LucideIcon } from './LucideIcon';
import { CATEGORY_STYLES } from '../utils/mockData';
import { formatAmount } from '../utils/currency';
import { FinancialCalendar } from './FinancialCalendar';
import { motion, AnimatePresence } from 'motion/react';

interface TransactionListProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  activeCurrency: Currency;
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDeleteTransaction, activeCurrency }) => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense' | 'recurring'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(8);

  const recurringCount = useMemo(() => {
    return transactions.filter(t => t.isRecurring).length;
  }, [transactions]);

  const categories = useMemo(() => {
    return ['all', ...Array.from(new Set(transactions.map(t => t.category)))];
  }, [transactions]);

  const paymentMethods = useMemo(() => {
    return ['all', ...Array.from(new Set(transactions.map(t => t.paymentMethod)))];
  }, [transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (t.sourceApp || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        let matchesType = true;
        if (selectedType === 'recurring') {
          matchesType = Boolean(t.isRecurring);
        } else if (selectedType !== 'all') {
          matchesType = t.type === selectedType;
        }

        const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
        const matchesPayment = selectedPayment === 'all' || t.paymentMethod === selectedPayment;
        return matchesSearch && matchesType && matchesCategory && matchesPayment;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, selectedType, selectedCategory, selectedPayment]);

  const displayedTransactions = useMemo(() => {
    return filteredTransactions.slice(0, visibleCount);
  }, [filteredTransactions, visibleCount]);

  return (
    <div id="transaction-list-container" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <LucideIcon name={viewMode === 'calendar' ? 'Calendar' : 'Coins'} className="text-indigo-600 dark:text-indigo-400" size={20} />
            <span>{viewMode === 'calendar' ? 'Financial Calendar' : 'Transaction Ledger'}</span>
          </h2>
          <p className="text-xs text-slate-400">
            {viewMode === 'calendar' 
              ? `Interactive monthly calendar with ${recurringCount} recurring commitments`
              : `Showing ${filteredTransactions.length} of ${transactions.length} records`}
          </p>
        </div>

        {/* View mode toggle (List vs Calendar) */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          <button
            id="btn-view-list"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <LucideIcon name="Coins" size={13} />
            <span>Ledger</span>
          </button>
          <button
            id="btn-view-calendar"
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              viewMode === 'calendar'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <LucideIcon name="Calendar" size={13} />
            <span>Calendar</span>
            {recurringCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                {recurringCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Render Calendar View or List View */}
      {viewMode === 'calendar' ? (
        <FinancialCalendar
          transactions={transactions}
          activeCurrency={activeCurrency}
          onDeleteTransaction={onDeleteTransaction}
        />
      ) : (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative w-full">
            <span className="absolute left-3 top-2.5 text-slate-400">
              <LucideIcon name="Search" size={14} />
            </span>
            <input
              id="transaction-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by description or category..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            {/* Type Filter */}
            <select
              id="filter-type-select"
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value as any); setVisibleCount(8); }}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 focus:outline-none font-medium"
            >
              <option value="all">All Types</option>
              <option value="expense">Expenses Only</option>
              <option value="income">Income Only</option>
              <option value="recurring">Recurring Only (🔁)</option>
            </select>

            {/* Category Filter */}
            <select
              id="filter-category-select"
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setVisibleCount(8); }}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 focus:outline-none font-medium"
            >
              <option value="all">All Categories</option>
              {categories.filter(c => c !== 'all').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Payment Filter */}
            <select
              id="filter-payment-select"
              value={selectedPayment}
              onChange={(e) => { setSelectedPayment(e.target.value); setVisibleCount(8); }}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 focus:outline-none font-medium"
            >
              <option value="all">All Methods</option>
              {paymentMethods.filter(p => p !== 'all').map(pm => (
                <option key={pm} value={pm}>{pm}</option>
              ))}
            </select>
          </div>

          {/* Transactions List */}
          <div className="overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              <AnimatePresence initial={false}>
                {displayedTransactions.length > 0 ? (
                  displayedTransactions.map((tx, index) => {
                    const style = CATEGORY_STYLES[tx.category] || CATEGORY_STYLES['Others'];
                    return (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.2) }}
                        className="flex items-center justify-between py-3 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 px-1 rounded-lg transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2.5 rounded-xl shrink-0 ${style.bg} ${style.text}`}>
                            <LucideIcon name={tx.type === 'income' ? 'TrendingUp' : style.icon} size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate pr-1">
                                {tx.description}
                              </p>
                              {tx.isRecurring && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40 shrink-0">
                                  <LucideIcon name="Repeat" size={9} />
                                  Recurring
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5 flex-wrap">
                              <span className="font-mono tabular-nums">{tx.date}</span>
                              <span aria-hidden="true">·</span>
                              <span>{tx.paymentMethod}</span>
                              {tx.sourceApp && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                    via {tx.sourceApp}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right shrink-0">
                            <p className={`font-bold text-sm ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-800 dark:text-white'}`}>
                              {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount, activeCurrency)}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {tx.category}
                            </p>
                          </div>

                          <button
                            onClick={() => onDeleteTransaction(tx.id)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition shrink-0"
                            title="Delete record"
                          >
                            <LucideIcon name="Trash2" size={14} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-12 text-center text-slate-400 space-y-2"
                  >
                    <div className="inline-flex p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl text-slate-400 mb-2">
                      <LucideIcon name="Search" size={24} />
                    </div>
                    <p className="text-sm font-medium">No matching transactions found</p>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">Try updating your filters or search keyword above.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Load More Button */}
            {filteredTransactions.length > visibleCount && (
              <div className="text-center pt-4">
                <button
                  onClick={() => setVisibleCount(prev => prev + 8)}
                  className="px-4 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Load More Records
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
