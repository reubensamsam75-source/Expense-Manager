/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Transaction } from '../types';
import { LucideIcon } from './LucideIcon';
import { motion, AnimatePresence } from 'motion/react';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTransactions: (transactions: Omit<Transaction, 'id'>[]) => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportTransactions,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[][]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // Header mappings
  const [amountCol, setAmountCol] = useState<string>('');
  const [dateCol, setDateCol] = useState<string>('');
  const [descCol, setDescCol] = useState<string>('');
  const [categoryCol, setCategoryCol] = useState<string>('');
  const [paymentCol, setPaymentCol] = useState<string>('');
  const [typeCol, setTypeCol] = useState<string>('');

  // Parsed records preview
  const [parsedPreview, setParsedPreview] = useState<Omit<Transaction, 'id'>[]>([]);
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: upload, 2: map headers, 3: preview & confirm

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to array of arrays (header is 1 to retrieve raw row structures)
        const sheetRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        
        if (sheetRows.length === 0) {
          alert('This Excel sheet appears to be empty.');
          return;
        }

        // Extract headers (first non-empty row)
        let headerRowIndex = 0;
        while (headerRowIndex < sheetRows.length && (!sheetRows[headerRowIndex] || sheetRows[headerRowIndex].length === 0)) {
          headerRowIndex++;
        }

        if (headerRowIndex >= sheetRows.length) {
          alert('No headers found in Excel file.');
          return;
        }

        const rawHeaders = sheetRows[headerRowIndex].map((h: any) => String(h || '').trim());
        const dataRows = sheetRows.slice(headerRowIndex + 1).filter(r => r && r.length > 0);

        setHeaders(rawHeaders);
        setRows(dataRows);

        // Auto-heuristics matching
        autoMapHeaders(rawHeaders);
        setStep(2);
      } catch (err) {
        console.error(err);
        alert('Failed to read Excel file. Please ensure it is a valid .xlsx, .xls, or .csv file.');
      }
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const autoMapHeaders = (rawHeaders: string[]) => {
    const lowercaseHeaders = rawHeaders.map(h => h.toLowerCase());

    const findMatch = (keys: string[]) => {
      for (const key of keys) {
        const index = lowercaseHeaders.findIndex(h => h.includes(key));
        if (index !== -1) return rawHeaders[index];
      }
      return '';
    };

    setAmountCol(findMatch(['amount', 'sum', 'price', 'cost', 'total', 'value']));
    setDateCol(findMatch(['date', 'time', 'day', 'created']));
    setDescCol(findMatch(['desc', 'title', 'item', 'details', 'name', 'payee', 'merchant']));
    setCategoryCol(findMatch(['category', 'tag', 'group', 'type_class']));
    setPaymentCol(findMatch(['payment', 'method', 'via', 'card', 'cash']));
    setTypeCol(findMatch(['type', 'direction', 'income/expense']));
  };

  const handleGeneratePreview = () => {
    if (!amountCol || !dateCol || !descCol) {
      alert('Amount, Date, and Description mappings are strictly required.');
      return;
    }

    const amtIdx = headers.indexOf(amountCol);
    const dateIdx = headers.indexOf(dateCol);
    const descIdx = headers.indexOf(descCol);
    const catIdx = categoryCol ? headers.indexOf(categoryCol) : -1;
    const payIdx = paymentCol ? headers.indexOf(paymentCol) : -1;
    const typeIdx = typeCol ? headers.indexOf(typeCol) : -1;

    const previewList: Omit<Transaction, 'id'>[] = [];

    rows.forEach((row, rowIndex) => {
      // Get raw cell values safely
      const rawAmt = row[amtIdx];
      const rawDate = row[dateIdx];
      const rawDesc = row[descIdx];

      if (rawAmt === undefined || rawAmt === null || rawAmt === '') return;

      // Parse Amount
      let amountVal = parseFloat(String(rawAmt).replace(/[$,]/g, ''));
      if (isNaN(amountVal)) return;

      // Parse Date
      let dateVal = '';
      if (rawDate instanceof Date) {
        dateVal = rawDate.toISOString().split('T')[0];
      } else if (rawDate) {
        // Handle custom date strings or timestamps
        const parsedTimestamp = Date.parse(String(rawDate));
        if (!isNaN(parsedTimestamp)) {
          dateVal = new Date(parsedTimestamp).toISOString().split('T')[0];
        } else {
          dateVal = new Date().toISOString().split('T')[0]; // fallback
        }
      } else {
        dateVal = new Date().toISOString().split('T')[0]; // fallback
      }

      // Parse Description
      const descVal = String(rawDesc || `Transaction #${rowIndex + 1}`).trim();

      // Parse Category
      let categoryVal = 'Others';
      if (catIdx !== -1 && row[catIdx]) {
        const cellCat = String(row[catIdx]).trim();
        // Match standard category options if close
        const matched = ['Food & Dining', 'Shopping', 'Housing', 'Transportation', 'Entertainment', 'Healthcare', 'Education']
          .find(c => c.toLowerCase() === cellCat.toLowerCase() || cellCat.toLowerCase().includes(c.toLowerCase()));
        categoryVal = matched || cellCat;
      }

      // Parse Payment Method
      let paymentVal = 'Debit Card';
      if (payIdx !== -1 && row[payIdx]) {
        paymentVal = String(row[payIdx]).trim();
      }

      // Parse Type (Income or Expense)
      let typeVal: 'income' | 'expense' = 'expense';
      if (typeIdx !== -1 && row[typeIdx]) {
        const val = String(row[typeIdx]).toLowerCase();
        if (val.includes('inc') || val.includes('credit') || val.includes('earn') || val === 'in') {
          typeVal = 'income';
          categoryVal = 'Income';
        }
      } else {
        // Alternative heuristic based on description or category
        const descLower = descVal.toLowerCase();
        const catLower = categoryVal.toLowerCase();
        if (descLower.includes('salary') || descLower.includes('paycheck') || descLower.includes('dividend') || catLower === 'income') {
          typeVal = 'income';
          categoryVal = 'Income';
        }
      }

      previewList.push({
        amount: Math.abs(amountVal),
        date: dateVal,
        description: descVal,
        category: categoryVal,
        paymentMethod: paymentVal,
        type: typeVal,
      });
    });

    if (previewList.length === 0) {
      alert('Could not extract any valid transactions from the selected mapping.');
      return;
    }

    setParsedPreview(previewList);
    setStep(3);
  };

  const handleFinalImport = () => {
    onImportTransactions(parsedPreview);
    resetAll();
    onClose();
  };

  const resetAll = () => {
    setFile(null);
    setHeaders([]);
    setRows([]);
    setAmountCol('');
    setDateCol('');
    setDescCol('');
    setCategoryCol('');
    setPaymentCol('');
    setTypeCol('');
    setParsedPreview([]);
    setStep(1);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden"
      >
        {/* Header */}
        <div className="bg-indigo-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl">
              <LucideIcon name="Download" size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold">Import Excel Sheet</h3>
              <p className="text-xs text-indigo-200">Import .xlsx, .xls, or .csv transaction logs</p>
            </div>
          </div>
          <button
            onClick={() => { resetAll(); onClose(); }}
            className="p-1.5 hover:bg-indigo-500 rounded-lg text-indigo-100 hover:text-white transition"
          >
            <LucideIcon name="X" size={18} />
          </button>
        </div>

        {/* Steps Progress */}
        <div className="bg-slate-50 dark:bg-slate-950 px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between text-xs font-semibold text-slate-400">
          <span className={step === 1 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>1. Upload File</span>
          <span className="text-slate-300">→</span>
          <span className={step === 2 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>2. Map Excel Headers</span>
          <span className="text-slate-300">→</span>
          <span className={step === 3 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>3. Verify & Save</span>
        </div>

        {/* Content Panel */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4 text-center"
              >
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center space-y-4 cursor-pointer transition ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                  }`}
                >
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full">
                    <LucideIcon name="Upload" size={32} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Drag & drop your excel sheet here, or <span className="text-indigo-600 dark:text-indigo-400">browse files</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Supports Excel (.xlsx, .xls) and CSV (.csv)</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl text-left text-xs text-slate-500 space-y-1.5 leading-relaxed">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <LucideIcon name="Info" size={13} className="text-indigo-500" />
                    How mapping works:
                  </h4>
                  <p>Decuples will automatically attempt to scan and auto-detect columns matching amounts, dates, and names. You'll be able to manually tweak them in the next step to support any personalized sheet template!</p>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-5"
              >
                <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/30 p-3.5 rounded-xl text-xs text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
                  <LucideIcon name="Sparkles" size={14} />
                  <span>Mapped file: <strong>{file?.name}</strong> with {rows.length} transactions found.</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Amount (Required) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      Amount Column
                    </label>
                    <select
                      value={amountCol}
                      onChange={(e) => setAmountCol(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium"
                    >
                      <option value="">-- Select Column --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Date (Required) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      Date Column
                    </label>
                    <select
                      value={dateCol}
                      onChange={(e) => setDateCol(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium"
                    >
                      <option value="">-- Select Column --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Description (Required) */}
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      Description / Merchant Column
                    </label>
                    <select
                      value={descCol}
                      onChange={(e) => setDescCol(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium"
                    >
                      <option value="">-- Select Column --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Category (Optional) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Category Column (Optional)</label>
                    <select
                      value={categoryCol}
                      onChange={(e) => setCategoryCol(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium"
                    >
                      <option value="">-- Skip Column (Use Heuristics) --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Payment Method (Optional) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Payment Method (Optional)</label>
                    <select
                      value={paymentCol}
                      onChange={(e) => setPaymentCol(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium"
                    >
                      <option value="">-- Skip (Default to Credit/Debit) --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Flow Direction Type (Optional) */}
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-medium text-slate-500">Transaction Type Column (Optional)</label>
                    <select
                      value={typeCol}
                      onChange={(e) => setTypeCol(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium"
                    >
                      <option value="">-- Skip (Identify automatically via values) --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleGeneratePreview}
                    disabled={!amountCol || !dateCol || !descCol}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  >
                    <span>Generate Preview</span>
                    <LucideIcon name="ChevronRight" size={12} />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div>
                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100">Review & Verify Transactions</h4>
                  <p className="text-[10px] text-slate-400">Showing {parsedPreview.length} transactions extracted from your file.</p>
                </div>

                {/* Table Preview */}
                <div className="max-h-60 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                  {parsedPreview.map((tx, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 text-xs hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{tx.description}</p>
                        <div className="flex gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span>{tx.date}</span>
                          <span>•</span>
                          <span>{tx.category}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                          {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                        </p>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">{tx.paymentMethod}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setStep(2)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50"
                  >
                    Back to Headers
                  </button>
                  <button
                    onClick={handleFinalImport}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  >
                    <LucideIcon name="CheckCircle" size={13} />
                    <span>Confirm & Import ({parsedPreview.length} Records)</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
