/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { AppCategory, ConnectedApp, GlobalCollectionPermissions } from '../types';
import { LucideIcon } from './LucideIcon';
import { APP_CATEGORY_META } from '../utils/connectedApps';

interface ConnectedAppsCardProps {
  connectedApps: ConnectedApp[];
  globalPermissions: GlobalCollectionPermissions;
  pendingWebhookCount: number;
  onToggleAppPermission: (appId: string) => void;
  onOpenCollector: (initialTab: 'collect' | 'permissions' | 'add') => void;
}

export const ConnectedAppsCard: React.FC<ConnectedAppsCardProps> = ({
  connectedApps,
  globalPermissions,
  pendingWebhookCount,
  onToggleAppPermission,
  onOpenCollector
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | AppCategory>('all');

  const enabledCount = useMemo(
    () => connectedApps.filter((a) => a.permissionEnabled).length,
    [connectedApps]
  );

  const totalCollected = useMemo(
    () => connectedApps.reduce((sum, a) => sum + (a.collectedCount || 0), 0),
    [connectedApps]
  );

  const visibleApps = useMemo(() => {
    const filtered =
      selectedCategory === 'all'
        ? connectedApps
        : connectedApps.filter((a) => a.category === selectedCategory);
    return filtered.slice(0, 6);
  }, [connectedApps, selectedCategory]);

  return (
    <section
      id="connected-apps-card"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5"
    >
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <LucideIcon name="Link2" size={18} className="text-indigo-600 dark:text-indigo-400" />
            <span>App Payment Collection</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            <span>{enabledCount} of {connectedApps.length} apps permitted</span>
            <span aria-hidden="true" className="mx-1.5">·</span>
            <span>{totalCollected} collected</span>
            {pendingWebhookCount > 0 && (
              <>
                <span aria-hidden="true" className="mx-1.5">·</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                  {pendingWebhookCount} pending alert{pendingWebhookCount === 1 ? '' : 's'}
                </span>
              </>
            )}
          </p>
        </div>

        <button
          id="btn-open-add-app"
          type="button"
          onClick={() => onOpenCollector('add')}
          className="px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start"
        >
          <LucideIcon name="Plus" size={13} />
          <span>Add App</span>
        </button>
      </div>

      {/* Category Filter Segmented Control */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto">
        {(
          [
            { id: 'all', label: 'All' },
            { id: 'upi', label: 'UPI' },
            { id: 'food', label: 'Food' },
            { id: 'shopping', label: 'Shopping' },
            { id: 'other', label: 'Other' }
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedCategory(tab.id)}
            className={`flex-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              selectedCategory === tab.id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Compact App Permission List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
        {visibleApps.map((app) => {
          const catMeta = APP_CATEGORY_META[app.category];
          return (
            <div
              key={app.id}
              className="py-2.5 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    app.permissionEnabled
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <LucideIcon name={catMeta.icon} size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {app.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    <span>{catMeta.label.split(' ')[0]}</span>
                    <span aria-hidden="true" className="mx-1.5">·</span>
                    <span>{app.permissionEnabled ? 'Permission enabled' : 'Permission off'}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={app.permissionEnabled}
                aria-label={`Toggle payment collection permission for ${app.name}`}
                onClick={() => onToggleAppPermission(app.id)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
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
            </div>
          );
        })}
      </div>

      {/* Global Permission Status Notice if alerts & receipts are off */}
      {!globalPermissions.notificationAccessEnabled && !globalPermissions.receiptParsingEnabled && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <LucideIcon name="ShieldAlert" size={15} className="shrink-0" />
          <span>Global collection permissions are currently paused. Enable them in Permissions.</span>
        </div>
      )}

      {/* Primary Action Footer */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <button
          id="btn-manage-app-permissions"
          type="button"
          onClick={() => onOpenCollector('permissions')}
          className="px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
        >
          <LucideIcon name="SlidersHorizontal" size={14} />
          <span>Permissions ({enabledCount})</span>
        </button>

        <button
          id="btn-collect-app-payments"
          type="button"
          onClick={() => onOpenCollector('collect')}
          className="px-3 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
        >
          <LucideIcon name="RefreshCw" size={14} />
          <span>Collect Payments</span>
        </button>
      </div>
    </section>
  );
};
