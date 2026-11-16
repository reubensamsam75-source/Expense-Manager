/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  AppCategory,
  CollectedAppTransaction,
  ConnectedApp,
  Currency,
  GlobalCollectionPermissions,
  PendingWebhookAlert,
  Transaction
} from '../types';
import { LucideIcon } from './LucideIcon';
import { ReceiptScanner } from './ReceiptScanner';
import { APP_CATEGORY_META } from '../utils/connectedApps';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/mockData';
import { formatAmount } from '../utils/currency';
import { motion, AnimatePresence } from 'motion/react';

interface AppCollectorModalProps {
  isOpen: boolean;
  initialTab: 'collect' | 'permissions' | 'add';
  onClose: () => void;
  connectedApps: ConnectedApp[];
  globalPermissions: GlobalCollectionPermissions;
  activeCurrency: Currency;
  pendingWebhooks: PendingWebhookAlert[];
  collectedRecords: CollectedAppTransaction[];
  onClearCollectedRecords: () => void;
  onSaveCollectedBatch: (rows: CollectedAppTransaction[]) => void;
  onRefreshWebhooks: () => Promise<void>;
  onToggleAppPermission: (appId: string) => void;
  onUpdateAppGranularPermission: (
    appId: string,
    key: keyof ConnectedApp['permissions']
  ) => void;
  onBulkSetCategoryPermission: (category: 'all' | AppCategory, enabled: boolean) => void;
  onUpdateGlobalPermission: (key: keyof GlobalCollectionPermissions) => void;
  onAddCustomApp: (app: Omit<ConnectedApp, 'id'>) => ConnectedApp;
  onRemoveCustomApp: (appId: string) => void;
  onImportCollectedTransactions: (
    txs: Omit<Transaction, 'id'>[],
    sourceAppCounts: Record<string, number>,
    consumedWebhookIds: string[],
    importedTempIds: string[]
  ) => void;
}

const LEDGER_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

