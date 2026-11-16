/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Transaction, Budget, Goal, FinancialInsights } from '../types';
import { LucideIcon } from './LucideIcon';
import { motion, AnimatePresence } from 'motion/react';

interface InsightPanelProps {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  layout?: 'vertical' | 'horizontal';
  compact?: boolean;
  onViewMore?: () => void;
}

export const InsightPanel: React.FC<InsightPanelProps> = ({
  transactions,
  budgets,
  goals,
  layout = 'vertical',
  compact = false,
  onViewMore
}) => {
  const [insights, setInsights] = useState<FinancialInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch analysis from server
  const fetchAIAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions, budgets, goals })
      });

      if (!response.ok) {
        throw new Error('Failed to generate insights');
      }

      const data = await response.json();
      if (data.insights) {
        setInsights(data.insights);
      } else {
        throw new Error('Empty insights returned');
      }
    } catch (err: any) {
      console.error(err);
      setError('Could not connect to AI advisor. Showing local analysis instead.');
      setInsights(getLocalCalculations());
    } finally {
      setIsLoading(false);
    }
  };

  // Local fallback insights calculations
  const getLocalCalculations = (): FinancialInsights => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const incomes = transactions.filter(t => t.type === 'income');
    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);
    const savings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

    // Check budget limit warnings
    const categorySpent: Record<string, number> = {};
    expenses.forEach(t => {
      categorySpent[t.category] = (categorySpent[t.category] || 0) + t.amount;
    });

    const warnings: any[] = [];
    budgets.forEach(b => {
      const spent = categorySpent[b.category] || 0;
      if (spent > b.limit) {
        warnings.push({
          category: b.category,
          message: `Over Budget! Spent $${spent.toFixed(0)} of $${b.limit.toFixed(0)} limit for ${b.category}.`,
          severity: 'high'
        });
      } else if (spent > b.limit * 0.8) {
        warnings.push({
          category: b.category,
          message: `Warning: Spent 80%+ of budget ($${spent.toFixed(0)}/$${b.limit.toFixed(0)}) for ${b.category}.`,
          severity: 'medium'
        });
      }
    });

    return {
      summary: `You spent a total of $${totalExpense.toFixed(2)} and earned $${totalIncome.toFixed(2)} this month. Your current net savings rate is ${savingsRate.toFixed(1)}%. Keep tracking your category budgets to maintain control.`,
      tips: [
        "Plan groceries beforehand to minimize high restaurant and delivery fees.",
        "Set up auto-transfers on payday straight to your savings goals to pay yourself first.",
        "Analyze subscriptions quarterly to discard ones you don't actively consume."
      ],
      warnings,
      savingsOpportunities: [
        `Micro-save on "Others": even reducing miscellaneous spend by 10% can add up quickly over a year!`,
        `Maintain a lower spending frequency on items exceeding $50.`
      ]
    };
  };

  // Run on mount to give initial local calculations
  useEffect(() => {
    setInsights(getLocalCalculations());
  }, [transactions, budgets]);

  const isHorizontal = layout === 'horizontal';
  const displayedTips = compact && insights ? insights.tips.slice(0, 2) : insights?.tips || [];
  const displayedWarnings = compact && insights ? insights.warnings.slice(0, 2) : insights?.warnings || [];
  const displayedOpportunities =
    compact && insights ? insights.savingsOpportunities.slice(0, 1) : insights?.savingsOpportunities || [];

  return (
    <div
      id="insight-panel-container"
      className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-5 h-full flex flex-col justify-between"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
              <LucideIcon name="Brain" size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                Decuples AI Insights
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Deep financial intelligence analyzer
              </p>
            </div>
          </div>

          <button
            id="btn-trigger-ai-analyze"
            type="button"
            onClick={fetchAIAnalysis}
            disabled={isLoading}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold rounded-lg text-white transition flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <LucideIcon name="Sparkles" size={12} />
                <span>Ask AI Planner</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {insights ? (
            <motion.div
              key="insights-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={
                isHorizontal
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm leading-relaxed items-stretch'
                  : 'space-y-4 text-sm leading-relaxed'
              }
            >
              {/* Overview text */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1.5">
                    <LucideIcon name="Info" size={12} className="text-indigo-500 dark:text-indigo-400" />
                    Expert Overview
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 font-medium text-xs leading-relaxed">
                    {insights.summary}
                  </p>
                </div>
              </div>

              {/* Warnings Section (if any) */}
              {displayedWarnings.length > 0 && (
                <div className="space-y-2 bg-rose-50/40 dark:bg-rose-950/10 border border-rose-200/50 dark:border-rose-900/30 rounded-xl p-3.5">
                  <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <LucideIcon name="AlertTriangle" size={12} />
                    Budget Limits Alerts
                  </span>
                  <div className="space-y-1.5">
                    {displayedWarnings.map((warn, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded-lg border text-xs flex items-start gap-2 ${
                          warn.severity === 'high'
                            ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300'
                            : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        <span className="mt-0.5 font-bold">·</span>
                        <span>{warn.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Tips */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1">
                  <LucideIcon name="Lightbulb" size={12} />
                  Smart Budgeting Tips
                </span>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {displayedTips.map((tip, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 bg-slate-50 dark:bg-slate-950/40 py-2 px-3 rounded-lg border border-slate-200/70 dark:border-slate-800/70"
                    >
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold tabular-nums">
                        {i + 1}.
                      </span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Savings Opportunities */}
              {!compact && displayedOpportunities.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <LucideIcon name="TrendingDown" size={12} />
                    Savings Opportunities
                  </span>
                  <div className="space-y-1.5">
                    {displayedOpportunities.map((opp, i) => (
                      <div
                        key={i}
                        className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/30 p-2.5 rounded-lg text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2"
                      >
                        <LucideIcon
                          name="Sparkle"
                          size={14}
                          className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5"
                        />
                        <span>{opp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs">
              Calculating initial insights. Click "Ask AI Planner" above for full analysis!
            </div>
          )}
        </AnimatePresence>
      </div>

      {compact && onViewMore && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onViewMore}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
          >
            <span>View Full AI Insights</span>
            <LucideIcon name="ArrowRight" size={13} />
          </button>
        </div>
      )}
    </div>
  );
};
