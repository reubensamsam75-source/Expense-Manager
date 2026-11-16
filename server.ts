/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Google GenAI lazy loader or client safely
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. AI features will fallback to client-side heuristics.");
    }
    aiClient = new GoogleGenAI({ apiKey: key || 'MOCK_KEY' });
  }
  return aiClient;
}

app.use(express.json());

// API route: Parse natural language expense inputs
app.post('/api/parse-natural-language', async (req: Request, res: Response) => {
  try {
    const { text, currentDate } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text input is required' });
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      // Fallback fallback parsing logic if no API key is provided
      const parsed = mockParseHeuristic(text, currentDate || new Date().toISOString().split('T')[0]);
      return res.json({ parsed, warning: 'Using fallback heuristic parser (no API key configured)' });
    }

    const ai = getGenAI();
    const prompt = `You are an expert personal finance assistant. Parse the following natural language sentence into a structured JSON representing an expense or income transaction.
Current Reference Date is: ${currentDate || new Date().toISOString().split('T')[0]}

Input Sentence: "${text}"

You must respond ONLY with a valid, clean JSON object (no markdown, no backticks, no wrapping text, just raw json). The object must conform exactly to this schema:
{
  "amount": number (positive amount),
  "category": string (Must be exactly one of: "Food & Dining", "Shopping", "Housing", "Transportation", "Entertainment", "Income", "Healthcare", "Education", "Others"),
  "type": "income" | "expense",
  "description": string (Capitalized clean description, e.g. "Starbucks Coffee" instead of "starbucks"),
  "date": "YYYY-MM-DD" (Calculate based on sentence like "yesterday", "last Monday", or fallback to Current Reference Date if not mentioned),
  "paymentMethod": "Cash" | "Credit Card" | "Debit Card" | "Bank Transfer",
  "isRecurring": boolean (true if recurring, monthly, subscription, membership, or rent mentioned, false otherwise)
}

If details like paymentMethod are not mentioned, default to "Cash" for small purchases (< $30) or "Debit Card" otherwise. If the input is clearly income (e.g. salary, got paid, bonus, dividend, gig work), set "type" to "income" and "category" to "Income". If amount is not specified, make a reasonable estimation or default to 10.0. Ensure the output is valid JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let cleanText = response.text || '';
    // Strip markdown formatting if any
    cleanText = cleanText.replace(/```json/gi, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(cleanText);
    res.json({ parsed });
  } catch (error: any) {
    console.error('Error parsing transaction via Gemini:', error);
    res.status(500).json({ error: 'Failed to parse text input', details: error.message });
  }
});

