/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AppCategory,
  Transaction,
  Budget,
  Goal,
  ChatMessage,
  Currency,
  ConnectedApp,
  GlobalCollectionPermissions,
  PendingWebhookAlert
} from './types';
import { INITIAL_TRANSACTIONS, INITIAL_BUDGETS, INITIAL_GOALS } from './utils/mockData';
import { DEFAULT_CONNECTED_APPS, DEFAULT_GLOBAL_PERMISSIONS } from './utils/connectedApps';
import { LucideIcon } from './components/LucideIcon';
import { TransactionLogger } from './components/TransactionLogger';
import { BudgetSection } from './components/BudgetSection';
import { TransactionList } from './components/TransactionList';
import { SavingsGoalList } from './components/SavingsGoalList';
import { InsightPanel } from './components/InsightPanel';
import { AdvisorChat } from './components/AdvisorChat';
import { FinanceCharts } from './components/FinanceCharts';
import { ExcelImportModal } from './components/ExcelImportModal';
import { MarketAdvisory } from './components/MarketAdvisory';
import { ConnectedAppsCard } from './components/ConnectedAppsCard';
import { AppCollectorModal } from './components/AppCollectorModal';
import { LeftSidebar, SidebarMenuId } from './components/LeftSidebar';
import { FinancialCalendar } from './components/FinancialCalendar';
import { CURRENCY_LIST, formatAmount } from './utils/currency';

