/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Transaction, Currency } from '../types';
import { LucideIcon } from './LucideIcon';
import { formatAmount } from '../utils/currency';
import { CATEGORY_STYLES } from '../utils/mockData';
import { motion, AnimatePresence } from 'motion/react';

interface FinancialCalendarProps {
  transactions: Transaction[];
  activeCurrency: Currency;
  onDeleteTransaction?: (id: string) => void;
}

export const FinancialCalendar: React.FC<FinancialCalendarProps> = ({
  transactions,
  activeCurrency,
  onDeleteTransaction
}) => {
  // Calendar navigation state (year & month, 0-indexed month)
  const today = new Date();
  const [viewDate, setViewDate] = useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => today.toISOString().split('T')[0]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth(); // 0 - 11

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthLabel = `${monthNames[viewMonth]} ${viewYear}`;

  // Check if viewing next month
  const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const isViewingNextMonth = viewYear === nextMonthDate.getFullYear() && viewMonth === nextMonthDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const handleToday = () => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateStr(today.toISOString().split('T')[0]);
  };

  const handleJumpToNextMonth = () => {
    setViewDate(new Date(today.getFullYear(), today.getMonth() + 1, 1));
    // Select the same day next month
    const nextMonthDay = Math.min(today.getDate(), new Date(today.getFullYear(), today.getMonth() + 2, 0).getDate());
    const mm = (today.getMonth() + 2 > 12 ? 1 : today.getMonth() + 2).toString().padStart(2, '0');
    const yyyy = today.getMonth() + 2 > 12 ? today.getFullYear() + 1 : today.getFullYear();
    setSelectedDateStr(`${yyyy}-${mm}-${nextMonthDay.toString().padStart(2, '0')}`);
  };

  // Group transactions by date string "YYYY-MM-DD"
  const transactionsByDate = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    transactions.forEach(t => {
      const list = map.get(t.date) || [];
      list.push(t);
      map.set(t.date, list);
    });
    return map;
  }, [transactions]);

  // Statistics for currently viewed month
  const monthPrefix = `${viewYear}-${(viewMonth + 1).toString().padStart(2, '0')}`;
  const monthStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let recurringCount = 0;
    let totalCount = 0;

    transactions.forEach(t => {
      if (t.date.startsWith(monthPrefix)) {
        totalCount++;
        if (t.type === 'income') income += t.amount;
        else expense += t.amount;
        if (t.isRecurring) recurringCount++;
      }
    });

    return { income, expense, recurringCount, totalCount };
  }, [transactions, monthPrefix]);

  // Next month recurring count for quick indicator
  const nextMonthPrefix = `${nextMonthDate.getFullYear()}-${(nextMonthDate.getMonth() + 1).toString().padStart(2, '0')}`;
  const nextMonthRecurringCount = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(nextMonthPrefix) && t.isRecurring).length;
  }, [transactions, nextMonthPrefix]);

  // Compute days for calendar matrix (including padding from prev and next month)
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    const todayStr = today.toISOString().split('T')[0];

    // Previous month padding
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonthIdx = viewMonth === 0 ? 12 : viewMonth;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dStr = `${prevYear}-${prevMonthIdx.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      days.push({
        dateStr: dStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dStr === todayStr
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dStr = `${viewYear}-${(viewMonth + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      days.push({
        dateStr: dStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dStr === todayStr
      });
    }

    // Next month padding to fill out 35 or 42 cells (multiple of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextMonthIdx = viewMonth === 11 ? 1 : viewMonth + 2;
      const nYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dStr = `${nYear}-${nextMonthIdx.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      days.push({
        dateStr: dStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dStr === todayStr
      });
    }

    return days;
  }, [viewYear, viewMonth, today]);

  // Selected date transactions
  const selectedTransactions = useMemo(() => {
    return transactionsByDate.get(selectedDateStr) || [];
  }, [transactionsByDate, selectedDateStr]);

  return (
    <div className="space-y-4">
      {/* Calendar Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition shadow-xs border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            title="Previous month"
          >
            <LucideIcon name="ChevronLeft" size={16} />
          </button>
          
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 min-w-[130px] text-center">
            {monthLabel}
          </h3>

          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition shadow-xs border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            title="Next month"
          >
            <LucideIcon name="ChevronRight" size={16} />
          </button>

          <button
            onClick={handleToday}
            className="ml-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-2 py-1 rounded-md transition"
          >
            Today
          </button>
        </div>

        {/* Quick jump to next month indicator */}
        <div className="flex items-center gap-2">
          {!isViewingNextMonth && (
            <button
              onClick={handleJumpToNextMonth}
              className="text-xs font-semibold px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg transition flex items-center gap-1.5 border border-indigo-200/50 dark:border-indigo-800/40 shadow-xs"
            >
              <LucideIcon name="Repeat" size={12} className="text-indigo-600 dark:text-indigo-400" />
              <span>Next Month</span>
              {nextMonthRecurringCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {nextMonthRecurringCount}
                </span>
              )}
            </button>
          )}

          {isViewingNextMonth && (
            <span className="text-[11px] font-semibold px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/40 rounded-lg flex items-center gap-1">
              <LucideIcon name="Repeat" size={11} />
              Viewing Next Month's Schedule
            </span>
          )}
        </div>
      </div>

      {/* Month Highlights Banner */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 font-medium uppercase block">Income</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            +{formatAmount(monthStats.income, activeCurrency)}
          </span>
        </div>
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 font-medium uppercase block">Outflow</span>
          <span className="font-bold text-slate-800 dark:text-slate-100">
            -{formatAmount(monthStats.expense, activeCurrency)}
          </span>
        </div>
        <div className="p-2 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30">
          <span className="text-[10px] text-indigo-500 font-medium uppercase block flex items-center justify-center gap-1">
            <LucideIcon name="Repeat" size={10} />
            Recurring
          </span>
          <span className="font-bold text-indigo-700 dark:text-indigo-300">
            {monthStats.recurringCount} scheduled
          </span>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider py-1 border-b border-slate-100 dark:border-slate-800">
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>

      {/* Calendar Grid Matrix */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const dayTxs = transactionsByDate.get(day.dateStr) || [];
          const hasRecurring = dayTxs.some(t => t.isRecurring);
          const hasIncome = dayTxs.some(t => t.type === 'income');
          const hasExpense = dayTxs.some(t => t.type === 'expense');
          const isSelected = day.dateStr === selectedDateStr;

          return (
            <button
              key={day.dateStr}
              type="button"
              onClick={() => setSelectedDateStr(day.dateStr)}
              className={`min-h-[58px] p-1.5 rounded-xl text-left transition-all relative flex flex-col justify-between border ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs ring-1 ring-indigo-500'
                  : day.isCurrentMonth
                    ? 'border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-700'
                    : 'border-transparent bg-slate-50/40 dark:bg-slate-950/30 text-slate-300 dark:text-slate-600 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span
                  className={`text-xs font-semibold rounded-md w-5 h-5 flex items-center justify-center ${
                    day.isToday
                      ? 'bg-indigo-600 text-white font-bold'
                      : day.isCurrentMonth
                        ? 'text-slate-700 dark:text-slate-200'
                        : 'text-slate-400 dark:text-slate-600'
                  }`}
                >
                  {day.dayNum}
                </span>

                {/* Recurring Indicator Pill */}
                {hasRecurring && (
                  <span
                    title="Recurring transaction scheduled"
                    className="p-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 animate-pulse"
                  >
                    <LucideIcon name="Repeat" size={10} />
                  </span>
                )}
              </div>

              {/* Transactions dots/indicators on this day */}
              {dayTxs.length > 0 ? (
                <div className="mt-1 space-y-0.5">
                  <div className="flex items-center gap-1">
                    {hasIncome && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                    {hasExpense && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />}
                    <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 truncate">
                      {dayTxs.length === 1 ? dayTxs[0].description.slice(0, 7) : `${dayTxs.length} items`}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-3" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Date Detail Drawer */}
      <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <LucideIcon name="Calendar" size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Details for {selectedDateStr}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {selectedTransactions.length} transaction{selectedTransactions.length === 1 ? '' : 's'}
          </span>
        </div>

        {selectedTransactions.length > 0 ? (
          <div className="space-y-2">
            {selectedTransactions.map((tx) => {
              const style = CATEGORY_STYLES[tx.category] || CATEGORY_STYLES['Others'];
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 text-xs shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${style.bg} ${style.text}`}>
                      <LucideIcon name={tx.type === 'income' ? 'TrendingUp' : style.icon} size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {tx.description}
                        </span>
                        {tx.isRecurring && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40">
                            <LucideIcon name="Repeat" size={9} />
                            Recurring
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span>{tx.category}</span>
                        <span>•</span>
                        <span>{tx.paymentMethod}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className={`font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-800 dark:text-white'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount, activeCurrency)}
                    </span>
                    {onDeleteTransaction && (
                      <button
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="text-slate-300 hover:text-rose-500 transition p-1"
                        title="Delete record"
                      >
                        <LucideIcon name="Trash2" size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-2">
            No financial entries logged or scheduled on this day.
          </p>
        )}
      </div>
    </div>
  );
};