// API route: Analyze financial status & budgets
app.post('/api/analyze', async (req: Request, res: Response) => {
  try {
    const { transactions, budgets, goals } = req.body;
    
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      const summary = generateMockInsights(transactions || [], budgets || [], goals || []);
      return res.json({ insights: summary, warning: 'Using fallback financial calculations' });
    }

    const ai = getGenAI();
    const prompt = `You are a certified professional financial planner. Analyze this user's current transactional records, budgets, and savings goals, and generate a JSON file of actionable advice, category overspending warnings, and savings tips.

Data provided:
Transactions list: ${JSON.stringify(transactions || [])}
Budget limits list: ${JSON.stringify(budgets || [])}
Savings goals list: ${JSON.stringify(goals || [])}
Current Date: ${new Date().toISOString().split('T')[0]}

Respond ONLY with a valid, clean JSON object (no markdown, no formatting text, no backticks, just raw json). The schema must match:
{
  "summary": string (A concise 3-sentence expert overview of their financial situation right now, speaking directly to them in second-person, e.g., "You are doing well..."),
  "tips": string[] (Array of 3 highly personalized, specific actionable steps based on their patterns, not generic ones),
  "warnings": [
    {
      "category": string (e.g. "Food & Dining"),
      "message": string (e.g. "You've spent 92% of your Food budget with 10 days left in the month."),
      "severity": "low" | "medium" | "high"
    }
  ],
  "savingsOpportunities": string[] (Array of 2-3 specific areas where they can cut back or micro-save, with estimated amounts, e.g. "Limit dining out to twice a week to save $120/month")
}

Make sure to cross-check budgets and transactions (group transactions by category and calculate total spend in each) to populate the "warnings" realistically. Keep warnings empty if everything is in perfect order. Make your analysis supportive but realistic, encouraging them to meet their goals.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let cleanText = response.text || '';
    cleanText = cleanText.replace(/```json/gi, '').replace(/```/g, '').trim();

    const insights = JSON.parse(cleanText);
    res.json({ insights });
  } catch (error: any) {
    console.error('Error analyzing via Gemini:', error);
    res.status(500).json({ error: 'Failed to analyze records', details: error.message });
  }
});

// API route: Personal AI Financial Advisor Chat
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, history, transactions, budgets, goals } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return res.json({ 
        reply: "Hello! I am your Decuples Wealth & Asset Advisor. However, the Gemini API Key is currently not set up in the Environment Secrets. You can still manage your assets manually! Once your API Key is set in your AI Studio secrets, I can provide deep conversational analysis of your spending habits, compound return simulations, and answer all of your questions.",
        warning: 'No Gemini key set'
      });
    }

    const ai = getGenAI();

    // Prepare system instructions with full financial context
    const financialContext = `You are an elite, friendly, and empowering AI Financial Advisor named "Decuples Wealth Advisor".
Your purpose is to help the user navigate their spending, stick to budgets, maximize their passive yield, and achieve their savings goals with positive reinforcement and smart, numerical logic.
Here is the user's current live financial profile:
- Total transactions: ${transactions?.length || 0}
- Current Transactions List: ${JSON.stringify(transactions || [])}
- Budget limits: ${JSON.stringify(budgets || [])}
- Savings goals: ${JSON.stringify(goals || [])}
- Current Date is: ${new Date().toISOString().split('T')[0]}

Provide clear, supportive, highly actionable, and numerical answers. Use bullet points or short paragraphs. Keep your formatting clean (markdown is supported, but avoid too many headers). Always speak constructively and avoid sounding overly robotic.`;

    // Map history to the required Google GenAI format (role: 'user' | 'model')
    const contents = [
      { role: 'user', parts: [{ text: financialContext + "\n\nHello, Decuples!" }] },
      { role: 'model', parts: [{ text: "Hello! I am Decuples, your dedicated AI financial coach. I have carefully reviewed your spending, budgets, and savings goals. How can I help you optimize your finances today?" }] }
    ];

    // Push past conversation steps
    if (history && history.length > 0) {
      history.forEach((msg: any) => {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      });
    }

    // Push the newest message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error('Error during AI advisor chat:', error);
    res.status(500).json({ error: 'Failed to get chat reply', details: error.message });
  }
});

// In-memory queue for incoming payment alerts forwarded from external app webhooks / shortcuts
interface WebhookAlertItem {
  id: string;
  appName: string;
  message: string;
  amount?: number;
  date?: string;
  receivedAt: string;
}

let pendingWebhookAlerts: WebhookAlertItem[] = [];

// Webhook endpoint for external apps / mobile shortcuts / notification forwarders
app.post('/api/app-payments/webhook', (req: Request, res: Response) => {
  try {
    const { appName, title, message, text, amount, date } = req.body || {};
    const combinedMessage = [title, message || text].filter(Boolean).join(' — ').trim();

    if (!combinedMessage) {
      return res.status(400).json({ error: 'Payment alert message or text is required' });
    }

    const item: WebhookAlertItem = {
      id: `wh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      appName: (appName || '').toString().trim() || 'Auto-Detected App',
      message: combinedMessage,
      amount: typeof amount === 'number' && amount > 0 ? amount : undefined,
      date: typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
      receivedAt: new Date().toISOString(),
    };

    pendingWebhookAlerts = [item, ...pendingWebhookAlerts].slice(0, 100);
    res.status(201).json({ queued: true, alert: item });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to queue webhook alert', details: error.message });
  }
});

app.get('/api/app-payments/pending', (_req: Request, res: Response) => {
  res.json({ alerts: pendingWebhookAlerts });
});

app.delete('/api/app-payments/pending/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  pendingWebhookAlerts = pendingWebhookAlerts.filter((a) => a.id !== id);
  res.json({ removed: true });
});

app.post('/api/app-payments/clear', (req: Request, res: Response) => {
  const { ids } = req.body || {};
  if (Array.isArray(ids) && ids.length > 0) {
    const idSet = new Set(ids);
    pendingWebhookAlerts = pendingWebhookAlerts.filter((a) => !idSet.has(a.id));
  } else {
    pendingWebhookAlerts = [];
  }
  res.json({ cleared: true });
});

