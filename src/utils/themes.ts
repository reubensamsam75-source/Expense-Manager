/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppThemeId } from '../types';

export interface ThemeOption {
  id: AppThemeId;
  name: string;
  shortName: string;
  isDark: boolean;
  surfaceHex: string;
  accentHex: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'light',
    name: 'Classic Light',
    shortName: 'Light',
    isDark: false,
    surfaceHex: '#f8fafc',
    accentHex: '#4f46e5'
  },
  {
    id: 'warm',
    name: 'Warm Sand',
    shortName: 'Sand',
    isDark: false,
    surfaceHex: '#faf6ef',
    accentHex: '#d97706'
  },
  {
    id: 'dark',
    name: 'Slate Dark',
    shortName: 'Dark',
    isDark: true,
    surfaceHex: '#020617',
    accentHex: '#6366f1'
  },
  {
    id: 'ocean',
    name: 'Midnight Ocean',
    shortName: 'Ocean',
    isDark: true,
    surfaceHex: '#041222',
    accentHex: '#0284c7'
  },
  {
    id: 'forest',
    name: 'Emerald Forest',
    shortName: 'Forest',
    isDark: true,
    surfaceHex: '#041610',
    accentHex: '#059669'
  },
  {
    id: 'violet',
    name: 'Royal Amethyst',
    shortName: 'Amethyst',
    isDark: true,
    surfaceHex: '#100720',
    accentHex: '#9333ea'
  }
];

const VALID_THEME_IDS = new Set<AppThemeId>(THEME_OPTIONS.map((t) => t.id));

export function normalizeThemeId(raw: string | null | undefined): AppThemeId | null {
  if (!raw) return null;
  if (VALID_THEME_IDS.has(raw as AppThemeId)) {
    return raw as AppThemeId;
  }
  return null;
}

export function getThemeOption(id: AppThemeId): ThemeOption {
  return THEME_OPTIONS.find((t) => t.id === id) || THEME_OPTIONS[0];
}

export function isDarkTheme(id: AppThemeId): boolean {
  return getThemeOption(id).isDark;
}
