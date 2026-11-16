/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Transaction, ParsedTransaction, Currency } from '../types';
import { LucideIcon } from './LucideIcon';
import { formatAmount } from '../utils/currency';
import { getNextMonthDate, formatReadableDate } from '../utils/dateUtils';
import { motion, AnimatePresence } from 'motion/react';

interface TransactionLoggerProps {
  onAddTransaction: (transaction: Omit<Transaction, 'id'>, nextMonthTransaction?: Omit<Transaction, 'id'>) => void;
  activeCurrency: Currency;
}

export const TransactionLogger: React.FC<TransactionLoggerProps> = ({ onAddTransaction, activeCurrency }) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('ai');
  
  // Manual form state
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState('Food & Dining');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [isRecurring, setIsRecurring] = useState(false);

  // AI Quick Add state
  const [aiText, setAiText] = useState('');
  const [aiIsRecurring, setAiIsRecurring] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<ParsedTransaction | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Feedback notifications
  const [successNotification, setSuccessNotification] = useState<string | null>(null);

  // Dynamic next month dates
  const manualNextMonthDate = useMemo(() => getNextMonthDate(date), [date]);
  const aiNextMonthDate = useMemo(() => {
    return parsedPreview ? getNextMonthDate(parsedPreview.date) : '';
  }, [parsedPreview]);

  // Handle manual submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (!description.trim()) {
      alert('Please enter a description');
      return;
    }

    const baseAmount = parseFloat(amount) / activeCurrency.rate; // Save converted to USD base

    const baseTx: Omit<Transaction, 'id'> = {
      amount: baseAmount,
      type,
      category: type === 'income' ? 'Income' : category,
      description: description.trim(),
      date,
      paymentMethod,
      isRecurring
    };

    let nextMonthTx: Omit<Transaction, 'id'> | undefined = undefined;
    if (isRecurring) {
      nextMonthTx = {
        amount: baseAmount,
        type,
        category: type === 'income' ? 'Income' : category,
        description: `${description.trim()} (Recurring)`,
        date: manualNextMonthDate,
        paymentMethod,
        isRecurring: true
      };
    }

    onAddTransaction(baseTx, nextMonthTx);

    if (isRecurring) {
      setSuccessNotification(
        `Logged for ${date} and populated on next month's calendar (${formatReadableDate(manualNextMonthDate)})!`
      );
    } else {
      setSuccessNotification('Transaction logged successfully!');
    }
    setTimeout(() => setSuccessNotification(null), 4500);

    // Reset manual form
    setAmount('');
    setDescription('');
    setIsRecurring(false);
    setDate(new Date().toISOString().split('T')[0]);
  };

  // Submit natural language to backend AI
  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiText.trim()) return;

    setIsParsing(true);
    setParseError(null);
    setParsedPreview(null);

    // Heuristic pre-detection of recurring intent in user's prompt text
    const lower = aiText.toLowerCase();
    const hasRecurringKeywords = 
      lower.includes('monthly') || 
      lower.includes('recurring') || 
      lower.includes('subscription') || 
      lower.includes('every month') ||
      lower.includes('annual') ||
      lower.includes('yearly') ||
      aiIsRecurring;

    try {
      const response = await fetch('/api/parse-natural-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: aiText,
          currentDate: new Date().toISOString().split('T')[0]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to parse text input.');
      }

      const data = await response.json();
      if (data.parsed) {
        setParsedPreview(data.parsed);
        setAiIsRecurring(hasRecurringKeywords);
      } else {
        throw new Error('Could not extract details. Try again with more details.');
      }
    } catch (err: any) {
      setParseError(err.message || 'An error occurred while parsing.');
    } finally {
      setIsParsing(false);
    }
  };

  // Confirm parsed AI transaction
  const handleConfirmAI = () => {
    if (!parsedPreview) return;
    const baseAmount = parsedPreview.amount / activeCurrency.rate; // Save converted to USD base

    const baseTx: Omit<Transaction, 'id'> = {
      ...parsedPreview,
      amount: baseAmount,
      isRecurring: aiIsRecurring
    };

    let nextMonthTx: Omit<Transaction, 'id'> | undefined = undefined;
    if (aiIsRecurring) {
      const nextDate = getNextMonthDate(parsedPreview.date);
      nextMonthTx = {
        ...parsedPreview,
        amount: baseAmount,
        description: `${parsedPreview.description} (Recurring)`,
        date: nextDate,
        isRecurring: true
      };
    }

    onAddTransaction(baseTx, nextMonthTx);

    if (aiIsRecurring) {
      setSuccessNotification(
        `AI record saved and scheduled on next month's calendar (${formatReadableDate(aiNextMonthDate)})!`
      );
    } else {
      setSuccessNotification('AI transaction logged successfully!');
    }
    setTimeout(() => setSuccessNotification(null), 4500);

    setParsedPreview(null);
    setAiText('');
    setAiIsRecurring(false);
  };

  const categories = [
    'Food & Dining',
    'Shopping',
    'Housing',
    'Transportation',
    'Entertainment',
    'Healthcare',
    'Education',
    'Others'
  ];

  const paymentMethods = ['UPI', 'Cash', 'Credit Card', 'Debit Card', 'Bank Transfer'];

  return (
    <div id="transaction-logger-container" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <LucideIcon name="Wallet" className="text-indigo-600 dark:text-indigo-400" size={20} />
          <span>Log Financial Record</span>
        </h2>
        
        {/* Tab triggers */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium">
          <button
            id="tab-btn-ai"
            onClick={() => { setActiveTab('ai'); setParsedPreview(null); }}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'ai'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <LucideIcon name="Sparkles" size={12} className="text-indigo-500" />
            Decuples AI Quick Add
          </button>
          <button
            id="tab-btn-manual"
            onClick={() => { setActiveTab('manual'); setParsedPreview(null); }}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'manual'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <LucideIcon name="Plus" size={12} />
            Manual Entry
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      <AnimatePresence>
        {successNotification && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-2 shadow-xs"
          >
            <div className="flex items-center gap-2">
              <LucideIcon name="CheckCircle" size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-medium">{successNotification}</span>
            </div>
            <button onClick={() => setSuccessNotification(null)} className="text-emerald-500 hover:text-emerald-700">
              <LucideIcon name="X" size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {activeTab === 'ai' ? (
          <motion.div
            key="ai-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <form onSubmit={handleAISubmit} className="space-y-4">
              <div className="relative">
                <textarea
                  id="ai-quick-add-textarea"
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  placeholder={`Tell Decuples what to log... (e.g. 'Spent ${activeCurrency.symbol}15.50 on delicious ramen today at lunch' or 'Monthly gym subscription of ${activeCurrency.symbol}49.99 on credit card')`}
                  className="w-full min-h-[96px] p-4 text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-400 resize-none leading-relaxed"
                />
                <button
                  type="button"
                  onClick={() => setAiText(`Monthly Netflix subscription of ${activeCurrency.symbol}15.99 on credit card today`)}
                  className="absolute right-3 bottom-3 text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <LucideIcon name="Lightbulb" size={12} />
                  <span>Try subscription</span>
                </button>
              </div>

              {/* Recurring intent toggle for AI Quick Add */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="ai-input-recurring"
                    checked={aiIsRecurring}
                    onChange={(e) => setAiIsRecurring(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                    <LucideIcon name="Repeat" size={13} className={aiIsRecurring ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"} />
                    <span>Recurring (auto-populate next month)</span>
                  </div>
                </label>

                <button
                  id="btn-ai-parse"
                  type="submit"
                  disabled={isParsing || !aiText.trim()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition shadow-xs hover:shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isParsing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Parsing with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <LucideIcon name="Sparkle" size={14} className="text-indigo-200 animate-pulse" />
                      <span>Parse Transaction</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Error Display */}
            {parseError && (
              <div className="mt-4 p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-start gap-2">
                <LucideIcon name="AlertTriangle" size={16} className="text-rose-500 mt-0.5 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            {/* AI Confirmation Panel */}
            <AnimatePresence>
              {parsedPreview && (
                <motion.div
                  key="parsed-preview"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-5 border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/40 dark:bg-indigo-950/10 rounded-xl p-4 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-indigo-100/50 dark:border-indigo-900/20 pb-2">
                    <span className="text-xs font-semibold text-indigo-800 dark:text-indigo-300 flex items-center gap-1">
                      <LucideIcon name="Sparkles" size={12} />
                      Decuples AI Parsed Result
                    </span>
                    <button
                      onClick={() => setParsedPreview(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <LucideIcon name="X" size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 uppercase font-semibold">Description</span>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{parsedPreview.description}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <span className="text-[11px] text-slate-400 uppercase font-semibold">Amount</span>
                      <p className={`font-bold text-base ${parsedPreview.type === 'income' ? 'text-emerald-600' : 'text-slate-950 dark:text-white'}`}>
                        {parsedPreview.type === 'income' ? '+' : '-'}{formatAmount(parsedPreview.amount / activeCurrency.rate, activeCurrency)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 uppercase font-semibold">Category</span>
                      <p className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        {parsedPreview.category}
                      </p>
                    </div>
                    <div className="space-y-1 text-right">
                      <span className="text-[11px] text-slate-400 uppercase font-semibold">Date</span>
                      <p className="font-medium text-slate-700 dark:text-slate-300">{parsedPreview.date}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 uppercase font-semibold">Payment Via</span>
                      <p className="font-medium text-slate-700 dark:text-slate-300">{parsedPreview.paymentMethod}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <span className="text-[11px] text-slate-400 uppercase font-semibold">Type</span>
                      <p className="font-semibold text-xs">
                        <span className={`px-2 py-0.5 rounded-full ${parsedPreview.type === 'income' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                          {parsedPreview.type.toUpperCase()}
                        </span>
                      </p>
                    </div>

                    {/* Recurring Option in Preview Card */}
                    <div className="col-span-2 pt-2 border-t border-indigo-100/60 dark:border-indigo-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          id="ai-preview-recurring-checkbox"
                          checked={aiIsRecurring}
                          onChange={(e) => setAiIsRecurring(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          <LucideIcon name="Repeat" size={13} className={aiIsRecurring ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"} />
                          Recurring (Populate Next Month)
                        </span>
                      </label>
                      {aiIsRecurring && (
                        <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-100/60 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full">
                          Repeats on {formatReadableDate(aiNextMonthDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setParsedPreview(null)}
                      className="flex-1 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      Discard
                    </button>
                    <button
                      id="btn-confirm-ai-add"
                      type="button"
                      onClick={handleConfirmAI}
                      className="flex-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <LucideIcon name="CheckCircle" size={13} />
                      Save Transaction
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.form
            key="manual-form"
            onSubmit={handleManualSubmit}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            {/* Type selector */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  type === 'expense'
                    ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  type === 'income'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Income
              </button>
            </div>

            {/* Amount and Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Amount ({activeCurrency.code})</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">{activeCurrency.symbol}</span>
                  <input
                    id="manual-input-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Category</label>
                {type === 'income' ? (
                  <div className="w-full px-3.5 py-2.5 text-sm bg-slate-100 dark:bg-slate-900 text-slate-500 rounded-xl border border-slate-200 dark:border-slate-800 font-medium">
                    Income
                  </div>
                ) : (
                  <select
                    id="manual-input-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-medium"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Description</label>
              <input
                id="manual-input-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Groceries, Rent payment, Monthly Internet"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                required
              />
            </div>

            {/* Date and Payment Method */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Date</label>
                <input
                  id="manual-input-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Payment Method</label>
                <select
                  id="manual-input-payment-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-medium"
                >
                  {paymentMethods.map((pm) => (
                    <option key={pm} value={pm}>{pm}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recurring Checkbox and Next Month Calendar Integration */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="checkbox-recurring"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <div className="flex items-center gap-2 flex-1">
                  <LucideIcon
                    name="Repeat"
                    size={14}
                    className={isRecurring ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Recurring Transaction
                  </span>
                </div>
                {isRecurring && (
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full border border-indigo-200/50 dark:border-indigo-800/40">
                    Monthly Repeat
                  </span>
                )}
              </label>

              {isRecurring && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pl-6.5 text-[11px] text-slate-500 dark:text-slate-400 space-y-1"
                >
                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold">
                    <LucideIcon name="Calendar" size={12} />
                    <span>Next month's calendar date: <strong>{formatReadableDate(manualNextMonthDate)}</strong></span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Automatically populates a matching entry on next month's calendar for continuous asset and cashflow projection.
                  </p>
                </motion.div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                id="btn-manual-submit"
                type="submit"
                className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition shadow-xs hover:shadow-md flex items-center justify-center gap-1.5"
              >
                <LucideIcon name={isRecurring ? "Repeat" : "Plus"} size={14} />
                <span>{isRecurring ? 'Save & Schedule Next Month' : 'Save Record'}</span>
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};
