/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CollectedAppTransaction, ConnectedApp } from '../types';
import { LucideIcon } from './LucideIcon';
import { motion, AnimatePresence } from 'motion/react';

interface ReceiptScannerProps {
  connectedApps?: ConnectedApp[];
  requireExplicitAppPermission?: boolean;
  onExtracted: (result: {
    receiptSummary: string;
    transactions: CollectedAppTransaction[];
  }) => void;
  compact?: boolean;
  disabledReason?: string | null;
}

const MAX_DIMENSION = 1600;

function compressImageDataUrl(dataUrl: string, fallbackMime: string): Promise<{ dataUrl: string; mimeType: string }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= MAX_DIMENSION && height <= MAX_DIMENSION && dataUrl.length < 1_500_000) {
        resolve({ dataUrl, mimeType: fallbackMime });
        return;
      }

      if (width > height && width > MAX_DIMENSION) {
        height = Math.round((height * MAX_DIMENSION) / width);
        width = MAX_DIMENSION;
      } else if (height > MAX_DIMENSION) {
        width = Math.round((width * MAX_DIMENSION) / height);
        height = MAX_DIMENSION;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ dataUrl, mimeType: fallbackMime });
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', 0.88);
      resolve({ dataUrl: compressed, mimeType: 'image/jpeg' });
    };
    img.onerror = () => resolve({ dataUrl, mimeType: fallbackMime });
    img.src = dataUrl;
  });
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  connectedApps = [],
  requireExplicitAppPermission = false,
  onExtracted,
  compact = false,
  disabledReason = null
}) => {
  const [inputMode, setInputMode] = useState<'upload' | 'camera'>('upload');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [previewMimeType, setPreviewMimeType] = useState<string>('image/jpeg');
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement>(null);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Ensure camera hardware is released on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Bind active stream when video element mounts
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {
        // Auto-play handle ignored
      });
    }
  }, [isCameraActive]);

  const runReceiptExtraction = async (imageDataUrl: string, mime: string) => {
    if (disabledReason) {
      setScanError(disabledReason);
      return;
    }

    setIsScanning(true);
    setScanError(null);

    try {
      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageDataUrl,
          mimeType: mime,
          connectedApps,
          currentDate: new Date().toISOString().split('T')[0],
          requireExplicitAppPermission
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to scan receipt image.');
      }

      const txs: CollectedAppTransaction[] = data.transactions || [];
      if (txs.length === 0) {
        throw new Error('No transaction details were found in this image.');
      }

      onExtracted({
        receiptSummary: data.receiptSummary || 'Receipt scanned successfully.',
        transactions: txs
      });
    } catch (err: any) {
      setScanError(err.message || 'Unable to extract data from this receipt.');
    } finally {
      setIsScanning(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setScanError('Please select a valid image file (PNG, JPG, WEBP, HEIC).');
      return;
    }
    if (disabledReason) {
      setScanError(disabledReason);
      return;
    }

    setScanError(null);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const rawUrl = ev.target?.result as string;
      if (!rawUrl) return;
      const { dataUrl, mimeType } = await compressImageDataUrl(rawUrl, file.type || 'image/jpeg');
      setPreviewDataUrl(dataUrl);
      setPreviewMimeType(mimeType);
      await runReceiptExtraction(dataUrl, mimeType);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const startLiveCamera = async () => {
    if (disabledReason) {
      setScanError(disabledReason);
      return;
    }

    setCameraError(null);
    setScanError(null);
    setPreviewDataUrl(null);
    stopCameraStream();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Live camera API is unavailable in this browser context. Use "Take / Upload Photo" below.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (err: any) {
      const msg =
        err?.name === 'NotAllowedError'
          ? 'Camera access was denied. Grant camera permission in browser settings or upload a receipt image instead.'
          : 'Could not access a camera on this device. You can upload a receipt photo instead.';
      setCameraError(msg);
      setIsCameraActive(false);
    }
  };

  const handleCaptureFrame = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const capturedRaw = canvas.toDataURL('image/jpeg', 0.9);
    stopCameraStream();

    const { dataUrl, mimeType } = await compressImageDataUrl(capturedRaw, 'image/jpeg');
    setPreviewDataUrl(dataUrl);
    setPreviewMimeType(mimeType);
    await runReceiptExtraction(dataUrl, mimeType);
  };

  const switchMode = (mode: 'upload' | 'camera') => {
    setInputMode(mode);
    setScanError(null);
    setCameraError(null);
    if (mode === 'upload') {
      stopCameraStream();
    } else if (!previewDataUrl) {
      startLiveCamera();
    }
  };

  const handleReset = () => {
    setPreviewDataUrl(null);
    setScanError(null);
    setCameraError(null);
    if (inputMode === 'camera') {
      startLiveCamera();
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Mode Switcher Bar */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-full flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70">
          <button
            id="receipt-mode-upload"
            type="button"
            onClick={() => switchMode('upload')}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center text-center gap-1.5 cursor-pointer ${
              inputMode === 'upload'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <LucideIcon name="Image" size={13} className="text-indigo-500" />
            <span>Receipt Image</span>
          </button>
          <button
            id="receipt-mode-camera"
            type="button"
            onClick={() => switchMode('camera')}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center text-center gap-1.5 cursor-pointer ${
              inputMode === 'camera'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <LucideIcon name="Camera" size={13} className="text-indigo-500" />
            <span>Camera Scanner</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1 text-center">
          <LucideIcon name="ScanLine" size={12} className="text-indigo-500" />
          <span>Receipts, bills & UPI screenshots</span>
        </span>
      </div>

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={mobileCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Preview / Scanner Stage */}
      <AnimatePresence mode="wait">
        {previewDataUrl ? (
          <motion.div
            key="receipt-preview-card"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 space-y-3"
          >
            <div className={`relative rounded-lg overflow-hidden bg-slate-900/90 flex items-center justify-center ${compact ? 'max-h-44' : 'max-h-56'}`}>
              <img
                src={previewDataUrl}
                alt="Scanned receipt preview"
                className={`${compact ? 'max-h-44' : 'max-h-56'} w-auto object-contain`}
              />

              {isScanning && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 text-white">
                  <div className="w-7 h-7 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-semibold tracking-wide">
                    Scanning receipt with Gemini Vision...
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={isScanning}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <LucideIcon name="RefreshCw" size={12} />
                <span>{inputMode === 'camera' ? 'Retake Photo' : 'Choose Another Image'}</span>
              </button>

              <button
                type="button"
                onClick={() => runReceiptExtraction(previewDataUrl, previewMimeType)}
                disabled={isScanning}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <LucideIcon name="Sparkles" size={13} />
                <span>{isScanning ? 'Extracting...' : 'Re-scan Receipt'}</span>
              </button>
            </div>
          </motion.div>
        ) : inputMode === 'camera' ? (
          <motion.div
            key="receipt-camera-view"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 overflow-hidden"
          >
            {isCameraActive ? (
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full object-cover ${compact ? 'h-52' : 'h-64'}`}
                />

                {/* Viewfinder Overlay Guides */}
                <div className="pointer-events-none absolute inset-4 border border-white/25 rounded-lg">
                  <span className="absolute -top-0.5 -left-0.5 w-5 h-5 border-t-2 border-l-2 border-indigo-400 rounded-tl-md" />
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 border-t-2 border-r-2 border-indigo-400 rounded-tr-md" />
                  <span className="absolute -bottom-0.5 -left-0.5 w-5 h-5 border-b-2 border-l-2 border-indigo-400 rounded-bl-md" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 border-b-2 border-r-2 border-indigo-400 rounded-br-md" />
                </div>

                <div className="p-3 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={stopCameraStream}
                    className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                  >
                    Stop Camera
                  </button>

                  <button
                    id="btn-capture-receipt"
                    type="button"
                    onClick={handleCaptureFrame}
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <LucideIcon name="Aperture" size={15} />
                    <span>Capture & Scan Receipt</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center space-y-3 bg-slate-50 dark:bg-slate-950">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                  <LucideIcon name="Camera" size={22} />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    {cameraError ? 'Camera Unavailable' : 'Point Camera at Receipt or QR Slip'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {cameraError || 'Start the live viewfinder to snap a printed bill, restaurant receipt, or screen.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={startLiveCamera}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <LucideIcon name="Camera" size={13} />
                    <span>{cameraError ? 'Retry Camera' : 'Start Camera'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => mobileCameraInputRef.current?.click()}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <LucideIcon name="Upload" size={13} />
                    <span>Take / Upload Photo</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="receipt-upload-dropzone"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-xl border-2 border-dashed transition cursor-pointer text-center ${
              compact ? 'p-5' : 'p-6'
            } ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/15'
            }`}
          >
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-2.5">
              <LucideIcon name="ScanLine" size={20} />
            </div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
              Drop a receipt image or payment screenshot here
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Supports JPG, PNG, WEBP — printed bills, Swiggy/Amazon orders, or GPay/PhonePe slips
            </p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold inline-flex items-center gap-1.5">
                <LucideIcon name="Upload" size={12} />
                Browse Receipt Image
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  switchMode('camera');
                }}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <LucideIcon name="Camera" size={12} />
                Open Camera
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      {scanError && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
          <LucideIcon name="AlertTriangle" size={15} className="shrink-0 mt-0.5" />
          <span>{scanError}</span>
        </div>
      )}
    </div>
  );
};
