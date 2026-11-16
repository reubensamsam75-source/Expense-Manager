/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { AppThemeId } from '../types';
import { THEME_OPTIONS, getThemeOption, ThemeOption } from '../utils/themes';
import { LucideIcon } from './LucideIcon';
import { motion, AnimatePresence } from 'motion/react';

interface ThemeSwitcherProps {
  activeTheme: AppThemeId;
  onSelectTheme: (theme: AppThemeId) => void;
}

const THEME_TAGLINES: Record<AppThemeId, string> = {
  light: 'Crisp studio slate',
  warm: 'Soft parchment amber',
  dark: 'Deep slate night',
  ocean: 'Abyssal cyan blue',
  forest: 'Pine emerald night',
  violet: 'Obsidian amethyst'
};

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  activeTheme,
  onSelectTheme
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentTheme = getThemeOption(activeTheme);
  const lightThemes = THEME_OPTIONS.filter((t) => !t.isDark);
  const darkThemes = THEME_OPTIONS.filter((t) => t.isDark);

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

  const handleSelect = (id: AppThemeId) => {
    onSelectTheme(id);
    setIsOpen(false);
  };

  const renderThemeCard = (theme: ThemeOption) => {
    const isActive = theme.id === activeTheme;
    const cardSurface = theme.isDark ? 'rgba(255,255,255,0.07)' : '#ffffff';
    const lineMuted = theme.isDark ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.12)';
    const borderColor = theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.1)';

    return (
      <button
        key={theme.id}
        id={`theme-card-${theme.id}`}
        type="button"
        role="option"
        aria-selected={isActive}
        onClick={() => handleSelect(theme.id)}
        className={`group text-left rounded-xl p-2.5 border transition-all flex flex-col gap-2 cursor-pointer ${
          isActive
            ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/50 ring-2 ring-indigo-500/25'
            : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/60 dark:bg-slate-950/60 hover:bg-white dark:hover:bg-slate-900'
        }`}
      >
        {/* Mini UI Surface Preview */}
        <div
          className="w-full h-12 rounded-lg p-1.5 flex flex-col justify-between overflow-hidden relative"
          style={{
            backgroundColor: theme.surfaceHex,
            border: `1px solid ${borderColor}`
          }}
        >
          {/* Mini top bar */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: theme.accentHex }}
              />
              <span
                className="h-1.5 w-7 rounded-full"
                style={{ backgroundColor: lineMuted }}
              />
            </div>
            <span
              className="w-3 h-1.5 rounded-full"
              style={{ backgroundColor: theme.accentHex }}
            />
          </div>

          {/* Mini content card */}
          <div
            className="w-full h-5 rounded px-1.5 flex items-center justify-between"
            style={{
              backgroundColor: cardSurface,
              border: `1px solid ${borderColor}`
            }}
          >
            <span
              className="h-1.5 w-8 rounded-full"
              style={{ backgroundColor: lineMuted }}
            />
            <span
              className="h-2 w-4 rounded-sm"
              style={{ backgroundColor: theme.accentHex }}
            />
          </div>
        </div>

        {/* Label Row */}
        <div className="flex items-center justify-between gap-1.5 px-0.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10 dark:border-white/20"
                style={{ backgroundColor: theme.accentHex }}
              />
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                {theme.name}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate pl-4">
              {THEME_TAGLINES[theme.id]}
            </p>
          </div>

          {isActive && (
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <LucideIcon name="Check" size={11} />
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        id="header-theme-selector"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Change appearance theme (current: ${currentTheme.name})`}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
          isOpen
            ? 'bg-white dark:bg-slate-800 border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-500/20 text-slate-900 dark:text-white shadow-xs'
            : 'bg-slate-100/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-100'
        }`}
      >
        {/* Dual-tone live swatch badge */}
        <span
          className="w-4 h-4 rounded-md border border-black/15 dark:border-white/20 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs"
          style={{ backgroundColor: currentTheme.surfaceHex }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: currentTheme.accentHex }}
          />
        </span>

        <span className="hidden sm:inline whitespace-nowrap">{currentTheme.shortName}</span>

        <LucideIcon
          name="ChevronDown"
          size={13}
          className={`text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="theme-switcher-popover"
            role="listbox"
            aria-label="Workspace color themes"
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 mt-2 w-[310px] sm:w-[340px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-50 space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <LucideIcon name="Palette" size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Appearance Theme
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Active: {currentTheme.name}
                  </p>
                </div>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                  currentTheme.isDark
                    ? 'bg-slate-800 text-indigo-300'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                <LucideIcon name={currentTheme.isDark ? 'Moon' : 'Sun'} size={10} />
                {currentTheme.isDark ? 'Dark' : 'Light'}
              </span>
            </div>

            {/* Light Themes Group */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <LucideIcon name="Sun" size={11} className="text-amber-500" />
                <span>Light Themes</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {lightThemes.map(renderThemeCard)}
              </div>
            </div>

            {/* Dark Themes Group */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <LucideIcon name="Moon" size={11} className="text-indigo-400" />
                <span>Dark Themes</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {darkThemes.map(renderThemeCard)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
