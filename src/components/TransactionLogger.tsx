/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Transaction, ParsedTransaction, Currency, TimeframePeriod, CollectedAppTransaction } from '../types';
import { LucideIcon } from './LucideIcon';
import { ReceiptScanner } from './ReceiptScanner';
import { formatAmount } from '../utils/currency';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/mockData';
import { getNextOccurrenceDate, formatReadableDate } from '../utils/dateUtils';
import { motion, AnimatePresence } from 'motion/react';

interface TransactionLoggerProps {
  onAddTransaction: (transaction: Omit<Transaction, 'id'>, nextMonthTransaction?: Omit<Transaction, 'id'>) => void;
  activeCurrency: Currency;
}

const FREQUENCY_OPTIONS: Array<{ id: TimeframePeriod; label: string }> = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' }
];

export const TransactionLogger: React.FC<TransactionLoggerProps> = ({ onAddTransaction, activeCurrency }) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'ai' | 'scan'>('ai');

  // Manual form state
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<TimeframePeriod>('monthly');

  // AI Quick Add state
  const [aiText, setAiText] = useState('');
  const [aiIsRecurring, setAiIsRecurring] = useState(false);
  const [aiRecurringFrequency, setAiRecurringFrequency] = useState<TimeframePeriod>('monthly');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<ParsedTransaction | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Receipt Scanner state
  const [scannedSummary, setScannedSummary] = useState<string | null>(null);
  const [scannedItems, setScannedItems] = useState<CollectedAppTransaction[]>([]);
  const [scanIsRecurring, setScanIsRecurring] = useState(false);
  const [scanRecurringFrequency, setScanRecurringFrequency] = useState<TimeframePeriod>('monthly');

  // Feedback notifications
  const [successNotification, setSuccessNotification] = useState<string | null>(null);

  const activeCategoryOptions = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleTypeSwitch = (nextType: 'expense' | 'income') => {
    setType(nextType);
    if (nextType === 'income') {
      if (!(INCOME_CATEGORIES as readonly string[]).includes(category)) {
        setCategory(INCOME_CATEGORIES[0]);
      }
    } else {
      if (!(EXPENSE_CATEGORIES as readonly string[]).includes(category)) {
        setCategory(EXPENSE_CATEGORIES[0]);
      }
    }
  };

  // Dynamic next occurrence dates
  const manualNextOccurrenceDate = useMemo(
    () => getNextOccurrenceDate(date, recurringFrequency),
    [date, recurringFrequency]
  );

  const aiNextOccurrenceDate = useMemo(() => {
    return parsedPreview ? getNextOccurrenceDate(parsedPreview.date, aiRecurringFrequency) : '';
  }, [parsedPreview, aiRecurringFrequency]);

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

    const baseAmount = parseFloat(amount) / activeCurrency.rate;

    const baseTx: Omit<Transaction, 'id'> = {
      amount: baseAmount,
      type,
      category,
      description: description.trim(),
      date,
      paymentMethod,
      isRecurring,
      recurringFrequency: isRecurring ? recurringFrequency : undefined
    };

    let nextOccurrenceTx: Omit<Transaction, 'id'> | undefined = undefined;
    if (isRecurring) {
      nextOccurrenceTx = {
        amount: baseAmount,
        type,
        category,
        description: `${description.trim()} (Recurring)`,
        date: manualNextOccurrenceDate,
        paymentMethod,
        isRecurring: true,
        recurringFrequency
      };
    }

    onAddTransaction(baseTx, nextOccurrenceTx);

    if (isRecurring) {
      setSuccessNotification(
        `Logged for ${date} and scheduled next (${recurringFrequency}) on ${formatReadableDate(manualNextOccurrenceDate)}!`
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

    const lower = aiText.toLowerCase();
    const detectedFreq: TimeframePeriod =
      lower.includes('daily') || lower.includes('every day')
        ? 'daily'
        : lower.includes('weekly') || lower.includes('every week')
          ? 'weekly'
          : lower.includes('yearly') || lower.includes('annual') || lower.includes('every year')
            ? 'yearly'
            : 'monthly';

    const hasRecurringKeywords =
      lower.includes('daily') ||
      lower.includes('every day') ||
      lower.includes('weekly') ||
      lower.includes('every week') ||
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
        const parsed: ParsedTransaction = { ...data.parsed };
        if (parsed.type === 'income' && parsed.category === 'Income') {
          parsed.category = INCOME_CATEGORIES[0];
        }
        setParsedPreview(parsed);
        setAiIsRecurring(hasRecurringKeywords);
        if (hasRecurringKeywords) {
          setAiRecurringFrequency(detectedFreq);
        }
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
    const baseAmount = parsedPreview.amount / activeCurrency.rate;

    const baseTx: Omit<Transaction, 'id'> = {
      ...parsedPreview,
      amount: baseAmount,
      isRecurring: aiIsRecurring,
      recurringFrequency: aiIsRecurring ? aiRecurringFrequency : undefined
    };

    let nextOccurrenceTx: Omit<Transaction, 'id'> | undefined = undefined;
    if (aiIsRecurring) {
      const nextDate = getNextOccurrenceDate(parsedPreview.date, aiRecurringFrequency);
      nextOccurrenceTx = {
        ...parsedPreview,
        amount: baseAmount,
        description: `${parsedPreview.description} (Recurring)`,
        date: nextDate,
        isRecurring: true,
        recurringFrequency: aiRecurringFrequency
      };
    }

    onAddTransaction(baseTx, nextOccurrenceTx);

    if (aiIsRecurring) {
      setSuccessNotification(
        `AI record saved and scheduled (${aiRecurringFrequency}) on ${formatReadableDate(aiNextOccurrenceDate)}!`
      );
    } else {
      setSuccessNotification('AI transaction logged successfully!');
    }
    setTimeout(() => setSuccessNotification(null), 4500);

    setParsedPreview(null);
    setAiText('');
    setAiIsRecurring(false);
  };

  const handleScannedExtracted = ({
    receiptSummary,
    transactions
  }: {
    receiptSummary: string;
    transactions: CollectedAppTransaction[];
  }) => {
    setScannedSummary(receiptSummary);
    setScannedItems(transactions);
  };

  const handleUpdateScannedItem = (
    tempId: string,
    patch: Partial<CollectedAppTransaction>
  ) => {
    setScannedItems((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item;
        const updated = { ...item, ...patch };
        if (patch.type) {
          const validCats = patch.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
          if (!(validCats as readonly string[]).includes(updated.category)) {
            updated.category = validCats[0];
          }
        }
        return updated;
      })
    );
  };

  const handleConfirmScannedItems = () => {
    if (scannedItems.length === 0) return;

    let lastNextDate = '';
    scannedItems.forEach((item) => {
      const baseAmount = item.amount / activeCurrency.rate;
      const baseTx: Omit<Transaction, 'id'> = {
        amount: baseAmount,
        category: item.category,
        date: item.date,
        description: item.description.trim() || `${item.sourceApp} Receipt`,
        type: item.type,
        paymentMethod: item.paymentMethod,
        sourceApp: item.sourceApp,
        sourceAppType: item.sourceAppType,
        isRecurring: scanIsRecurring,
        recurringFrequency: scanIsRecurring ? scanRecurringFrequency : undefined
      };

      let nextOccurrenceTx: Omit<Transaction, 'id'> | undefined = undefined;
      if (scanIsRecurring) {
        const nextDate = getNextOccurrenceDate(item.date, scanRecurringFrequency);
        lastNextDate = nextDate;
        nextOccurrenceTx = {
          ...baseTx,
          description: `${baseTx.description} (Recurring)`,
          date: nextDate,
          isRecurring: true,
          recurringFrequency: scanRecurringFrequency
        };
      }

      onAddTransaction(baseTx, nextOccurrenceTx);
    });

    if (scanIsRecurring && lastNextDate) {
      setSuccessNotification(
        `Saved ${scannedItems.length} scanned receipt log${scannedItems.length === 1 ? '' : 's'} and scheduled next (${scanRecurringFrequency}) on ${formatReadableDate(lastNextDate)}!`
      );
    } else {
      setSuccessNotification(
        `Saved ${scannedItems.length} receipt transaction${scannedItems.length === 1 ? '' : 's'} to Logs!`
      );
    }
    setTimeout(() => setSuccessNotification(null), 4500);
    setScannedItems([]);
    setScannedSummary(null);
    setScanIsRecurring(false);
  };

  const paymentMethods = ['UPI', 'Cash', 'Credit Card', 'Debit Card', 'Bank Transfer'];

  return (
    <div id="transaction-logger-container" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 overflow-hidden">
      <div className="flex flex-col gap-3.5 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <LucideIcon name="Wallet" className="text-indigo-600 dark:text-indigo-400" size={20} />
          <span>Logs</span>
        </h2>

        {/* Separate option buttons - center aligned end to end */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            id="tab-btn-ai"
            type="button"
            onClick={() => { setActiveTab('ai'); setParsedPreview(null); }}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center text-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LucideIcon
              name="Sparkles"
              size={13}
              className={activeTab === 'ai' ? 'text-white' : 'text-indigo-500'}
            />
            <span>AI Quick Add</span>
          </button>
          <button
            id="tab-btn-scan"
            type="button"
            onClick={() => { setActiveTab('scan'); setParsedPreview(null); }}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center text-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'scan'
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LucideIcon
              name="ScanLine"
              size={13}
              className={activeTab === 'scan' ? 'text-white' : 'text-indigo-500'}
            />
            <span>Scan Receipt</span>
          </button>
          <button
            id="tab-btn-manual"
            type="button"
            onClick={() => { setActiveTab('manual'); setParsedPreview(null); }}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center text-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LucideIcon
              name="Plus"
              size={13}
              className={activeTab === 'manual' ? 'text-white' : 'text-indigo-500'}
            />
            <span>Manual Entry</span>
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
            <button type="button" onClick={() => setSuccessNotification(null)} className="text-emerald-500 hover:text-emerald-700">
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
                  placeholder={`Tell Decuples what to log... (e.g. 'Spent ${activeCurrency.symbol}15.50 on lunch today' or 'Received ${activeCurrency.symbol}3200 monthly salary')`}
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="ai-input-recurring"
                    checked={aiIsRecurring}
                    onChange={(e) => setAiIsRecurring(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                    <LucideIcon name="Repeat" size={13} className={aiIsRecurring ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                    <span>Recurring schedule</span>
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
                      type="button"
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
                      <select
                        value={parsedPreview.category}
                        onChange={(e) => setParsedPreview({ ...parsedPreview, category: e.target.value })}
                        className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-medium"
                      >
                        {(parsedPreview.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
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
                    <div className="col-span-2 pt-2 border-t border-indigo-100/60 dark:border-indigo-900/30 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            id="ai-preview-recurring-checkbox"
                            checked={aiIsRecurring}
                            onChange={(e) => setAiIsRecurring(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                            <LucideIcon name="Repeat" size={13} className={aiIsRecurring ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                            Recurring Schedule
                          </span>
                        </label>
                        {aiIsRecurring && (
                          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-100/60 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full">
                            Next: {formatReadableDate(aiNextOccurrenceDate)}
                          </span>
                        )}
                      </div>

                      {aiIsRecurring && (
                        <div className="grid grid-cols-4 gap-1 p-1 bg-white/80 dark:bg-slate-900 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                          {FREQUENCY_OPTIONS.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setAiRecurringFrequency(opt.id)}
                              className={`py-1 text-[11px] font-semibold rounded-md transition ${
                                aiRecurringFrequency === opt.id
                                  ? 'bg-indigo-600 text-white'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
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
                      Save Log
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : activeTab === 'scan' ? (
          <motion.div
            key="scan-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            <ReceiptScanner onExtracted={handleScannedExtracted} compact />

            {scannedItems.length > 0 && (
              <div className="border border-indigo-200/80 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/15 rounded-xl p-4 space-y-4">
                <div className="flex items-start justify-between gap-2 border-b border-indigo-100/70 dark:border-indigo-900/30 pb-2.5">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                      <LucideIcon name="ScanLine" size={13} />
                      Extracted Receipt Data ({scannedItems.length})
                    </span>
                    {scannedSummary && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {scannedSummary}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setScannedItems([]);
                      setScannedSummary(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label="Discard scanned results"
                  >
                    <LucideIcon name="X" size={14} />
                  </button>
                </div>

                <div className="space-y-3">
                  {scannedItems.map((item) => {
                    const catList = item.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
                    return (
                      <div
                        key={item.tempId}
                        className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2.5"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-[10px] font-semibold uppercase text-slate-400">
                              Merchant / Description
                            </label>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) =>
                                handleUpdateScannedItem(item.tempId, { description: e.target.value })
                              }
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold uppercase text-slate-400">
                              Amount ({activeCurrency.code})
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={item.amount}
                              onChange={(e) =>
                                handleUpdateScannedItem(item.tempId, {
                                  amount: parseFloat(e.target.value) || 0
                                })
                              }
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <select
                            value={item.type}
                            onChange={(e) =>
                              handleUpdateScannedItem(item.tempId, {
                                type: e.target.value as 'income' | 'expense'
                              })
                            }
                            className="px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-semibold"
                          >
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                          </select>

                          <select
                            value={item.category}
                            onChange={(e) =>
                              handleUpdateScannedItem(item.tempId, { category: e.target.value })
                            }
                            className="px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-medium"
                          >
                            {catList.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>

                          <input
                            type="date"
                            value={item.date}
                            onChange={(e) =>
                              handleUpdateScannedItem(item.tempId, { date: e.target.value })
                            }
                            className="px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono"
                          />

                          <select
                            value={item.paymentMethod}
                            onChange={(e) =>
                              handleUpdateScannedItem(item.tempId, { paymentMethod: e.target.value })
                            }
                            className="px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-medium"
                          >
                            {paymentMethods.map((pm) => (
                              <option key={pm} value={pm}>{pm}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Recurring option for scanned receipt */}
                <div className="pt-1 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={scanIsRecurring}
                      onChange={(e) => setScanIsRecurring(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <LucideIcon name="Repeat" size={13} className={scanIsRecurring ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                      Recurring Schedule
                    </span>
                  </label>

                  {scanIsRecurring && (
                    <div className="grid grid-cols-4 gap-1 p-1 bg-white/80 dark:bg-slate-900 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                      {FREQUENCY_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setScanRecurringFrequency(opt.id)}
                          className={`py-1 text-[11px] font-semibold rounded-md transition ${
                            scanRecurringFrequency === opt.id
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setScannedItems([]);
                      setScannedSummary(null);
                    }}
                    className="flex-1 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Discard
                  </button>
                  <button
                    id="btn-confirm-scanned-receipt"
                    type="button"
                    onClick={handleConfirmScannedItems}
                    className="flex-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <LucideIcon name="CheckCircle" size={13} />
                    <span>
                      {scannedItems.length > 1 ? `Save ${scannedItems.length} Logs` : 'Save Receipt Log'}
                    </span>
                  </button>
                </div>
              </div>
            )}
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
                id="btn-type-expense"
                onClick={() => handleTypeSwitch('expense')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  type === 'expense'
                    ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Expense
              </button>
              <button
                type="button"
                id="btn-type-income"
                onClick={() => handleTypeSwitch('income')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  type === 'income'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Income
              </button>
            </div>

            {/* Amount and Category (Supports Expense & Income Categories) */}
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
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {type === 'income' ? 'Income Category' : 'Expense Category'}
                </label>
                <select
                  id="manual-input-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-medium"
                >
                  {activeCategoryOptions.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
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
                placeholder={type === 'income' ? 'e.g. Monthly Salary, Freelance Invoice, Dividend Payout' : 'e.g. Groceries, Rent payment, Monthly Internet'}
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

            {/* Recurring Checkbox + Daily/Weekly/Monthly/Yearly Frequency */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
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
                    className={isRecurring ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Recurring Transaction
                  </span>
                </div>
                {isRecurring && (
                  <span className="text-[10px] font-bold capitalize text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full border border-indigo-200/50 dark:border-indigo-800/40">
                    {recurringFrequency} Repeat
                  </span>
                )}
              </label>

              {isRecurring && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pl-6 space-y-2"
                >
                  <div className="grid grid-cols-4 gap-1 p-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        id={`btn-freq-${opt.id}`}
                        type="button"
                        onClick={() => setRecurringFrequency(opt.id)}
                        className={`py-1 text-[11px] font-semibold rounded-md transition ${
                          recurringFrequency === opt.id
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                    <LucideIcon name="Calendar" size={12} />
                    <span>
                      Next calendar entry: <strong>{formatReadableDate(manualNextOccurrenceDate)}</strong>
                    </span>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                id="btn-manual-submit"
                type="submit"
                className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition shadow-xs hover:shadow-md flex items-center justify-center gap-1.5"
              >
                <LucideIcon name={isRecurring ? 'Repeat' : 'Plus'} size={14} />
                <span>{isRecurring ? `Save & Schedule (${recurringFrequency})` : 'Save Log'}</span>
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};
