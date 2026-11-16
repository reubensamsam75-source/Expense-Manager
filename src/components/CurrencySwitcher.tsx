/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Currency } from '../types';
import { CURRENCY_LIST } from '../utils/currency';
import { LucideIcon } from './LucideIcon';
import { motion, AnimatePresence } from 'motion/react';

interface CurrencySwitcherProps {
  activeCurrency: Currency;
  onSelectCurrency: (currency: Currency) => void;
}

export const CurrencySwitcher: React.FC<CurrencySwitcherProps> = ({
  activeCurrency,
  onSelectCurrency
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSelect = (currency: Currency) => {
    onSelectCurrency(currency);
    setIsOpen(false);
  };

  const getCleanCurrencyName = (curr: Currency) =>
    curr.name.replace(/\s*\([A-Z]+\)$/, '');

  return (
    <div ref={containerRef} className="relative">
      <button
        id="header-currency-selector"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Change display currency (current: ${activeCurrency.name})`}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
          isOpen
            ? 'bg-white dark:bg-slate-800 border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-500/20 text-slate-900 dark:text-white shadow-xs'
            : 'bg-slate-100/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-100'
        }`}
      >
        <span className="min-w-5 h-4 px-1 rounded-md bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
          {activeCurrency.symbol}
        </span>

        <span className="font-bold tracking-tight whitespace-nowrap">
          {activeCurrency.code}
        </span>

        <LucideIcon
          name="ChevronDown"
          size={13}
          className={`text-slate-400 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-indigo-500' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="currency-switcher-popover"
            role="listbox"
            aria-label="Display currency options"
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 mt-2 w-[310px] sm:w-[350px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-50 space-y-3.5"
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <LucideIcon name="Coins" size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Display Currency
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Active: {getCleanCurrencyName(activeCurrency)}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Base: USD
              </span>
            </div>

            {/* Currency Card Grid */}
            <div className="grid grid-cols-2 gap-2">
              {CURRENCY_LIST.map((curr) => {
                const isActive = curr.code === activeCurrency.code;
                return (
                  <button
                    key={curr.code}
                    id={`currency-option-${curr.code}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleSelect(curr)}
                    className={`group text-left rounded-xl p-2.5 border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/50 ring-2 ring-indigo-500/25'
                        : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/60 dark:bg-slate-950/60 hover:bg-white dark:hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-8 h-8 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {curr.symbol}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {curr.code}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {getCleanCurrencyName(curr)}
                        </p>
                        <p className="text-[10px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
                          {curr.code === 'USD' ? 'Base 1.00' : `1$ = ${curr.symbol}${curr.rate}`}
                        </p>
                      </div>
                    </div>

                    {isActive && (
                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <LucideIcon name="Check" size={10} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