const PAYMENT_METHODS = ['UPI', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Cash'];

export const AppCollectorModal: React.FC<AppCollectorModalProps> = ({
  isOpen,
  initialTab,
  onClose,
  connectedApps,
  globalPermissions,
  activeCurrency,
  pendingWebhooks,
  collectedRecords,
  onClearCollectedRecords,
  onSaveCollectedBatch,
  onRefreshWebhooks,
  onToggleAppPermission,
  onUpdateAppGranularPermission,
  onBulkSetCategoryPermission,
  onUpdateGlobalPermission,
  onAddCustomApp,
  onRemoveCustomApp,
  onImportCollectedTransactions
}) => {
  const [activeTab, setActiveTab] = useState<'collect' | 'permissions' | 'add'>(initialTab);

  // Sync activeTab whenever modal opens with a specific initialTab
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // --- Collect Tab State (persisted drafts in localStorage) ---
  const [rawAlertText, setRawAlertText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [extractedRows, setExtractedRows] = useState<CollectedAppTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('decu_collected_drafts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('decu_collected_drafts');
      const parsed: CollectedAppTransaction[] = saved ? JSON.parse(saved) : [];
      return new Set(parsed.filter((p) => p.permissionStatus === 'granted').map((p) => p.tempId));
    } catch {
      return new Set();
    }
  });
  const [consumedWebhookIds, setConsumedWebhookIds] = useState<string[]>([]);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('decu_collected_drafts', JSON.stringify(extractedRows));
    } catch {
      // Ignore storage quota errors
    }
  }, [extractedRows]);

  // --- Permissions Tab State ---
  const [permCategoryFilter, setPermCategoryFilter] = useState<'all' | AppCategory>('all');
  const [permSearch, setPermSearch] = useState('');

  // --- Add App Tab State ---
  const [newAppName, setNewAppName] = useState('');
  const [newAppCategory, setNewAppCategory] = useState<AppCategory>('upi');
  const [newAppLedgerCategory, setNewAppLedgerCategory] = useState('Others');
  const [newAppPaymentMethod, setNewAppPaymentMethod] = useState('UPI');
  const [newAppKeywords, setNewAppKeywords] = useState('');
  const [newAppPermEnabled, setNewAppPermEnabled] = useState(true);
  const [addSuccessMsg, setAddSuccessMsg] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const permittedAppCount = useMemo(
    () => connectedApps.filter((a) => a.permissionEnabled).length,
    [connectedApps]
  );

  // Re-evaluate extracted rows whenever connectedApps permissions change
  const evaluatedRows = useMemo(() => {
    return extractedRows.map((row) => {
      const matched = row.sourceAppId
        ? connectedApps.find((a) => a.id === row.sourceAppId)
        : connectedApps.find(
            (a) => a.name.toLowerCase() === row.sourceApp.toLowerCase()
          );

      const isPermitted = matched
        ? matched.permissionEnabled
        : !globalPermissions.requireExplicitAppPermission;

      return {
        ...row,
        sourceAppId: matched?.id || row.sourceAppId,
        permissionStatus: isPermitted ? ('granted' as const) : ('blocked' as const)
      };
    });
  }, [extractedRows, connectedApps, globalPermissions.requireExplicitAppPermission]);

  const permittedExtractedRows = useMemo(
    () => evaluatedRows.filter((r) => r.permissionStatus === 'granted' && selectedIds.has(r.tempId)),
    [evaluatedRows, selectedIds]
  );

  const filteredPermissionApps = useMemo(() => {
    return connectedApps.filter((app) => {
      const matchesCat = permCategoryFilter === 'all' || app.category === permCategoryFilter;
      const matchesQuery =
        !permSearch.trim() ||
        app.name.toLowerCase().includes(permSearch.toLowerCase()) ||
        app.keywords.some((k) => k.toLowerCase().includes(permSearch.toLowerCase()));
      return matchesCat && matchesQuery;
    });
  }, [connectedApps, permCategoryFilter, permSearch]);

  if (!isOpen) return null;

  const handleScanAlerts = async (textToScan: string, webhookIdsToConsume: string[] = []) => {
    if (!globalPermissions.notificationAccessEnabled && !globalPermissions.receiptParsingEnabled) {
      setScanError(
        'Payment alert and receipt collection permissions are disabled globally. Enable at least one channel in the App Permissions tab.'
      );
      return;
    }

    if (!textToScan.trim()) {
      setScanError('Paste payment alerts, UPI notifications, or upload a receipt file first.');
      return;
    }

    setIsScanning(true);
    setScanError(null);
    setImportFeedback(null);

    try {
      const response = await fetch('/api/collect-app-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: textToScan,
          connectedApps,
          currentDate: new Date().toISOString().split('T')[0],
          requireExplicitAppPermission: globalPermissions.requireExplicitAppPermission
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze payment notifications.');
      }

      const data = await response.json();
      const parsed: CollectedAppTransaction[] = data.transactions || [];
      if (parsed.length === 0) {
        setScanError('No valid payment amounts or transactions could be detected in that input.');
        setExtractedRows([]);
        return;
      }

      const enrichedBatch = parsed.map((p) => ({
        ...p,
        collectedAt: new Date().toISOString(),
        importedToLedger: false
      }));

      setExtractedRows(enrichedBatch);
      onSaveCollectedBatch(enrichedBatch);
      setConsumedWebhookIds(webhookIdsToConsume);
      // Automatically select all rows whose app permission is granted
      setSelectedIds(
        new Set(enrichedBatch.filter((p) => p.permissionStatus === 'granted').map((p) => p.tempId))
      );
    } catch (err: any) {
      setScanError(err.message || 'Unable to parse payment alerts.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleReceiptImageExtracted = ({
    receiptSummary,
    transactions
  }: {
    receiptSummary: string;
    transactions: CollectedAppTransaction[];
  }) => {
    const enrichedBatch = transactions.map((p) => ({
      ...p,
      collectedAt: new Date().toISOString(),
      importedToLedger: false
    }));

    setExtractedRows(enrichedBatch);
    onSaveCollectedBatch(enrichedBatch);
    setConsumedWebhookIds([]);
    setSelectedIds(
      new Set(enrichedBatch.filter((p) => p.permissionStatus === 'granted').map((p) => p.tempId))
    );
    setImportFeedback(receiptSummary);
    setShowReceiptScanner(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!globalPermissions.receiptParsingEnabled) {
      setScanError(
        'Receipt & Order File Parsing permission is disabled. Enable it in App Permissions.'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = (ev.target?.result as string) || '';
      setRawAlertText(content);
      handleScanAlerts(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSyncWebhookQueue = async () => {
    if (!globalPermissions.webhookSyncEnabled) {
      setScanError('Webhook Auto-Sync permission is disabled in App Permissions.');
      return;
    }
    if (pendingWebhooks.length === 0) {
      await onRefreshWebhooks();
      return;
    }

    const combinedText = pendingWebhooks
      .map(
        (w) =>
          `[${w.appName}] ${w.message}${w.amount ? ` (${activeCurrency.symbol}${w.amount})` : ''}${w.date ? ` on ${w.date}` : ''}`
      )
      .join('\n');

    setRawAlertText(combinedText);
    await handleScanAlerts(
      combinedText,
      pendingWebhooks.map((w) => w.id)
    );
  };

  const handleUnlockBlockedRow = (row: CollectedAppTransaction) => {
    if (row.sourceAppId) {
      onToggleAppPermission(row.sourceAppId);
      setSelectedIds((prev) => new Set([...prev, row.tempId]));
    } else {
      // Create and immediately enable this newly detected app
      const created = onAddCustomApp({
        name: row.sourceApp,
        category: row.sourceAppType || 'other',
        defaultLedgerCategory: row.category || 'Others',
        defaultPaymentMethod: row.paymentMethod || 'UPI',
        keywords: [row.sourceApp.toLowerCase()],
        permissionEnabled: true,
        permissions: {
          readPaymentAlerts: true,
          extractOrderReceipts: true,
          autoSyncWebhook: true
        },
        isCustom: true
      });
      setExtractedRows((prev) =>
        prev.map((r) =>
          r.sourceApp.toLowerCase() === row.sourceApp.toLowerCase()
            ? { ...r, sourceAppId: created.id }
            : r
        )
      );
      setSelectedIds((prev) => new Set([...prev, row.tempId]));
    }
  };

  const handleRowCategoryChange = (tempId: string, newCat: string) => {
    setExtractedRows((prev) =>
      prev.map((r) => (r.tempId === tempId ? { ...r, category: newCat } : r))
    );
  };

  const handleToggleRowSelect = (tempId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tempId)) next.delete(tempId);
      else next.add(tempId);
      return next;
    });
  };

  const handleImportPermitted = () => {
    if (permittedExtractedRows.length === 0) return;

    const sourceAppCounts: Record<string, number> = {};
    const importedTempIds: string[] = [];
    const txsToSave: Omit<Transaction, 'id'>[] = permittedExtractedRows.map((row) => {
      importedTempIds.push(row.tempId);
      if (row.sourceAppId) {
        sourceAppCounts[row.sourceAppId] = (sourceAppCounts[row.sourceAppId] || 0) + 1;
      }
      return {
        amount: row.amount / activeCurrency.rate,
        category: row.category || (row.type === 'income' ? INCOME_CATEGORIES[0] : 'Others'),
        date: row.date,
        description: row.description,
        type: row.type,
        paymentMethod: row.paymentMethod,
        sourceApp: row.sourceApp,
        sourceAppType: row.sourceAppType
      };
    });

    onImportCollectedTransactions(txsToSave, sourceAppCounts, consumedWebhookIds, importedTempIds);
    setImportFeedback(
      `Collected ${txsToSave.length} transaction${txsToSave.length === 1 ? '' : 's'} into your ledger & saved in local storage.`
    );
    setExtractedRows([]);
    setRawAlertText('');
    setSelectedIds(new Set());
    setConsumedWebhookIds([]);
  };

  const handleAddAppSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) return;

    const keywords = newAppKeywords
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    if (!keywords.includes(newAppName.trim().toLowerCase())) {
      keywords.unshift(newAppName.trim().toLowerCase());
    }

    onAddCustomApp({
      name: newAppName.trim(),
      category: newAppCategory,
      defaultLedgerCategory: newAppLedgerCategory,
      defaultPaymentMethod: newAppPaymentMethod,
      keywords,
      permissionEnabled: newAppPermEnabled,
      permissions: {
        readPaymentAlerts: true,
        extractOrderReceipts: true,
        autoSyncWebhook: true
      },
      isCustom: true
    });

    setAddSuccessMsg(
      `${newAppName.trim()} added${newAppPermEnabled ? ' with collection permission enabled' : ''}.`
    );
    setNewAppName('');
    setNewAppKeywords('');
    setTimeout(() => setAddSuccessMsg(null), 4000);
  };

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/app-payments/webhook`
      : '/api/app-payments/webhook';

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-collector-modal-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ duration: 0.16 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <LucideIcon name="Smartphone" size={20} />
              </div>
              <div className="min-w-0">
                <h2
                  id="app-collector-modal-title"
                  className="text-base font-bold text-slate-900 dark:text-white truncate"
                >
                  Connected Apps & Payment Collection
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {permittedAppCount} apps permitted
                  <span aria-hidden="true" className="mx-1.5">·</span>
                  UPI, Food, Shopping & Payment Apps
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <LucideIcon name="X" size={18} />
            </button>
          </div>

          {/* Primary Navigation Tabs */}
          <div className="px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center gap-2 overflow-x-auto">
            <button
              id="modal-tab-collect"
              type="button"
              onClick={() => setActiveTab('collect')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === 'collect'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <LucideIcon name="RefreshCw" size={13} />
              <span>Collect Payments</span>
              {pendingWebhooks.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded bg-indigo-600 text-white text-[10px] font-mono tabular-nums">
                  {pendingWebhooks.length}
                </span>
              )}
            </button>

            <button
              id="modal-tab-permissions"
              type="button"
              onClick={() => setActiveTab('permissions')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === 'permissions'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <LucideIcon name="ShieldCheck" size={13} />
              <span>App Permissions ({permittedAppCount}/{connectedApps.length})</span>
            </button>

            <button
              id="modal-tab-add"
              type="button"
              onClick={() => setActiveTab('add')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === 'add'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <LucideIcon name="Plus" size={13} />
              <span>Add App & Webhook</span>
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* TAB 1: COLLECT PAYMENTS */}
            {activeTab === 'collect' && (
              <div className="space-y-5">
                {importFeedback && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-medium">
                      <LucideIcon name="CheckCircle" size={16} className="text-emerald-600 shrink-0" />
                      <span>{importFeedback}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImportFeedback(null)}
                      className="text-emerald-600 hover:text-emerald-800"
                    >
                      <LucideIcon name="X" size={14} />
                    </button>
                  </div>
                )}

                {/* Incoming Webhook Queue Bar */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
                      <LucideIcon name="BellRing" size={14} className="text-indigo-600 dark:text-indigo-400" />
                      <span>Incoming App Webhook Alerts</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {pendingWebhooks.length > 0
                        ? `${pendingWebhooks.length} queued payment alert${pendingWebhooks.length === 1 ? '' : 's'} received from connected device shortcuts`
                        : 'No queued alerts right now. Forward mobile payment alerts or paste notifications below.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onRefreshWebhooks()}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition whitespace-nowrap"
                    >
                      Check Queue
                    </button>
                    {pendingWebhooks.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSyncWebhookQueue}
                        disabled={isScanning}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition whitespace-nowrap disabled:opacity-50"
                      >
                        Scan Queued ({pendingWebhooks.length})
                      </button>
                    )}
                  </div>
                </div>

                {/* Paste / Upload Payment Alerts Area */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label
                      htmlFor="app-alerts-textarea"
                      className="text-xs font-semibold text-slate-700 dark:text-slate-200"
                    >
                      Paste UPI Alerts, Food Orders, or Shopping Receipts (one or multiple lines)
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        id="btn-toggle-modal-receipt-scanner"
                        type="button"
                        onClick={() => setShowReceiptScanner((prev) => !prev)}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                          showReceiptScanner
                            ? 'bg-indigo-600 text-white'
                            : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/70 dark:border-indigo-800/50'
                        }`}
                      >
                        <LucideIcon name="Camera" size={12} />
                        <span>Scan Receipt / Camera</span>
                      </button>

                      <label className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition flex items-center gap-1.5 whitespace-nowrap">
                        <LucideIcon name="Upload" size={12} />
                        <span>Upload Text File</span>
                        <input
                          type="file"
                          accept=".txt,.csv,.json,.eml,.log"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setRawAlertText(
                            `Paid ${activeCurrency.symbol}18.50 to Swiggy via Google Pay UPI today\nAmazon order #402-8812: ${activeCurrency.symbol}64.99 charged on Credit Card\nPhonePe UPI transfer of ${activeCurrency.symbol}42.00 to Zomato\nUber Trip ${activeCurrency.symbol}14.20 paid via Apple Pay`
                          )
                        }
                        className="px-2.5 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition whitespace-nowrap"
                      >
                        Insert Example Format
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Receipt Image & Camera Scanner */}
                  <AnimatePresence>
                    {showReceiptScanner && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-indigo-200/70 dark:border-indigo-900/40 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                              <LucideIcon name="ScanLine" size={14} className="text-indigo-500" />
                              Receipt Image & Camera Scanner
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowReceiptScanner(false)}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              aria-label="Close receipt scanner"
                            >
                              <LucideIcon name="X" size={14} />
                            </button>
                          </div>
                          <ReceiptScanner
                            connectedApps={connectedApps}
                            requireExplicitAppPermission={globalPermissions.requireExplicitAppPermission}
                            disabledReason={
                              !globalPermissions.receiptParsingEnabled
                                ? 'Order & Receipt Parsing permission is disabled. Enable it in the App Permissions tab.'
                                : null
                            }
                            onExtracted={handleReceiptImageExtracted}
                            compact
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <textarea
                    id="app-alerts-textarea"
                    value={rawAlertText}
                    onChange={(e) => setRawAlertText(e.target.value)}
                    placeholder={`Paste payment SMS, app notifications, or order confirmations here...\nExample:\nPaid ${activeCurrency.symbol}24.50 to Swiggy via PhonePe UPI\nAmazon order total ${activeCurrency.symbol}79.00 via Credit Card`}
                    className="w-full min-h-[120px] p-3.5 text-sm bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 leading-relaxed font-mono text-xs"
                  />

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {globalPermissions.requireExplicitAppPermission
                        ? 'Strict permission check active: only apps with Permission Enabled will be imported.'
                        : 'Auto-collect mode: unrecognized apps can also be imported.'}
                    </p>
                    <button
                      id="btn-scan-app-alerts"
                      type="button"
                      disabled={isScanning || !rawAlertText.trim()}
                      onClick={() => handleScanAlerts(rawAlertText)}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-2 disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      {isScanning ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Extracting...</span>
                        </>
                      ) : (
                        <>
                          <LucideIcon name="Sparkles" size={14} />
                          <span>Scan & Check Permissions</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {scanError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                    <LucideIcon name="AlertTriangle" size={16} className="shrink-0 mt-0.5" />
                    <span>{scanError}</span>
                  </div>
                )}

                {/* Extracted Results & Permission Gate Table */}
                {evaluatedRows.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Detected App Transactions ({evaluatedRows.length})
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {permittedExtractedRows.length} ready to import
                      </span>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                      {evaluatedRows.map((row) => {
                        const isGranted = row.permissionStatus === 'granted';
                        const isSelected = selectedIds.has(row.tempId);

                        return (
                          <div
                            key={row.tempId}
                            className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isGranted
                                ? 'bg-white dark:bg-slate-900'
                                : 'bg-amber-50/50 dark:bg-amber-950/15'
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <input
                                type="checkbox"
                                checked={isGranted && isSelected}
                                disabled={!isGranted}
                                onChange={() => handleToggleRowSelect(row.tempId)}
                                className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                                aria-label={`Select transaction ${row.description}`}
                              />
                              <div className="min-w-0 space-y-1 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                                    {row.description}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                                  <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {row.sourceApp}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span className="uppercase text-[11px]">{row.sourceAppType}</span>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-mono tabular-nums">{row.date}</span>
                                  <span aria-hidden="true">·</span>
                                  <span>{row.paymentMethod}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                              {/* Editable Ledger Category */}
                              <select
                                value={row.category}
                                onChange={(e) => handleRowCategoryChange(row.tempId, e.target.value)}
                                className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300"
                              >
                                {LEDGER_CATEGORIES.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>

                              {/* Amount */}
                              <span
                                className={`text-sm font-bold font-mono tabular-nums ${
                                  row.type === 'income'
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {row.type === 'income' ? '+' : '-'}
                                {formatAmount(row.amount / activeCurrency.rate, activeCurrency)}
                              </span>

                              {/* Permission Gate Status / Action */}
                              {isGranted ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                                  <LucideIcon name="ShieldCheck" size={14} />
                                  <span>Permitted</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleUnlockBlockedRow(row)}
                                  className="px-2.5 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/70 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap"
                                >
                                  <LucideIcon name="Lock" size={12} />
                                  <span>
                                    {row.sourceAppId ? 'Enable Permission' : 'Add & Enable'}
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        id="btn-import-permitted-txs"
                        type="button"
                        disabled={permittedExtractedRows.length === 0}
                        onClick={handleImportPermitted}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-2 disabled:opacity-40 whitespace-nowrap"
                      >
                        <LucideIcon name="CheckCircle" size={14} />
                        <span>
                          Import {permittedExtractedRows.length} Permitted Transaction
                          {permittedExtractedRows.length === 1 ? '' : 's'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Locally Persisted Collected App Archive */}
                {collectedRecords.length > 0 && (
                  <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <LucideIcon name="Database" size={14} className="text-indigo-500" />
                        <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          Stored Collected App Data ({collectedRecords.length})
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={onClearCollectedRecords}
                        className="text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:underline"
                      >
                        Clear Stored History
                      </button>
                    </div>
                    <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                      {collectedRecords.slice(0, 12).map((rec) => (
                        <div
                          key={rec.tempId}
                          className="px-3 py-2 bg-slate-50/70 dark:bg-slate-950/50 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              {rec.description}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {rec.sourceApp} · {rec.category} · {rec.date}
                            </p>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-100">
                              {rec.type === 'income' ? '+' : '-'}
                              {formatAmount(rec.amount / activeCurrency.rate, activeCurrency)}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                rec.importedToLedger
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {rec.importedToLedger ? 'Saved' : 'Scanned'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: APP PERMISSIONS */}
            {activeTab === 'permissions' && (
              <div className="space-y-6">
                {/* Global Collection Channels */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Data Collection Permissions
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(
                      [
                        {
                          key: 'notificationAccessEnabled',
                          title: 'Payment Alert & SMS Access',
                          desc: 'Allow parsing pasted or forwarded UPI and bank payment alerts.'
                        },
                        {
                          key: 'receiptParsingEnabled',
                          title: 'Order & Receipt Parsing',
                          desc: 'Allow extracting line items from uploaded food & shopping receipts.'
                        },
                        {
                          key: 'webhookSyncEnabled',
                          title: 'Live App Webhook Sync',
                          desc: 'Allow device shortcuts (Tasker / iOS Shortcuts) to send payment alerts.'
                        },
                        {
                          key: 'requireExplicitAppPermission',
                          title: 'Strict Per-App Permission Gate',
                          desc: 'Block transactions from apps until you explicitly enable permission.'
                        }
                      ] as const
                    ).map((item) => {
                      const active = globalPermissions[item.key];
                      return (
                        <div
                          key={item.key}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 flex items-start justify-between gap-3"
                        >
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                              {item.desc}
                            </p>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={active}
                            aria-label={item.title}
                            onClick={() => onUpdateGlobalPermission(item.key)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 mt-0.5 ${
                              active
                                ? 'bg-indigo-600 dark:bg-indigo-500'
                                : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${
                                active ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Per-App Permissions Directory */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Per-App Permissions
                    </h3>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onBulkSetCategoryPermission(permCategoryFilter, true)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 rounded-lg transition whitespace-nowrap"
                      >
                        Enable All
                      </button>
                      <button
                        type="button"
                        onClick={() => onBulkSetCategoryPermission(permCategoryFilter, false)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition whitespace-nowrap"
                      >
                        Disable All
                      </button>
                    </div>
                  </div>

                  {/* Filter + Search Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto">
                      {(
                        [
                          { id: 'all', label: 'All Apps' },
                          { id: 'upi', label: 'UPI Apps' },
                          { id: 'food', label: 'Food Apps' },
                          { id: 'shopping', label: 'Shopping' },
                          { id: 'other', label: 'Other' }
                        ] as const
                      ).map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setPermCategoryFilter(cat.id)}
                          className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap shrink-0 ${
                            permCategoryFilter === cat.id
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative flex-1">
                      <span className="absolute left-3 top-2.5 text-slate-400">
                        <LucideIcon name="Search" size={13} />
                      </span>
                      <input
                        type="text"
                        value={permSearch}
                        onChange={(e) => setPermSearch(e.target.value)}
                        placeholder="Filter apps or keywords..."
                        className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* App Rows */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                    {filteredPermissionApps.map((app) => {
                      const catMeta = APP_CATEGORY_META[app.category];
                      return (
                        <div
                          key={app.id}
                          className="p-3.5 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                app.permissionEnabled
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              <LucideIcon name={catMeta.icon} size={16} />
                            </div>
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {app.name}
                                </span>
                                {app.isCustom && (
                                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                                    Custom
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                                <span>{catMeta.label}</span>
                                <span aria-hidden="true">·</span>
                                <span>{app.defaultPaymentMethod}</span>
                                <span aria-hidden="true">·</span>
                                <span className="tabular-nums">{app.collectedCount || 0} synced</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                            {/* Granular scope checkboxes */}
                            <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300">
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={app.permissions.readPaymentAlerts}
                                  onChange={() =>
                                    onUpdateAppGranularPermission(app.id, 'readPaymentAlerts')
                                  }
                                  className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 dark:border-slate-700"
                                />
                                <span>Alerts</span>
                              </label>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={app.permissions.extractOrderReceipts}
                                  onChange={() =>
                                    onUpdateAppGranularPermission(app.id, 'extractOrderReceipts')
                                  }
                                  className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 dark:border-slate-700"
                                />
                                <span>Receipts</span>
                              </label>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={app.permissions.autoSyncWebhook}
                                  onChange={() =>
                                    onUpdateAppGranularPermission(app.id, 'autoSyncWebhook')
                                  }
                                  className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 dark:border-slate-700"
                                />
                                <span>Webhook</span>
                              </label>
                            </div>

                            {/* Master Enable/Disable Switch */}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                role="switch"
                                aria-checked={app.permissionEnabled}
                                aria-label={`Enable permission for ${app.name}`}
                                onClick={() => onToggleAppPermission(app.id)}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                                  app.permissionEnabled
                                    ? 'bg-emerald-600 dark:bg-emerald-500'
                                    : 'bg-slate-200 dark:bg-slate-700'
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ${
                                    app.permissionEnabled ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>

                              {app.isCustom && (
                                <button
                                  type="button"
                                  onClick={() => onRemoveCustomApp(app.id)}
                                  title="Remove custom app"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                                >
                                  <LucideIcon name="Trash2" size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ADD APP & WEBHOOK */}
            {activeTab === 'add' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Add New App Form */}
                <form
                  onSubmit={handleAddAppSubmit}
                  className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 bg-white dark:bg-slate-900"
                >
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Add Payment or Shopping App
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Register any UPI, food delivery, shopping, or utility app to collect its payment data.
                    </p>
                  </div>

                  {addSuccessMsg && (
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                      <LucideIcon name="CheckCircle" size={14} />
                      <span>{addSuccessMsg}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      App Name
                    </label>
                    <input
                      id="input-new-app-name"
                      type="text"
                      required
                      value={newAppName}
                      onChange={(e) => setNewAppName(e.target.value)}
                      placeholder="e.g. Zepto, CRED, Instacart, Uber"
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        App Type
                      </label>
                      <select
                        value={newAppCategory}
                        onChange={(e) => setNewAppCategory(e.target.value as AppCategory)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200"
                      >
                        <option value="upi">UPI & Wallet App</option>
                        <option value="food">Food & Delivery App</option>
                        <option value="shopping">Shopping App</option>
                        <option value="other">Other Payment App</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Default Payment Method
                      </label>
                      <select
                        value={newAppPaymentMethod}
                        onChange={(e) => setNewAppPaymentMethod(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200"
                      >
                        {PAYMENT_METHODS.map((pm) => (
                          <option key={pm} value={pm}>
                            {pm}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Default Expense Category
                    </label>
                    <select
                      value={newAppLedgerCategory}
                      onChange={(e) => setNewAppLedgerCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200"
                    >
                      {LEDGER_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Detection Keywords (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={newAppKeywords}
                      onChange={(e) => setNewAppKeywords(e.target.value)}
                      placeholder="e.g. zepto, zeptonow, @zepto"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newAppPermEnabled}
                      onChange={(e) => setNewAppPermEnabled(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700"
                    />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                      Enable permission to collect payments immediately
                    </span>
                  </label>

                  <button
                    id="btn-submit-new-app"
                    type="submit"
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <LucideIcon name="Plus" size={14} />
                    <span>Add App & Save Permission</span>
                  </button>
                </form>

                {/* Live Automation & Webhook Integration Guide */}
                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <LucideIcon name="Link2" size={15} className="text-indigo-600 dark:text-indigo-400" />
                      <span>Automatic Device Payment Forwarding</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Connect Android notification forwarders (Tasker / MacroDroid) or iOS Shortcuts to automatically push UPI, food, and shopping payment alerts directly into Decuples.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Webhook Endpoint (POST)
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 text-[11px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 truncate">
                        {webhookUrl}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyWebhook}
                        className="px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition flex items-center gap-1 whitespace-nowrap"
                      >
                        <LucideIcon name={copiedWebhook ? 'Check' : 'Copy'} size={13} />
                        <span>{copiedWebhook ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      JSON Payload Format
                    </span>
                    <pre className="p-3 text-[11px] font-mono bg-slate-900 text-slate-100 rounded-xl overflow-x-auto leading-relaxed">
{`{
  "appName": "PhonePe",
  "message": "Paid 420 to Swiggy via UPI",
  "amount": 420
}`}
                    </pre>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      Permission Enforcement
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Queued alerts are held in the Collect Payments tab and checked against your per-app permissions before anything enters your ledger.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
