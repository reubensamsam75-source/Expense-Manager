/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LucideIcon } from './LucideIcon';

export type SidebarMenuId =
  | 'overview'
  | 'transactions'
  | 'calendar'
  | 'apps'
  | 'budgets'
  | 'goals'
  | 'insights'
  | 'data';

interface SidebarMenuItem {
  id: SidebarMenuId;
  label: string;
  icon: string;
  badge?: string | number;
}

interface SidebarSection {
  title: string;
  items: SidebarMenuItem[];
}

interface LeftSidebarProps {
  activeMenu: SidebarMenuId;
  onSelectMenu: (menu: SidebarMenuId) => void;
  activeTheme: 'light' | 'dark';
  onSetTheme: (theme: 'light' | 'dark') => void;
  permittedAppsCount: number;
  pendingWebhooksCount: number;
  recurringCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeMenu,
  onSelectMenu,
  activeTheme,
  onSetTheme,
  permittedAppsCount,
  pendingWebhooksCount,
  recurringCount,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile
}) => {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const sections: SidebarSection[] = [
    {
      title: 'Workspace',
      items: [
        { id: 'overview', label: 'Overview', icon: 'LayoutDashboard' },
        { id: 'transactions', label: 'Transactions', icon: 'Coins' },
        {
          id: 'calendar',
          label: 'Calendar',
          icon: 'Calendar',
          badge: recurringCount > 0 ? recurringCount : undefined
        },
        {
          id: 'apps',
          label: 'App Sync & Permissions',
          icon: 'Smartphone',
          badge: pendingWebhooksCount > 0 ? pendingWebhooksCount : permittedAppsCount
        }
      ]
    },
    {
      title: 'Planning & Wealth',
      items: [
        { id: 'budgets', label: 'Budgets', icon: 'PieChart' },
        { id: 'goals', label: 'Savings Goals', icon: 'Lightbulb' },
        { id: 'insights', label: 'AI & Markets', icon: 'TrendingUp' }
      ]
    },
    {
      title: 'Data & Tools',
      items: [{ id: 'data', label: 'Import & Backup', icon: 'Database' }]
    }
  ];

  const handleNavClick = (id: SidebarMenuId) => {
    onSelectMenu(id);
    onCloseMobile();
  };

  const renderSidebarContent = (collapsed: boolean, isMobileDrawer: boolean) => (
    <div
      className={`h-full flex flex-col justify-between bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 select-none transition-[width] duration-200 ease-out ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Top Brand + Menus */}
      <div className={`flex-1 overflow-y-auto py-5 space-y-5 ${collapsed ? 'px-2.5' : 'px-4'}`}>
        {/* Brand + Collapse/Expand Toggle */}
        <div
          className={`flex items-center ${
            collapsed ? 'flex-col gap-3 justify-center' : 'justify-between px-1.5'
          }`}
        >
          <div className={`flex items-center gap-2.5 min-w-0 ${collapsed ? 'justify-center' : ''}`}>
            <div
              title="Decuples Wealth Manager"
              className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0"
            >
              <LucideIcon name="TrendingUp" size={18} />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white block whitespace-nowrap">
                  Decuples
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block whitespace-nowrap">
                  Wealth Manager
                </span>
              </div>
            )}
          </div>

          {!isMobileDrawer ? (
            <button
              id="btn-sidebar-collapse"
              type="button"
              onClick={onToggleCollapse}
              title={collapsed ? 'Expand menu' : 'Collapse menu'}
              aria-label={collapsed ? 'Expand navigation menu' : 'Collapse navigation menu'}
              aria-expanded={!collapsed}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              <LucideIcon name={collapsed ? 'PanelLeftOpen' : 'PanelLeftClose'} size={17} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation menu"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <LucideIcon name="X" size={18} />
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <nav aria-label="Primary Sidebar Navigation" className={collapsed ? 'space-y-2' : 'space-y-5'}>
          {sections.map((section) => {
            const isSectionCollapsed = !collapsed && Boolean(collapsedSections[section.title]);

            return (
              <div key={section.title} className="space-y-1">
                {!collapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.title)}
                    aria-expanded={!isSectionCollapsed}
                    className="w-full px-2.5 py-1 flex items-center justify-between text-[11px] font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 tracking-wide transition-colors"
                  >
                    <span>{section.title}</span>
                    <LucideIcon
                      name={isSectionCollapsed ? 'ChevronRight' : 'ChevronDown'}
                      size={12}
                    />
                  </button>
                ) : (
                  <div className="mx-2 my-2 border-t border-slate-100 dark:border-slate-800/80" />
                )}

                {!isSectionCollapsed && (
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = activeMenu === item.id;
                      return (
                        <button
                          key={item.id}
                          id={`sidebar-menu-${item.id}`}
                          type="button"
                          title={collapsed ? item.label : undefined}
                          aria-label={item.label}
                          onClick={() => handleNavClick(item.id)}
                          className={`relative w-full rounded-xl text-xs font-semibold flex items-center transition-colors ${
                            collapsed
                              ? 'justify-center p-2.5'
                              : 'justify-between gap-2 px-3 py-2.5'
                          } ${
                            isActive
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                          }`}
                        >
                          <span className={`flex items-center min-w-0 ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
                            <LucideIcon
                              name={item.icon}
                              size={17}
                              className={
                                isActive
                                  ? 'text-indigo-600 dark:text-indigo-400 shrink-0'
                                  : 'text-slate-400 dark:text-slate-500 shrink-0'
                              }
                            />
                            {!collapsed && (
                              <span className="truncate whitespace-nowrap">{item.label}</span>
                            )}
                          </span>

                          {!collapsed && item.badge !== undefined && (
                            <span
                              className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded-md ${
                                isActive
                                  ? 'bg-indigo-100 dark:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}

                          {collapsed && item.badge !== undefined && (
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom Appearance / Dark Mode Controls */}
      <div
        className={`border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 ${
          collapsed ? 'p-2.5 flex justify-center' : 'p-4 space-y-3'
        }`}
      >
        {collapsed ? (
          <button
            id="sidebar-theme-collapsed-toggle"
            type="button"
            onClick={() => onSetTheme(activeTheme === 'light' ? 'dark' : 'light')}
            title={`Switch to ${activeTheme === 'light' ? 'Dark' : 'Light'} mode`}
            aria-label={`Switch to ${activeTheme === 'light' ? 'Dark' : 'Light'} mode`}
            className="w-10 h-10 rounded-xl bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors"
          >
            <LucideIcon name={activeTheme === 'light' ? 'Moon' : 'Sun'} size={16} />
          </button>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Appearance
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                {activeTheme} mode
              </span>
            </div>

            <div
              role="group"
              aria-label="Theme mode selector"
              className="grid grid-cols-2 gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl"
            >
              <button
                id="sidebar-theme-light"
                type="button"
                onClick={() => onSetTheme('light')}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTheme === 'light'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <LucideIcon name="Sun" size={13} />
                <span>Light</span>
              </button>

              <button
                id="sidebar-theme-dark"
                type="button"
                onClick={() => onSetTheme('dark')}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTheme === 'dark'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <LucideIcon name="Moon" size={13} />
                <span>Dark</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Permanent Left Side Panel (Collapsible) */}
      <aside
        className={`hidden lg:block shrink-0 sticky top-0 h-screen z-30 transition-[width] duration-200 ease-out ${
          isCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {renderSidebarContent(isCollapsed, false)}
      </aside>

      {/* Mobile Slide-Over Drawer (Always Expanded) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{renderSidebarContent(false, true)}</div>
        </div>
      )}
    </>
  );
};