// Helper to match a parsed transaction against the user's configured apps & permission flags
function matchConnectedApp(
  textSnippet: string,
  hintedAppName: string | undefined,
  connectedApps: any[]
) {
  const haystack = `${hintedAppName || ''} ${textSnippet}`.toLowerCase();
  const nonUpiMatches: any[] = [];
  const upiMatches: any[] = [];

  for (const appItem of connectedApps) {
    const nameLower = (appItem.name || '').toLowerCase();
    const keywords: string[] = Array.isArray(appItem.keywords) ? appItem.keywords : [];
    const matchesName = nameLower && haystack.includes(nameLower);
    const matchesKeyword = keywords.some((kw) => kw && haystack.includes(kw.toLowerCase()));

    if (matchesName || matchesKeyword) {
      if (appItem.category === 'upi') {
        upiMatches.push(appItem);
      } else {
        nonUpiMatches.push(appItem);
      }
    }
  }

  // Prefer merchant/food/shopping app if both merchant & UPI rail appear, or fallback to UPI app
  return nonUpiMatches[0] || upiMatches[0] || null;
}

// Parse payment alerts, UPI notifications, food & shopping order confirmations
app.post('/api/collect-app-payments', async (req: Request, res: Response) => {
  try {
    const {
      rawText,
      connectedApps = [],
      currentDate,
      requireExplicitAppPermission = true,
    } = req.body || {};

    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return res.status(400).json({ error: 'Payment notifications or receipt text is required' });
    }

    const refDate = currentDate || new Date().toISOString().split('T')[0];
    const key = process.env.GEMINI_API_KEY;

    let rawParsedList: any[] = [];

    if (key) {
      try {
        const ai = getGenAI();
        const appNamesList = connectedApps.map((a: any) => `${a.name} (${a.category})`).join(', ');
        const prompt = `You are a financial receipt and payment alert extraction engine.
Extract ALL financial transactions, UPI transfers, food delivery orders, shopping purchases, or payment notifications from the input text below.
Reference Date: ${refDate}
Known User Apps: ${appNamesList}

Input Text:
"""
${rawText}
"""

Respond ONLY with a valid JSON array (no markdown fences, no commentary). Each element must follow this exact schema:
{
  "amount": number (positive number),
  "category": string ("Food & Dining" | "Shopping" | "Housing" | "Transportation" | "Entertainment" | "Income" | "Healthcare" | "Education" | "Others"),
  "type": "income" | "expense",
  "description": string (clean merchant or purchase title, e.g. "Swiggy Dinner Order", "Amazon Electronics"),
  "date": "YYYY-MM-DD",
  "paymentMethod": "UPI" | "Credit Card" | "Debit Card" | "Bank Transfer" | "Cash",
  "sourceApp": string (exact app name if detected, e.g. "Google Pay (GPay)", "PhonePe", "Paytm", "Swiggy", "Zomato", "Amazon", "Flipkart", "Uber Rides", or merchant/app name from text),
  "sourceAppType": "upi" | "food" | "shopping" | "other",
  "rawSnippet": string (short snippet of the original line/alert)
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        let cleanText = (response.text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsedJson = JSON.parse(cleanText);
        if (Array.isArray(parsedJson)) {
          rawParsedList = parsedJson;
        }
      } catch (aiErr) {
        console.warn('Gemini app payment parse failed, falling back to heuristic parser:', aiErr);
      }
    }

    if (rawParsedList.length === 0) {
      rawParsedList = parseAppAlertsHeuristic(rawText, connectedApps, refDate);
    }

    const enriched = rawParsedList.map((item, idx) => {
      const snippet = item.rawSnippet || item.description || '';
      const matched = matchConnectedApp(snippet, item.sourceApp, connectedApps);

      const resolvedName = matched ? matched.name : item.sourceApp || 'Unregistered App';
      const resolvedType = matched ? matched.category : item.sourceAppType || 'other';
      const isPermitted = matched
        ? Boolean(matched.permissionEnabled)
        : !requireExplicitAppPermission;

      return {
        tempId: `col-${Date.now()}-${idx}`,
        amount: typeof item.amount === 'number' && item.amount > 0 ? item.amount : 0,
        category:
          item.category ||
          (matched ? matched.defaultLedgerCategory : 'Others'),
        type: item.type === 'income' ? 'income' : 'expense',
        description: item.description || `${resolvedName} Transaction`,
        date: /^\d{4}-\d{2}-\d{2}$/.test(item.date || '') ? item.date : refDate,
        paymentMethod:
          item.paymentMethod ||
          (matched ? matched.defaultPaymentMethod : 'UPI'),
        sourceApp: resolvedName,
        sourceAppId: matched?.id,
        sourceAppType: resolvedType,
        permissionStatus: isPermitted ? 'granted' : 'blocked',
        rawSnippet: snippet.slice(0, 140),
      };
    });

    res.json({ transactions: enriched });
  } catch (error: any) {
    console.error('Error collecting app payments:', error);
    res.status(500).json({ error: 'Failed to collect app payments', details: error.message });
  }
});

function parseAppAlertsHeuristic(rawText: string, connectedApps: any[], refDate: string): any[] {
  const lines = rawText
    .split(/\r?\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 3);

  const results: any[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    // Extract amount (supports ₹1,250.50, Rs. 450, INR 500, $18.40, €20, or plain numbers near payment verbs)
    const amountMatch =
      line.match(/(?:₹|rs\.?|inr|\$|€|£)\s*([\d,]+(?:\.\d{1,2})?)/i) ||
      line.match(/(?:paid|spent|debited|credited|received|amount|total|bill|order(?:ed)?(?:\s+for)?)\s*(?:of|is|:)?\s*([\d,]+(?:\.\d{1,2})?)/i) ||
      line.match(/([\d,]+(?:\.\d{1,2})?)/);

    if (!amountMatch) continue;
    const numericAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (isNaN(numericAmount) || numericAmount <= 0) continue;

    const matched = matchConnectedApp(line, undefined, connectedApps);
    const isIncome =
      lower.includes('received') ||
      lower.includes('credited') ||
      lower.includes('cashback') ||
      lower.includes('refund');

    let paymentMethod = matched?.defaultPaymentMethod || 'UPI';
    if (lower.includes('upi') || lower.includes('gpay') || lower.includes('phonepe') || lower.includes('paytm')) {
      paymentMethod = 'UPI';
    } else if (lower.includes('credit card') || lower.includes('visa') || lower.includes('mastercard')) {
      paymentMethod = 'Credit Card';
    } else if (lower.includes('debit card')) {
      paymentMethod = 'Debit Card';
    } else if (lower.includes('bank') || lower.includes('imps') || lower.includes('neft')) {
      paymentMethod = 'Bank Transfer';
    }

    let category = isIncome ? 'Income' : matched?.defaultLedgerCategory || 'Others';
    if (!isIncome && !matched) {
      if (lower.includes('food') || lower.includes('swiggy') || lower.includes('zomato') || lower.includes('order') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('coffee')) {
        category = 'Food & Dining';
      } else if (lower.includes('amazon') || lower.includes('flipkart') || lower.includes('myntra') || lower.includes('shop')) {
        category = 'Shopping';
      } else if (lower.includes('uber') || lower.includes('ola') || lower.includes('ride') || lower.includes('cab')) {
        category = 'Transportation';
      }
    }

    let date = refDate;
    const isoDateMatch = line.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    const slashDateMatch = line.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
    if (isoDateMatch) {
      date = isoDateMatch[1];
    } else if (slashDateMatch) {
      const dd = slashDateMatch[1].padStart(2, '0');
      const mm = slashDateMatch[2].padStart(2, '0');
      const yyyy = slashDateMatch[3];
      date = `${yyyy}-${mm}-${dd}`;
    } else if (lower.includes('yesterday')) {
      const d = new Date(refDate);
      d.setDate(d.getDate() - 1);
      date = d.toISOString().split('T')[0];
    }

    // Build clean description
    let sourceApp = matched ? matched.name : 'Other App';
    let sourceAppType = matched ? matched.category : 'other';
    if (!matched) {
      if (lower.includes('upi')) sourceAppType = 'upi';
      else if (category === 'Food & Dining') sourceAppType = 'food';
      else if (category === 'Shopping') sourceAppType = 'shopping';
    }

    const cleanSnippet = line.replace(/\s+/g, ' ').trim();
    const description = matched
      ? `${matched.name}: ${cleanSnippet.slice(0, 42)}${cleanSnippet.length > 42 ? '...' : ''}`
      : cleanSnippet.slice(0, 48);

    results.push({
      amount: numericAmount,
      category,
      type: isIncome ? 'income' : 'expense',
      description,
      date,
      paymentMethod,
      sourceApp,
      sourceAppType,
      rawSnippet: cleanSnippet,
    });
  }

  return results;
}

// Fallback heuristic parser when Gemini is missing
function mockParseHeuristic(text: string, refDate: string): any {
  const words = text.toLowerCase();
  let amount = 10;
  const numMatches = text.match(/\d+(\.\d+)?/);
  if (numMatches) {
    amount = parseFloat(numMatches[0]);
  }

  // Guess category
  let category = 'Others';
  let type: 'income' | 'expense' = 'expense';
  
  if (words.includes('salary') || words.includes('paycheck') || words.includes('gig') || words.includes('earned') || words.includes('dividend') || words.includes('bonus')) {
    category = 'Income';
    type = 'income';
  } else if (words.includes('food') || words.includes('eat') || words.includes('lunch') || words.includes('dinner') || words.includes('breakfast') || words.includes('sushi') || words.includes('starbucks') || words.includes('coffee') || words.includes('restaurant') || words.includes('burger')) {
    category = 'Food & Dining';
  } else if (words.includes('shop') || words.includes('buy') || words.includes('clothes') || words.includes('amazon') || words.includes('target')) {
    category = 'Shopping';
  } else if (words.includes('uber') || words.includes('taxi') || words.includes('bus') || words.includes('train') || words.includes('subway') || words.includes('gas') || words.includes('flight')) {
    category = 'Transportation';
  } else if (words.includes('movie') || words.includes('game') || words.includes('netflix') || words.includes('ticket') || words.includes('concert') || words.includes('fun')) {
    category = 'Entertainment';
  } else if (words.includes('rent') || words.includes('mortgage') || words.includes('electricity') || words.includes('water') || words.includes('housing')) {
    category = 'Housing';
  } else if (words.includes('doctor') || words.includes('dentist') || words.includes('pill') || words.includes('medicine') || words.includes('pharmacy') || words.includes('health')) {
    category = 'Healthcare';
  } else if (words.includes('course') || words.includes('book') || words.includes('tuition') || words.includes('school') || words.includes('class')) {
    category = 'Education';
  }

  // Guess payment method
  let paymentMethod = 'Cash';
  if (words.includes('card') || words.includes('visa') || words.includes('credit')) {
    paymentMethod = 'Credit Card';
  } else if (words.includes('debit') || words.includes('bank') || words.includes('transfer')) {
    paymentMethod = 'Debit Card';
  }

  // Guess description
  let description = 'Parsed Transaction';
  const descCandidates = text.split(/\bat\b|\bfor\b|\bspent\b|\bpaid\b|\bon\b/i);
  if (descCandidates.length > 1) {
    description = descCandidates[descCandidates.length - 1].replace(/\d+/g, '').replace(/[\$\£\€]/g, '').trim();
    if (description.length > 25) {
      description = description.slice(0, 25) + '...';
    }
  } else {
    description = text.slice(0, 30);
  }
  
  if (!description || description.trim() === '') {
    description = category !== 'Others' ? `${category} Purchase` : 'Quick Expense';
  }

  // Guess date
  let date = refDate;
  if (words.includes('yesterday')) {
    const yesterday = new Date(refDate);
    yesterday.setDate(yesterday.getDate() - 1);
    date = yesterday.toISOString().split('T')[0];
  }

  // Check if recurring
  const isRecurring = words.includes('monthly') || words.includes('recurring') || words.includes('subscription') || words.includes('every month') || words.includes('membership');

  return {
    amount,
    category,
    type,
    description: description.charAt(0).toUpperCase() + description.slice(1),
    date,
    paymentMethod,
    isRecurring
  };
}

// Fallback insights when API Key is missing
function generateMockInsights(transactions: any[], budgets: any[], goals: any[]): any {
  const expenses = transactions.filter(t => t.type === 'expense');
  const incomes = transactions.filter(t => t.type === 'income');
  const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const summary = `Based on your logged data, you have total earnings of $${totalIncome.toFixed(2)} and expenses totaling $${totalExpense.toFixed(2)}. This leaves you with a net balance of $${balance.toFixed(2)}. Track your spending patterns closely to align with your budgeting limits.`;
  
  const tips = [
    "Consider categorizing your transactions so you can track where your money goes.",
    "Set custom budgets for your frequent expense categories to prevent impulsive purchases.",
    "Review your subscription list; cancel services you haven't accessed in the last 30 days."
  ];

  const warnings: any[] = [];
  // Calculate spent per category
  const categorySpent: Record<string, number> = {};
  expenses.forEach(t => {
    categorySpent[t.category] = (categorySpent[t.category] || 0) + t.amount;
  });

  budgets.forEach(b => {
    const spent = categorySpent[b.category] || 0;
    if (spent > b.limit) {
      warnings.push({
        category: b.category,
        message: `Over Budget! You have spent $${spent.toFixed(2)} of your $${b.limit.toFixed(2)} limit.`,
        severity: 'high'
      });
    } else if (spent > b.limit * 0.8) {
      warnings.push({
        category: b.category,
        message: `Close to Limit! You have spent $${spent.toFixed(2)} out of $${b.limit.toFixed(2)} budget.`,
        severity: 'medium'
      });
    }
  });

  return {
    summary,
    tips,
    warnings,
    savingsOpportunities: [
      "Limit daily food delivery or coffee shop runs to save around $45 weekly.",
      "Bundle utilities or check with service providers to request lower rates."
    ]
  };
}

// Setup Vite integration or serve production static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Expense Manager server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
