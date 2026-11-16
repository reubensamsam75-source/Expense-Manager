/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppCategory, ConnectedApp, GlobalCollectionPermissions } from '../types';

export const APP_CATEGORY_META: Record<
  AppCategory,
  { label: string; icon: string; description: string }
> = {
  upi: {
    label: 'UPI & Wallet Apps',
    icon: 'Smartphone',
    description: 'Instant peer-to-peer & QR merchant payments'
  },
  food: {
    label: 'Food & Delivery Apps',
    icon: 'Utensils',
    description: 'Restaurant orders, dining & quick grocery delivery'
  },
  shopping: {
    label: 'Shopping & E-Commerce',
    icon: 'ShoppingBag',
    description: 'Online retail orders, marketplaces & returns'
  },
  other: {
    label: 'Other Payment Apps',
    icon: 'Coins',
    description: 'Rides, subscriptions, utilities & payment gateways'
  }
};

export const DEFAULT_GLOBAL_PERMISSIONS: GlobalCollectionPermissions = {
  notificationAccessEnabled: true,
  receiptParsingEnabled: true,
  webhookSyncEnabled: true,
  requireExplicitAppPermission: true
};

export const DEFAULT_CONNECTED_APPS: ConnectedApp[] = [
  // UPI Apps
  {
    id: 'app-gpay',
    name: 'Google Pay (GPay)',
    category: 'upi',
    defaultLedgerCategory: 'Others',
    defaultPaymentMethod: 'UPI',
    keywords: ['google pay', 'gpay', 'tez', 'okicici', 'okaxis', 'oksbi', 'okhdfcbank'],
    permissionEnabled: false,
    permissions: {
      readPaymentAlerts: true,
      extractOrderReceipts: true,
      autoSyncWebhook: true
    }
  },
  {
    id: 'app-phonepe',
    name: 'PhonePe',
    category: 'upi',
    defaultLedgerCategory: 'Others',
    defaultPaymentMethod: 'UPI',
    keywords: ['phonepe', '@ybl', '@ibl', '@axl'],
    permissionEnabled: false,
    permissions: {
      readPaymentAlerts: true,
      extractOrderReceipts: true,
      autoSyncWebhook: true
    }
  },
  {
    id: 'app-paytm',
    name: 'Paytm',
    category: 'upi',
    defaultLedgerCategory: 'Others',
    defaultPaymentMethod: 'UPI',
    keywords: ['paytm', 'paytmqr', '@ptyes', '@ptaxis'],
    permissionEnabled: false,
    permissions: {
      readPaymentAlerts: true,
      extractOrderReceipts: true,
      autoSyncWebhook: true
    }
  },
  {
    id: 'app-bhim',
    name: 'BHIM UPI',
    category: 'upi',
    defaultLedgerCategory: 'Others',
    defaultPaymentMethod: 'UPI',
    keywords: ['bhim', '@upi', 'npci'],
    permissionEnabled: false,
    permissions: {
      readPaymentAlerts: true,
      extractOrderReceipts: false,
      autoSyncWebhook: true
    }
  },

  // Food Apps
  {
    id: 'app-swiggy',
    name: 'Swiggy',
    category: 'food',
    defaultLedgerCategory: 'Food & Dining',
    defaultPaymentMethod: 'UPI',
    keywords: ['swiggy', 'instamart', 'dineout'],
    permissionEnabled: false,
    permissions: {
      readPaymentAlerts: true,
      extractOrderReceipts: true,
      autoSyncWebhook: true
    }
  },
  {
    id: 'app-zomato',
    name: 'Zomato',
    category: 'food',
    defaultLedgerCategory: 'Food & Dining',
    defaultPaymentMethod: 'UPI',
    keywords: ['zomato', 'blinkit', 'hyperpure'],
    permissionEnabled: false,
    permissions: {
      readPaymentAlerts: true,
      extractOrderReceipts: true,
      autoSyncWebhook: true
    }
  },
  {
    id: 'app-ubereats',
    name: 'Uber Eats',
    category: 'food',
    defaultLedgerCategory: 'Food & Dining',
    defaultPaymentMethod: 'Credit Card',
    keywords: ['uber eats', 'ubereats'],
    permissionEnabled: false,
    permissions: {
      readPaymentAlerts: true,
      extractOrderReceipts: true,
      autoSyncWebhook: true
    }
  },
  {
    id: 'app-doordash',
    name: 'DoorDash',
    category: 'food',
    defaultLedgerCategory: 'Food & Dining',
    defaultPaymentMethod: 'Credit Card',
    keywords: ['doordash'],
    permissionEnabled: false,
    permissions: {
      readPaymentAlerts: true,
      extractOrderReceipts: true,
      autoSyncWebhook: true
    }
  },

  // Shopping Apps
  {
    id: 'app-amazon',
    name: 'Amazon',
    category: 'shopping',
    defaultLedgerCategory: 'Shopping',
    defaultPaymentMethod: 'Credit Card',
    keywords: ['amazon', 'amzn', 'amazon pay'],
    permissionEnabled: false,
    permissions: {
      readPaymentAlerts: true,
      extractOrderReceipts: true,
      autoSyncWebhook: true
    }
  },
  {
    id: 'app-flipkart',
    name: 'Flipkart',
    category: 'shopping',
    defaultLedgerCategory: 'Shopping',
    defaultPaymentMethod: 'UPI',
    keywords: ['flipkart', 'ekart', 'fkrt'],
    permissionEnabled: false,
    permissions: {
      readPaymentAlerts: true,
      extractOrderReceipts: true,
      autoSyncWebhook: true
    }
  },
  {
    id: 'app-myntra',
    name: 'Myntra',
    category: 'shopping',
    defaultLedgerCategory: 'Shopping',
    defaultPaymentMethod: 'Credit Card',
    keywords: ['myntra'],
    permissionEnabled: false,
    permissions: {
      readPaymentAlerts: true,
      extractOrderReceipts: true,
      autoSyncWebhook: true
    }
  },
  {
    id: 'app-target',
    name: 'Target',
    category: 'shopping',
    defaultLedgerCategory: 'Shopping',
    defaultPaymentMethod: 'Debit Card',
    keywords: ['target'],
    permissionEnabled: false,
    permissions: {
      readPaymentAlerts: true,
      extractOrderReceipts: true,
      autoSyncWebhook: true
    }
  },

  // Other Payment Apps
  {
    id: 'app-uber',
    name: 'Uber Rides',
    category: 'other',
    defaultLedgerCategory: 'Transportation',
    defaultPaymentMethod: 'Credit Card',
    keywords: ['uber trip', 'uber ride', 'uber india', 'uber bv'],
    permissionEnabled: false,
    permissions: {
      readPaymentAlerts: true,
      extractOrderReceipts: true,
      autoSyncWebhook: true
    }
  },
  {
    id: 'app-paypal',
    name: 'PayPal',
    category: 'other',
    defaultLedgerCategory: 'Others',
    defaultPaymentMethod: 'Bank Transfer',
    keywords: ['paypal'],
    permissionEnabled: false,
    permissions: {
      readPaymentAlerts: true,
      extractOrderReceipts: true,
      autoSyncWebhook: true
    }
  },
  {
    id: 'app-applepay',
    name: 'Apple Pay',
    category: 'other',
    defaultLedgerCategory: 'Others',
    defaultPaymentMethod: 'Credit Card',
    keywords: ['apple pay', 'apple.com/bill', 'itunes'],
    permissionEnabled: false,
    permissions: {
      readPaymentAlerts: true,
      extractOrderReceipts: true,
      autoSyncWebhook: true
    }
  }
];
