/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Goal, Currency } from '../types';
import { LucideIcon } from './LucideIcon';
import { formatAmount } from '../utils/currency';
import { motion, AnimatePresence } from 'motion/react';

interface SavingsGoalListProps {
  goals: Goal[];
  onAddGoal: (goal: Omit<Goal, 'id'>) => void;
  onContributeGoal: (id: string, amount: number) => void;
  onDeleteGoal: (id: string) => void;
  activeCurrency: Currency;
}

export const SavingsGoalList: React.FC<SavingsGoalListProps> = ({
  goals,
  onAddGoal,
  onContributeGoal,
  onDeleteGoal,
  activeCurrency,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');

  // Contribution State
  const [contribId, setContribId] = useState<string | null>(null);
  const [contribAmount, setContribAmount] = useState('');

  const handleSubmitGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTarget = parseFloat(targetAmount);
    if (!title.trim() || isNaN(parsedTarget) || parsedTarget <= 0 || !deadline) {
      alert('Please fill out all fields with valid values');
      return;
    }

    onAddGoal({
      title: title.trim(),
      targetAmount: parsedTarget / activeCurrency.rate, // Save converted to USD base
      currentAmount: 0,
      deadline,
    });

    // Reset Form
    setTitle('');
    setTargetAmount('');
    setDeadline('');
    setShowAddForm(false);
  };

  const handleSaveContribution = (id: string) => {
    const parsedAmount = parseFloat(contribAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    // Convert to USD base before invoking contribution callback
    onContributeGoal(id, parsedAmount / activeCurrency.rate);
    setContribId(null);
    setContribAmount('');
  };

  return (
    <div id="savings-goal-container" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <LucideIcon name="Lightbulb" className="text-indigo-600 dark:text-indigo-400" size={20} />
          <span>Savings Milestones</span>
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-lg transition"
        >
          <LucideIcon name={showAddForm ? 'X' : 'Plus'} size={14} />
        </button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.form
            onSubmit={handleSubmitGoal}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/20 dark:bg-indigo-950/10 p-4 rounded-xl space-y-3"
          >
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Milestone Goal Name</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New Macbook Pro, Trip to Kyoto"
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Amount ({activeCurrency.code})</label>
                <input
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="2000"
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Date</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition"
            >
              Add Savings Goal
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {goals.map((goal) => {
          const percent = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
          const roundedPercent = Math.min(Math.round(percent), 100);

          return (
            <div key={goal.id} className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{goal.title}</h3>
                  <p className="text-[10px] text-slate-400 font-mono">By {goal.deadline}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setContribId(contribId === goal.id ? null : goal.id)}
                    className="px-2 py-1 text-[10px] bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-semibold rounded-lg transition"
                  >
                    Contribute
                  </button>
                  <button
                    onClick={() => onDeleteGoal(goal.id)}
                    className="p-1 text-slate-300 hover:text-rose-500 transition"
                  >
                    <LucideIcon name="X" size={14} />
                  </button>
                </div>
              </div>

              {/* Progress Slider Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {formatAmount(goal.currentAmount, activeCurrency)} <span className="text-slate-400 font-normal">of {formatAmount(goal.targetAmount, activeCurrency)}</span>
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{roundedPercent}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-indigo-600 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${roundedPercent}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>

              {/* Expandable Contribution Field */}
              <AnimatePresence>
                {contribId === goal.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-2 flex gap-2"
                  >
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-mono">{activeCurrency.symbol}</span>
                      <input
                        type="number"
                        placeholder="Amount"
                        value={contribAmount}
                        onChange={(e) => setContribAmount(e.target.value)}
                        className="w-full pl-6 pr-2 py-1 text-xs bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => handleSaveContribution(goal.id)}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition"
                    >
                      Save
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {goals.length === 0 && (
          <div className="py-6 text-center text-slate-400 text-xs">
            No savings goals currently configured. Click "+" above to add one!
          </div>
        )}
      </div>
    </div>
  );
};
