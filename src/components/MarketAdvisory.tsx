/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Currency } from '../types';
import { formatAmount } from '../utils/currency';
import { LucideIcon } from './LucideIcon';

interface MarketAdvisoryProps {
  netSavings: number;
  activeCurrency: Currency;
  compact?: boolean;
  onOpenFull?: () => void;
}

interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  type: 'stock' | 'crypto' | 'index' | 'commodity';
}

interface FundOption {
  id: string;
  name: string;
  apy: number;
  risk: 'Low' | 'Medium' | 'High' | 'Extremely High';
  type: string;
  description: string;
}

export const MarketAdvisory: React.FC<MarketAdvisoryProps> = ({
  netSavings,
  activeCurrency,
  compact = false,
  onOpenFull
}) => {
  // 1. Live market updates simulation state
  const [markets, setMarkets] = useState<MarketItem[]>([
    { symbol: '^GSPC', name: 'S&P 500', price: 5430.50, change: 0.42, type: 'index' },
    { symbol: '^IXIC', name: 'NASDAQ', price: 17620.20, change: 0.85, type: 'index' },
    { symbol: 'DECU', name: 'Decuples Alpha', price: 142.15, change: 1.58, type: 'stock' },
    { symbol: 'BTC', name: 'Bitcoin (BTC/USD)', price: 68420.00, change: -1.15, type: 'crypto' },
    { symbol: 'ETH', name: 'Ethereum (ETH/USD)', price: 3510.50, change: 2.34, type: 'crypto' },
    { symbol: 'XAU', name: 'Gold Spot', price: 2345.80, change: -0.12, type: 'commodity' }
  ]);

  // Market tick simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setMarkets(prev =>
        prev.map(item => {
          const swingPct = (Math.random() - 0.48) * 0.15;
          const oldPrice = item.price;
          const newPrice = Math.max(1, oldPrice + oldPrice * (swingPct / 100));
          const newChange = item.change + swingPct;
          return {
            ...item,
            price: newPrice,
            change: parseFloat(newChange.toFixed(2))
          };
        })
      );
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  // 2. Fund investment selections
  const funds: FundOption[] = [
    {
      id: 'decu-compound',
      name: 'Decuples Compound Yield Fund (DCSF)',
      apy: 14.8,
      risk: 'High',
      type: 'Mutual Fund',
      description: 'Algorithmic dynamic compound yield pooling focusing on tech-assets, short-term options, and real estate arbitrage.'
    },
    {
      id: 'decu-alpha',
      name: 'Decuples Managed Equity Fund (DMAF)',
      apy: 12.5,
      risk: 'Medium',
      type: 'Mutual Fund',
      description: 'Managed growth-equity portfolio of high-growth tech firms with robust margins and defensive market positioning.'
    },
    {
      id: 'sp500',
      name: 'Vanguard S&P 500 Index (VOO)',
      apy: 10.4,
      risk: 'Medium',
      type: 'Index Fund',
      description: 'Passive tracking of the top 500 blue-chip companies in the United States.'
    },
    {
      id: 'hysa',
      name: 'Premium High-Yield Savings (HYSA)',
      apy: 5.15,
      risk: 'Low',
      type: 'Cash Reserve',
      description: 'Fully insured capital reserve accounts with daily liquidity and high yield matching overnight rates.'
    },
    {
      id: 'gov-bonds',
      name: 'Decuples Treasury Yield Bonds',
      apy: 4.85,
      risk: 'Low',
      type: 'Bonds',
      description: 'Ultra-safe sovereign debt portfolio backed by treasury bonds providing fixed tax-advantaged interest.'
    }
  ];

  // 3. Calculator State
  const defaultInvestAmount = Math.max(500, Math.round(netSavings > 0 ? netSavings * 5 : 2000));
  const [investAmount, setInvestAmount] = useState<string>(defaultInvestAmount.toString());
  const [selectedFundId, setSelectedFundId] = useState<string>('decu-compound');
  const [years, setYears] = useState<number>(5);

  const selectedFund = useMemo(() => {
    return funds.find(f => f.id === selectedFundId) || funds[0];
  }, [selectedFundId]);

  // Compute returns: A = P(1 + r)^t
  const calculations = useMemo(() => {
    const P = parseFloat(investAmount) || 0;
    const r = selectedFund.apy / 100;
    const t = years;
    const finalBalance = P * Math.pow(1 + r, t);
    const interestEarned = finalBalance - P;
    const monthlyPassive = (finalBalance * r) / 12;

    return {
      principal: P,
      finalBalance,
      interestEarned,
      monthlyPassive
    };
  }, [investAmount, selectedFund, years]);

  return (
    <div
      id="market-advisory-container"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-5 h-full flex flex-col justify-between"
    >
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <LucideIcon name="TrendingUp" className="text-indigo-600 dark:text-indigo-400" size={18} />
              <span>Decuples Markets & Advisory</span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Market ticker and yield optimization recommendations
            </p>
          </div>
          <span className="text-[11px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/40 self-start sm:self-auto whitespace-nowrap">
            Live Ticker
          </span>
        </div>

        {/* Markets Ticker Widget */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {markets.map((item) => {
            const isPositive = item.change >= 0;
            return (
              <div
                key={item.symbol}
                className="p-2.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{item.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono font-semibold shrink-0">{item.symbol}</span>
                </div>
                <div className="flex items-end justify-between mt-1.5 gap-1">
                  <span className="text-xs font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {formatAmount(item.price, activeCurrency)}
                  </span>
                  <span
                    className={`text-[10px] font-bold font-mono tabular-nums flex items-center gap-0.5 shrink-0 ${
                      isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    <LucideIcon name={isPositive ? 'TrendingUp' : 'TrendingDown'} size={10} />
                    {isPositive ? '+' : ''}
                    {item.change.toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Advisory Tips with dynamic Savings link */}
        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-4 flex gap-3 items-start">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0">
            <LucideIcon name="Lightbulb" size={16} />
          </div>
          <div className="space-y-1 text-xs">
            <h4 className="font-semibold text-indigo-950 dark:text-indigo-300">Decuples Yield Boost Strategy</h4>
            {netSavings > 0 ? (
              <p className="text-indigo-800 dark:text-indigo-300/90 leading-relaxed">
                Based on your current month net surplus of <strong className="text-indigo-950 dark:text-white font-semibold">{formatAmount(netSavings, activeCurrency)}</strong>, allocating surplus into the <strong className="text-indigo-950 dark:text-white font-semibold">Decuples Compound Yield Fund (14.8% APY)</strong> projects an extra <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{formatAmount((netSavings * 0.148) / 12, activeCurrency)}/mo</strong> in passive yield.
              </p>
            ) : (
              <p className="text-indigo-800 dark:text-indigo-300/90 leading-relaxed">
                Trimming non-essential expenses to reach a positive monthly surplus unlocks automated compounding. Investing <strong className="text-indigo-950 dark:text-white font-semibold">{formatAmount(150, activeCurrency)}/mo</strong> can grow past <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{formatAmount(11500, activeCurrency)}</strong> over 5 years at 14.8% APY.
              </p>
            )}
          </div>
        </div>

        {/* Calculator Section (Full Mode Only) */}
        {!compact && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Left Side: Inputs */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Interactive Compound Return Tool
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Investment Capital ({activeCurrency.code})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-slate-400 font-mono">
                      {activeCurrency.symbol}
                    </span>
                    <input
                      type="number"
                      value={investAmount}
                      onChange={(e) => setInvestAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="2000"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Investment Vehicle / Fund
                  </label>
                  <select
                    value={selectedFundId}
                    onChange={(e) => setSelectedFundId(e.target.value)}
                    className="w-full p-1.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none"
                  >
                    {funds.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.apy}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Holding Duration</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{years} Years</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-400">1 Yr</span>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    value={years}
                    onChange={(e) => setYears(parseInt(e.target.value))}
                    className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <span className="text-[10px] text-slate-400">15 Yrs</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-md uppercase">
                    {selectedFund.type}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500">
                    Risk Rating:{' '}
                    <span
                      className={`font-bold ${
                        selectedFund.risk === 'Low'
                          ? 'text-emerald-600'
                          : selectedFund.risk === 'Medium'
                          ? 'text-amber-500'
                          : 'text-rose-500'
                      }`}
                    >
                      {selectedFund.risk}
                    </span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal pt-1">{selectedFund.description}</p>
              </div>
            </div>

            {/* Right Side: Visual results projection */}
            <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between space-y-4">
              <div>
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Projected Returns Summary
                </h4>
                <div className="mt-2.5 space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-500 font-medium">Original Investment:</span>
                    <span className="text-xs font-bold font-mono tabular-nums text-slate-800 dark:text-slate-200">
                      {formatAmount(calculations.principal / activeCurrency.rate, activeCurrency)}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-500 font-medium">Interest Profit Earned:</span>
                    <span className="text-xs font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                      +{formatAmount(calculations.interestEarned / activeCurrency.rate, activeCurrency)}
                    </span>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800 pt-2.5 flex justify-between items-baseline">
                    <span className="text-sm text-slate-800 dark:text-slate-200 font-bold">
                      Total Wealth Balance:
                    </span>
                    <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">
                      {formatAmount(calculations.finalBalance / activeCurrency.rate, activeCurrency)}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline text-[10px] text-slate-400">
                    <span>Equivalent Monthly Yield:</span>
                    <span className="font-semibold font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      +{formatAmount(calculations.monthlyPassive / activeCurrency.rate, activeCurrency)}/mo
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress bar split */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase">
                  <span>
                    Principal ({Math.round((calculations.principal / (calculations.finalBalance || 1)) * 100)}%)
                  </span>
                  <span>
                    Profit ({Math.round((calculations.interestEarned / (calculations.finalBalance || 1)) * 100)}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full flex overflow-hidden">
                  <div
                    style={{ width: `${(calculations.principal / (calculations.finalBalance || 1)) * 100}%` }}
                    className="bg-indigo-500 h-full"
                    title="Principal Amount"
                  />
                  <div
                    style={{ width: `${(calculations.interestEarned / (calculations.finalBalance || 1)) * 100}%` }}
                    className="bg-emerald-400 dark:bg-emerald-500 h-full"
                    title="Compound Earnings"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {compact && onOpenFull && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onOpenFull}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
          >
            <span>Open Full Markets & Yield Calculator</span>
            <LucideIcon name="ArrowRight" size={13} />
          </button>
        </div>
      )}
    </div>
  );
};
