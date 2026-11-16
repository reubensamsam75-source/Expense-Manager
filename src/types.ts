/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AppCategory = 'upi' | 'food' | 'shopping' | 'other';

export interface ConnectedApp {
  id: string;
  name: string;
  category: AppCategory;
  defaultLedgerCategory: string;
  defaultPaymentMethod: string;
  keywords: string[];
  permissionEnabled: boolean;
  permissions: {
    readPaymentAlerts: boolean;
    extractOrderReceipts: boolean;
    autoSyncWebhook: boolean;
  };
  isCustom?: boolean;
  lastSyncedAt?: string;
  collectedCount?: number;
}

export interface GlobalCollectionPermissions {
  notificationAccessEnabled: boolean;
  receiptParsingEnabled: boolean;
  webhookSyncEnabled: boolean;
  requireExplicitAppPermission: boolean;
}

export interface CollectedAppTransaction {
  tempId: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  description: string;
  date: string; // YYYY-MM-DD
  paymentMethod: string;
  sourceApp: string;
  sourceAppId?: string;
  sourceAppType: AppCategory;
  permissionStatus: 'granted' | 'blocked';
  rawSnippet?: string;
}

export interface PendingWebhookAlert {
  id: string;
  appName: string;
  message: string;
  amount?: number;
  date?: string;
  receivedAt: string;
}

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  description: string;
  type: 'income' | 'expense';
  paymentMethod: string;
  isRecurring?: boolean;
  originalTransactionId?: string;
  sourceApp?: string;
  sourceAppType?: AppCategory;
}

export interface Budget {
  category: string;
  limit: number;
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string; // YYYY-MM-DD
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO String
}

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  rate: number; // conversion multiplier from USD
}

export interface ParsedTransaction {
  amount: number;
  category: string;
  type: 'income' | 'expense';
  description: string;
  date: string; // YYYY-MM-DD
  paymentMethod: string;
  isRecurring?: boolean;
}

export interface FinancialInsights {
  summary: string;
  tips: string[];
  warnings: { category: string; message: string; severity: 'low' | 'medium' | 'high' }[];
  savingsOpportunities: string[];
}