export default function App() {
  const [activeMenu, setActiveMenu] = useState<SidebarMenuId>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('decu_sidebar_collapsed') === 'true';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [isAppCollectorOpen, setIsAppCollectorOpen] = useState(false);
  const [appCollectorTab, setAppCollectorTab] = useState<'collect' | 'permissions' | 'add'>('collect');
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Load active currency from localStorage
  const [activeCurrency, setActiveCurrency] = useState<Currency>(() => {
    const saved = localStorage.getItem('decu_currency');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return CURRENCY_LIST[0]; // USD
  });

  // Load initial data from localStorage or fallback to defaults
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('pw_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('pw_budgets');
    return saved ? JSON.parse(saved) : INITIAL_BUDGETS;
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem('pw_goals');
    return saved ? JSON.parse(saved) : INITIAL_GOALS;
  });

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('pw_chathistory');
    return saved ? JSON.parse(saved) : [];
  });

  const [connectedApps, setConnectedApps] = useState<ConnectedApp[]>(() => {
    const saved = localStorage.getItem('decu_connected_apps');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return DEFAULT_CONNECTED_APPS;
  });

  const [globalPermissions, setGlobalPermissions] = useState<GlobalCollectionPermissions>(() => {
    const saved = localStorage.getItem('decu_collection_permissions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return DEFAULT_GLOBAL_PERMISSIONS;
  });

  const [pendingWebhooks, setPendingWebhooks] = useState<PendingWebhookAlert[]>([]);

  const [activeTheme, setActiveTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('decu_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('decu_currency', JSON.stringify(activeCurrency));
  }, [activeCurrency]);

  useEffect(() => {
    localStorage.setItem('pw_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('pw_budgets', JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem('pw_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('pw_chathistory', JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    localStorage.setItem('decu_connected_apps', JSON.stringify(connectedApps));
  }, [connectedApps]);

  useEffect(() => {
    localStorage.setItem('decu_collection_permissions', JSON.stringify(globalPermissions));
  }, [globalPermissions]);

  const refreshPendingWebhooks = useCallback(async () => {
    try {
      const res = await fetch('/api/app-payments/pending');
      if (res.ok) {
        const data = await res.json();
        setPendingWebhooks(data.alerts || []);
      }
    } catch {
      // Ignore network errors silently during background check
    }
  }, []);

  useEffect(() => {
    refreshPendingWebhooks();
  }, [refreshPendingWebhooks]);

  // Apply and persist visual theme to the document element
  useEffect(() => {
    localStorage.setItem('decu_theme', activeTheme);
    if (activeTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.style.colorScheme = activeTheme;
  }, [activeTheme]);

  useEffect(() => {
    localStorage.setItem('decu_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // --- Financial Calculations ---
  const currentMonthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"

  // Aggregate stats
  const stats = useMemo(() => {
    const currentMonthExpenses = transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(currentMonthStr))
      .reduce((sum, t) => sum + t.amount, 0);

    const currentMonthIncomes = transactions
      .filter(t => t.type === 'income' && t.date.startsWith(currentMonthStr))
      .reduce((sum, t) => sum + t.amount, 0);

    const netSavings = currentMonthIncomes - currentMonthExpenses;
    const savingsRate = currentMonthIncomes > 0 ? (netSavings / currentMonthIncomes) * 100 : 0;

    // Overall historical balance
    const totalExpensesHistory = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const totalIncomesHistory = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const overallBalance = totalIncomesHistory - totalExpensesHistory;

    return {
      currentMonthExpenses,
      currentMonthIncomes,
      netSavings,
      savingsRate,
      overallBalance
    };
  }, [transactions, currentMonthStr]);

  // --- Core State Mutators ---
  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>, nextMonthTx?: Omit<Transaction, 'id'>) => {
    const timestamp = Date.now();
    const txWithId: Transaction = {
      ...newTx,
      id: `t-${timestamp}`
    };

    if (nextMonthTx) {
      const nextTxWithId: Transaction = {
        ...nextMonthTx,
        id: `t-${timestamp}-next`,
        originalTransactionId: txWithId.id
      };
      setTransactions(prev => [txWithId, nextTxWithId, ...prev]);
    } else {
      setTransactions(prev => [txWithId, ...prev]);
    }
  };

  const handleImportTransactions = (newTxs: Omit<Transaction, 'id'>[]) => {
    const txsWithIds: Transaction[] = newTxs.map((tx, idx) => ({
      ...tx,
      id: `t-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`
    }));
    setTransactions(prev => [...txsWithIds, ...prev]);
  };

  const handleDeleteTransaction = (id: string) => {
    if (window.confirm('Are you sure you want to delete this financial record?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleUpdateBudget = (category: string, limit: number) => {
    setBudgets(prev => {
      const exists = prev.find(b => b.category === category);
      if (exists) {
        return prev.map(b => b.category === category ? { ...b, limit } : b);
      } else {
        return [...prev, { category, limit }];
      }
    });
  };

  const handleAddGoal = (newGoal: Omit<Goal, 'id'>) => {
    const goalWithId: Goal = {
      ...newGoal,
      id: `g-${Date.now()}`
    };
    setGoals(prev => [...prev, goalWithId]);
  };

  const handleContributeGoal = (id: string, amount: number) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, currentAmount: g.currentAmount + amount } : g));
    
    // Log as a special transaction for full-scope accountability
    const goal = goals.find(g => g.id === id);
    if (goal) {
      handleAddTransaction({
        amount,
        category: 'Others',
        date: new Date().toISOString().split('T')[0],
        description: `Saved for: ${goal.title}`,
        type: 'expense',
        paymentMethod: 'Debit Card'
      });
    }
  };

  const handleDeleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const handleAddChatMessage = (msg: ChatMessage) => {
    setChatHistory(prev => [...prev, msg]);
  };

  // --- Connected Apps & Permissions Mutators ---
  const handleOpenAppCollector = (tab: 'collect' | 'permissions' | 'add') => {
    setAppCollectorTab(tab);
    setIsAppCollectorOpen(true);
    refreshPendingWebhooks();
  };

  const handleToggleAppPermission = (appId: string) => {
    setConnectedApps(prev =>
      prev.map(app =>
        app.id === appId
          ? { ...app, permissionEnabled: !app.permissionEnabled }
          : app
      )
    );
  };

  const handleUpdateAppGranularPermission = (
    appId: string,
    key: keyof ConnectedApp['permissions']
  ) => {
    setConnectedApps(prev =>
      prev.map(app =>
        app.id === appId
          ? {
              ...app,
              permissions: {
                ...app.permissions,
                [key]: !app.permissions[key]
              }
            }
          : app
      )
    );
  };

  const handleBulkSetCategoryPermission = (category: 'all' | AppCategory, enabled: boolean) => {
    setConnectedApps(prev =>
      prev.map(app =>
        category === 'all' || app.category === category
          ? { ...app, permissionEnabled: enabled }
          : app
      )
    );
  };

  const handleUpdateGlobalPermission = (key: keyof GlobalCollectionPermissions) => {
    setGlobalPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleAddCustomApp = (newAppData: Omit<ConnectedApp, 'id'>): ConnectedApp => {
    const created: ConnectedApp = {
      ...newAppData,
      id: `app-custom-${Date.now()}`
    };
    setConnectedApps(prev => [created, ...prev]);
    return created;
  };

  const handleRemoveCustomApp = (appId: string) => {
    setConnectedApps(prev => prev.filter(app => app.id !== appId));
  };

  const handleImportCollectedTransactions = async (
    newTxs: Omit<Transaction, 'id'>[],
    sourceAppCounts: Record<string, number>,
    consumedWebhookIds: string[]
  ) => {
    const txsWithIds: Transaction[] = newTxs.map((tx, idx) => ({
      ...tx,
      id: `t-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`
    }));
    setTransactions(prev => [...txsWithIds, ...prev]);

    const nowIso = new Date().toISOString();
    setConnectedApps(prev =>
      prev.map(app => {
        const added = sourceAppCounts[app.id] || 0;
        return added > 0
          ? {
              ...app,
              collectedCount: (app.collectedCount || 0) + added,
              lastSyncedAt: nowIso
            }
          : app;
      })
    );

    if (consumedWebhookIds.length > 0) {
      try {
        await fetch('/api/app-payments/clear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: consumedWebhookIds })
        });
        await refreshPendingWebhooks();
      } catch {
        // Ignore clear error
      }
    }
  };

  // --- Data Portability & Utility ---
  const handleLoadDemoData = () => {
    if (window.confirm('Overwrite current records with premium demo data?')) {
      setTransactions(INITIAL_TRANSACTIONS);
      setBudgets(INITIAL_BUDGETS);
      setGoals(INITIAL_GOALS);
      setChatHistory([]);
    }
  };

  const handleClearAllData = () => {
    if (window.confirm('WARNING: This will permanently delete all your transaction records, active budgets, and savings goals. Continue?')) {
      setTransactions([]);
      setBudgets([]);
      setGoals([]);
      setChatHistory([]);
    }
  };

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
      JSON.stringify({ transactions, budgets, goals, chatHistory, connectedApps, globalPermissions })
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Decuples_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.transactions) setTransactions(parsed.transactions);
          if (parsed.budgets) setBudgets(parsed.budgets);
          if (parsed.goals) setGoals(parsed.goals);
          if (parsed.chatHistory) setChatHistory(parsed.chatHistory);
          if (parsed.connectedApps) setConnectedApps(parsed.connectedApps);
          if (parsed.globalPermissions) setGlobalPermissions(parsed.globalPermissions);
          alert('Data imported successfully!');
        } catch (err) {
          alert('Failed to parse backup file. Make sure it is a valid Decuples JSON file.');
        }
      };
    }
  };

  const menuMeta: Record<SidebarMenuId, { title: string; subtitle: string }> = {
    overview: {
      title: 'Financial Overview',
      subtitle: 'Net balance, cashflow snapshot, recent activity, and horizontal AI advisory'
    },
    transactions: {
      title: 'Transactions & Ledger',
      subtitle: 'Log expenses with AI or manual entry and inspect your ledger'
    },
    calendar: {
      title: 'Financial Calendar',
      subtitle: 'Monthly payment schedule and recurring next-month commitments'
    },
    apps: {
      title: 'App Sync & Permissions',
      subtitle: 'Manage collection permissions for UPI, food, shopping, and other apps'
    },
    budgets: {
      title: 'Category Budgets',
      subtitle: 'Track monthly limits and category expenditure share'
    },
    goals: {
      title: 'Savings Milestones',
      subtitle: 'Set target goals, contribute funds, and monitor progress'
    },
    insights: {
      title: 'AI Insights & Markets',
      subtitle: 'Gemini financial planning, market ticker, and yield calculator'
    },
    data: {
      title: 'Import & Backup',
      subtitle: 'Excel/CSV import, JSON backup export, and workspace data tools'
    }
  };

  const permittedAppsCount = connectedApps.filter((a) => a.permissionEnabled).length;
  const recurringCount = transactions.filter((t) => t.isRecurring).length;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Left Side Panel with Multiple Menus + Collapse/Expand + Dark Mode Option */}
      <LeftSidebar
        activeMenu={activeMenu}
        onSelectMenu={setActiveMenu}
        activeTheme={activeTheme}
        onSetTheme={setActiveTheme}
        permittedAppsCount={permittedAppsCount}
        pendingWebhooksCount={pendingWebhooks.length}
        recurringCount={recurringCount}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Right Workspace Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header Bar */}
        <header
          id="main-app-header"
          className="bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 backdrop-blur-md"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                id="btn-mobile-sidebar"
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                aria-label="Open navigation menu"
                className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
              >
                <LucideIcon name="Menu" size={20} />
              </button>

              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                  {menuMeta[activeMenu].title}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                  {menuMeta[activeMenu].subtitle}
                </p>
              </div>
            </div>

            {/* Right Controls: Currency + Clear Dark Mode Button + App Sync */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Currency selector */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Currency
                </span>
                <select
                  id="header-currency-selector"
                  value={activeCurrency.code}
                  onChange={(e) => {
                    const found = CURRENCY_LIST.find((c) => c.code === e.target.value);
                    if (found) setActiveCurrency(found);
                  }}
                  className="bg-transparent text-slate-800 dark:text-slate-100 text-xs font-bold focus:outline-none cursor-pointer"
                >
                  {CURRENCY_LIST.map((curr) => (
                    <option
                      key={curr.code}
                      value={curr.code}
                      className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    >
                      {curr.symbol} {curr.code}
                    </option>
                  ))}
                </select>
              </div>

              {/* Explicit Dark Mode Toggle Button */}
              <button
                id="btn-theme-toggle"
                type="button"
                onClick={() => setActiveTheme(activeTheme === 'light' ? 'dark' : 'light')}
                aria-label={`Switch to ${activeTheme === 'light' ? 'dark' : 'light'} mode`}
                title={`Switch to ${activeTheme === 'light' ? 'dark' : 'light'} mode`}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <LucideIcon name={activeTheme === 'light' ? 'Moon' : 'Sun'} size={14} />
                <span className="hidden sm:inline">
                  {activeTheme === 'light' ? 'Dark Mode' : 'Light Mode'}
                </span>
              </button>

              {/* Primary Quick Action */}
              <button
                id="btn-header-connected-apps"
                type="button"
                onClick={() => handleOpenAppCollector('collect')}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <LucideIcon name="Smartphone" size={14} />
                <span>App Sync ({permittedAppsCount})</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Frame */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-7">
          {/* OVERVIEW VIEW (Focused, Concise Summary + Horizontal AI Insights & Advisory) */}
          {activeMenu === 'overview' && (
            <>
              {/* KPI Scorecard Stat Cards */}
              <section id="kpi-stats-grid" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Historical Net Balance
                    </span>
                    <p
                      className={`text-xl font-bold font-mono tabular-nums tracking-tight ${
                        stats.overallBalance >= 0
                          ? 'text-slate-900 dark:text-white'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {stats.overallBalance >= 0 ? '' : '-'}
                      {formatAmount(Math.abs(stats.overallBalance), activeCurrency)}
                    </p>
                  </div>
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <LucideIcon name="Wallet" size={18} />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Income This Month
                    </span>
                    <p className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 tracking-tight">
                      +{formatAmount(stats.currentMonthIncomes, activeCurrency)}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <LucideIcon name="TrendingUp" size={18} />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Outflows This Month
                    </span>
                    <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white tracking-tight">
                      -{formatAmount(stats.currentMonthExpenses, activeCurrency)}
                    </p>
                  </div>
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 rounded-xl">
                    <LucideIcon name="TrendingDown" size={18} />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Savings Rate
                    </span>
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <p className="text-xl font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400 tracking-tight">
                        {stats.savingsRate.toFixed(1)}%
                      </p>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        ({stats.netSavings >= 0 ? '+' : '-'}
                        {formatAmount(Math.abs(stats.netSavings), activeCurrency)})
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
                    <LucideIcon name="CheckCircle" size={18} />
                  </div>
                </div>
              </section>

              {/* Charts Row */}
              <section id="charts-wrapper">
                <FinanceCharts transactions={transactions} activeCurrency={activeCurrency} />
              </section>

              {/* Recent Activity Dedicated Row */}
              <section
                id="overview-recent-activity"
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Recent Activity
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Latest 4 entries from your ledger
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveMenu('transactions')}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition"
                    >
                      <LucideIcon name="Plus" size={13} className="text-indigo-500" />
                      <span>Log Expense</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMenu('apps')}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition"
                    >
                      <LucideIcon name="Smartphone" size={13} className="text-indigo-500" />
                      <span>Apps ({permittedAppsCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMenu('transactions')}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-1 transition"
                    >
                      <span>View all</span>
                      <LucideIcon name="ArrowRight" size={12} />
                    </button>
                  </div>
                </div>

                {transactions.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    No transactions logged yet
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    {transactions.slice(0, 4).map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {tx.description}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {tx.category} · {tx.date}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-bold font-mono tabular-nums shrink-0 ${
                            tx.type === 'income'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'}
                          {formatAmount(tx.amount, activeCurrency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Horizontal AI Insights & Market Advisory Row */}
              <section
                id="overview-ai-advisory-horizontal"
                className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch"
              >
                <InsightPanel
                  transactions={transactions}
                  budgets={budgets}
                  goals={goals}
                  compact
                  onViewMore={() => setActiveMenu('insights')}
                />
                <MarketAdvisory
                  netSavings={stats.netSavings}
                  activeCurrency={activeCurrency}
                  compact
                  onOpenFull={() => setActiveMenu('insights')}
                />
              </section>
            </>
          )}

          {/* TRANSACTIONS VIEW */}
          {activeMenu === 'transactions' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5 space-y-6">
                <TransactionLogger onAddTransaction={handleAddTransaction} activeCurrency={activeCurrency} />
              </div>
              <div className="lg:col-span-7">
                <TransactionList
                  transactions={transactions}
                  onDeleteTransaction={handleDeleteTransaction}
                  activeCurrency={activeCurrency}
                />
              </div>
            </div>
          )}

          {/* CALENDAR VIEW */}
          {activeMenu === 'calendar' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
              <FinancialCalendar
                transactions={transactions}
                activeCurrency={activeCurrency}
                onDeleteTransaction={handleDeleteTransaction}
              />
            </div>
          )}

          {/* APP CONNECTIONS & PERMISSIONS VIEW */}
          {activeMenu === 'apps' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-6">
                <ConnectedAppsCard
                  connectedApps={connectedApps}
                  globalPermissions={globalPermissions}
                  pendingWebhookCount={pendingWebhooks.length}
                  onToggleAppPermission={handleToggleAppPermission}
                  onOpenCollector={handleOpenAppCollector}
                />
              </div>
              <div className="lg:col-span-6 space-y-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Payment Data Collection Actions
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Collect payments from UPI apps, food delivery apps, and shopping apps, configure per-app permissions, or register a new app and device webhook.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenAppCollector('collect')}
                      className="p-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex flex-col items-start gap-2 transition"
                    >
                      <LucideIcon name="RefreshCw" size={16} />
                      <span>Collect Payments</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAppCollector('permissions')}
                      className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold flex flex-col items-start gap-2 transition"
                    >
                      <LucideIcon name="ShieldCheck" size={16} />
                      <span>All Permissions</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAppCollector('add')}
                      className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold flex flex-col items-start gap-2 transition"
                    >
                      <LucideIcon name="Plus" size={16} />
                      <span>Add App / Webhook</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BUDGETS VIEW */}
          {activeMenu === 'budgets' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-6">
                <BudgetSection
                  budgets={budgets}
                  transactions={transactions}
                  onUpdateBudget={handleUpdateBudget}
                  activeCurrency={activeCurrency}
                />
              </div>
              <div className="lg:col-span-6">
                <FinanceCharts transactions={transactions} activeCurrency={activeCurrency} />
              </div>
            </div>
          )}

          {/* GOALS VIEW */}
          {activeMenu === 'goals' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-6">
                <SavingsGoalList
                  goals={goals}
                  onAddGoal={handleAddGoal}
                  onContributeGoal={handleContributeGoal}
                  onDeleteGoal={handleDeleteGoal}
                  activeCurrency={activeCurrency}
                />
              </div>
              <div className="lg:col-span-6">
                <MarketAdvisory netSavings={stats.netSavings} activeCurrency={activeCurrency} />
              </div>
            </div>
          )}

          {/* AI INSIGHTS & MARKETS VIEW (Side-by-side Horizontal Layout) */}
          {activeMenu === 'insights' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
              <div className="md:col-span-5">
                <InsightPanel transactions={transactions} budgets={budgets} goals={goals} />
              </div>
              <div className="md:col-span-7">
                <MarketAdvisory netSavings={stats.netSavings} activeCurrency={activeCurrency} />
              </div>
            </div>
          )}

          {/* IMPORT & BACKUP VIEW */}
          {activeMenu === 'data' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <LucideIcon name="FileSpreadsheet" size={18} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Import & Export Records</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Import spreadsheets (.xlsx, .csv) with smart column mapping, or export and restore full Decuples JSON backups including connected app permissions.
                </p>
                <div className="flex flex-wrap gap-2.5 pt-2">
                  <button
                    id="btn-import-excel"
                    type="button"
                    onClick={() => setIsExcelImportOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                  >
                    <LucideIcon name="FileSpreadsheet" size={14} />
                    <span>Import Excel / CSV</span>
                  </button>
                  <button
                    id="btn-export-json"
                    type="button"
                    onClick={handleExportData}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                  >
                    <LucideIcon name="Download" size={14} />
                    <span>Download JSON Backup</span>
                  </button>
                  <label className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer">
                    <LucideIcon name="Upload" size={14} />
                    <span>Restore JSON Backup</span>
                    <input type="file" onChange={handleImportData} className="hidden" accept=".json" />
                  </label>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <LucideIcon name="Database" size={18} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Workspace Reset & Demo Dataset</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Load sample financial records to explore charts and budgets, or clear all stored transactions, budgets, and goals.
                </p>
                <div className="flex flex-wrap gap-2.5 pt-2">
                  <button
                    id="btn-load-demo"
                    type="button"
                    onClick={handleLoadDemoData}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                  >
                    <LucideIcon name="Download" size={14} />
                    <span>Load Demo Data</span>
                  </button>
                  <button
                    id="btn-clear-data"
                    type="button"
                    onClick={handleClearAllData}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                  >
                    <LucideIcon name="Trash2" size={14} />
                    <span>Clear All Data</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Simple Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 mt-10 py-5 bg-white dark:bg-slate-900 text-center text-xs text-slate-500 dark:text-slate-400">
          <p>© 2026 Decuples Inc. Secure full-stack intelligence built with Gemini AI.</p>
        </footer>
      </div>

      <ExcelImportModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        onImportTransactions={handleImportTransactions}
      />

      <AppCollectorModal
        isOpen={isAppCollectorOpen}
        initialTab={appCollectorTab}
        onClose={() => setIsAppCollectorOpen(false)}
        connectedApps={connectedApps}
        globalPermissions={globalPermissions}
        activeCurrency={activeCurrency}
        pendingWebhooks={pendingWebhooks}
        onRefreshWebhooks={refreshPendingWebhooks}
        onToggleAppPermission={handleToggleAppPermission}
        onUpdateAppGranularPermission={handleUpdateAppGranularPermission}
        onBulkSetCategoryPermission={handleBulkSetCategoryPermission}
        onUpdateGlobalPermission={handleUpdateGlobalPermission}
        onAddCustomApp={handleAddCustomApp}
        onRemoveCustomApp={handleRemoveCustomApp}
        onImportCollectedTransactions={handleImportCollectedTransactions}
      />

      {/* Floating Advisor Chat Trigger and Panel */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans">
        {/* Chat window */}
        {isChatOpen && (
          <div className="w-[380px] sm:w-[420px] max-w-[92vw] h-[580px] max-h-[80vh] shadow-2xl border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950 flex flex-col animate-in slide-in-from-bottom-5 duration-300">
            <AdvisorChat
              transactions={transactions}
              budgets={budgets}
              goals={goals}
              chatHistory={chatHistory}
              onAddChatMessage={handleAddChatMessage}
              onCloseChat={() => setIsChatOpen(false)}
            />
          </div>
        )}

        {/* Toggle Button */}
        <button
          id="btn-toggle-floating-chat"
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform active:scale-95 group"
        >
          <div className="relative">
            {isChatOpen ? (
              <LucideIcon name="X" size={18} className="rotate-0 transition-transform duration-300" />
            ) : (
              <div className="flex items-center justify-center">
                <LucideIcon name="MessageSquare" size={18} className="animate-pulse" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />
              </div>
            )}
          </div>
          <span>{isChatOpen ? 'Close Advisor' : 'Chat with Wealth Advisor'}</span>
        </button>
      </div>
    </div>
  );
}
