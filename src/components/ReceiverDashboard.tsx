/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  QrCode, Keyboard, Download, Wifi, Zap, CheckCircle, 
  RefreshCw, Loader2, Play, AlertCircle, FileDown 
} from 'lucide-react';
import { ShareableFile, SubscriptionState } from '../types';

interface ReceiverDashboardProps {
  subscription: SubscriptionState;
  onReceiveComplete: (fileName: string, fileCount: number, size: number, speed: string) => void;
  incomingFiles?: ShareableFile[]; // Prop passed when doing self-simulated download
  incomingUrl?: string; // Prop passed when doing self-simulated download
  onResetIncoming: () => void;
}

export default function ReceiverDashboard({
  subscription,
  onReceiveComplete,
  incomingFiles,
  incomingUrl,
  onResetIncoming,
}: ReceiverDashboardProps) {
  const [manualUrl, setManualUrl] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Transfer State Managers
  const [isTransferring, setIsTransferring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transferSpeed, setTransferSpeed] = useState('0 MB/s');
  const [bytesTransferred, setBytesTransferred] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [success, setSuccess] = useState(false);
  const [targetFileName, setTargetFileName] = useState('');
  const [targetFileCount, setTargetFileCount] = useState(1);
  const [resolvedFiles, setResolvedFiles] = useState<ShareableFile[]>([]);

  // Monitor simulated launch commands
  useEffect(() => {
    if (incomingUrl && incomingFiles && incomingFiles.length > 0) {
      setManualUrl(incomingUrl);
      setResolvedFiles(incomingFiles);
      setTargetFileCount(incomingFiles.length);
      setTargetFileName(incomingFiles[0].name);
      
      const totalSize = incomingFiles.reduce((sum, f) => sum + f.size, 0);
      setTotalBytes(totalSize);
      
      // Auto-trigger simulated transfer sequence
      startTransferProcess(totalSize, incomingFiles[0].name, incomingFiles.length, incomingFiles);
    }
  }, [incomingUrl, incomingFiles]);

  const handleManualConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrl.trim()) return;

    try {
      const urlObj = new URL(manualUrl);
      const params = new URLSearchParams(urlObj.search);
      const count = parseInt(params.get('files') || '1', 10);
      const bytes = parseInt(params.get('bytes') || '10485760', 10); // fallback 10MB
      const rawName = params.get('fileName') || 'Shared_File.bin';
      const name = decodeURIComponent(rawName);

      setTargetFileCount(count);
      setTargetFileName(name);
      setTotalBytes(bytes);

      // Create simulated files to enable downloading if none passed
      const generated: ShareableFile[] = [];
      for (let i = 0; i < count; i++) {
        const itemSize = Math.floor(bytes / count);
        const itemName = i === 0 ? name : `Shared_File_${i + 1}.bin`;
        // Create an empty mock download Blob
        const blob = new Blob([new Uint8Array(itemSize)], { type: 'application/octet-stream' });
        generated.push({
          id: `sim-${i}-${Math.random().toString(36).substring(7)}`,
          name: itemName,
          size: itemSize,
          type: 'application/octet-stream',
          dataUrl: URL.createObjectURL(blob),
          blob: blob
        });
      }
      setResolvedFiles(generated);

      startTransferProcess(bytes, name, count, generated);

    } catch (err) {
      alert('Invalid Hotspot IP download URL string. Check characters and retry.');
    }
  };

  const startTransferProcess = (
    bytesTotal: number, 
    fileName: string, 
    count: number,
    filesToSave: ShareableFile[]
  ) => {
    setIsTransferring(true);
    setProgress(0);
    setBytesTransferred(0);
    setSuccess(false);

    // Speed allocation: Premium receives absolute high-bandwidth pipeline
    const maxSpeedMbs = subscription.isPremium ? 72 : 8; // high performance vs throttled
    setTransferSpeed(`${maxSpeedMbs.toFixed(1)} MB/s`);

    const intervalTimeMs = 120;
    const sizeStep = (maxSpeedMbs * 1024 * 1024) * (intervalTimeMs / 1000);

    const timer = setInterval(() => {
      setBytesTransferred((prev) => {
        const next = prev + sizeStep;
        if (next >= bytesTotal) {
          clearInterval(timer);
          setProgress(100);
          setIsTransferring(false);
          setSuccess(true);
          onReceiveComplete(fileName, count, bytesTotal, `${maxSpeedMbs.toFixed(1)} MB/s`);
          return bytesTotal;
        } else {
          setProgress(Math.floor((next / bytesTotal) * 100));
          return next;
        }
      });
    }, intervalTimeMs);
  };

  const saveFilesToBrowser = () => {
    if (resolvedFiles.length === 0) return;
    
    resolvedFiles.forEach((file) => {
      if (!file.dataUrl) return;
      const a = document.createElement('a');
      a.href = file.dataUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  };

  const resetAll = () => {
    setManualUrl('');
    setIsTransferring(false);
    setProgress(0);
    setBytesTransferred(0);
    setSuccess(false);
    setResolvedFiles([]);
    onResetIncoming();
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const requestCameraSimulator = () => {
    setShowScanner(true);
    setCameraError(null);
    // Mimic real device scanning sequence delay
    setTimeout(() => {
      // In a real local web server, scanning fetches the hot token.
      // We auto-resolve to a template simulated link so it has instantly runnable logic in browser frame!
      const mockSharedUrl = `http://192.168.43.1:3000/download?files=1&bytes=52428800&fileName=${encodeURIComponent('cinematics.mp4')}`;
      setManualUrl(mockSharedUrl);
      setShowScanner(false);
      
      // Auto build file metadata
      const blob = new Blob([new Uint8Array(52428800)], { type: 'video/mp4' });
      const f: ShareableFile = {
        id: 'scanned-sim-' + Math.random().toString(36).substring(4),
        name: 'cinematics.mp4',
        size: 52428800,
        type: 'video/mp4',
        dataUrl: URL.createObjectURL(blob),
        blob: blob
      };
      setResolvedFiles([f]);
      setTargetFileCount(1);
      setTargetFileName('cinematics.mp4');
      setTotalBytes(52428800);
      
      startTransferProcess(52428800, 'cinematics.mp4', 1, [f]);
    }, 2500);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Dynamic Receiver Inputs */}
      {!isTransferring && !success ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Scan QR Button */}
            <button
              id="start-camera-scan"
              onClick={requestCameraSimulator}
              className="flex flex-col items-center justify-center p-5 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 hover:border-indigo-400/30 rounded-2xl text-slate-100 transition-all text-center cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <QrCode className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold">Scan Shared QR</span>
              <span className="text-[10px] text-slate-500 mt-0.5 font-medium">Use native camera</span>
            </button>

            {/* Direct Link Input */}
            <button
              id="toggle-manual-input-mode"
              onClick={() => {
                const sample = `http://192.168.43.1:3000/download?files=2&bytes=104857600&fileName=${encodeURIComponent('source_code.zip')}`;
                setManualUrl(sample);
              }}
              className="flex flex-col items-center justify-center p-5 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 hover:border-emerald-400/30 rounded-2xl text-slate-100 transition-all text-center cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Keyboard className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold">Inject Mock Link</span>
              <span className="text-[10px] text-slate-500 mt-0.5 font-medium">Auto-fetch demo file</span>
            </button>
          </div>

          {/* Camera Scanning Dialog Simulation */}
          {showScanner && (
            <div className="bg-slate-950 border border-indigo-500/30 p-5 rounded-2xl text-center flex flex-col items-center gap-3 animate-pulse">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Accessing P2P Core Camera</p>
                <p className="text-[10px] text-slate-400 mt-1">Simulating peer-to-peer visual hotspot detection...</p>
              </div>
            </div>
          )}

          {/* Manual URL Form */}
          <form onSubmit={handleManualConnect} className="bg-slate-950 border border-slate-900 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Enter Direct Hotspot Link
            </h4>
            <div className="flex gap-2">
              <input
                id="manual-url-receiver-input"
                type="text"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="http://192.168.43.1:3000/download?q=..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                id="submit-manual-receiver-btn"
                type="submit"
                className="bg-indigo-500 hover:bg-indigo-600 px-3.5 rounded-xl text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Fetch</span>
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Active Transfer Progress Panel */}
      {isTransferring && (
        <div className="bg-slate-950 border border-slate-900 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
          {/* subtle line glow */}
          <div className="absolute top-0 inset-x-0 h-1 bg-indigo-500 animate-pulse" />

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs">
                <RefreshCw className="w-4 h-4 animate-spin" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Reconfiguring Stream</h4>
                <p className="text-[10px] text-slate-500 truncate max-w-[170px] font-mono">{targetFileName}</p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs font-bold text-slate-400">{progress}%</p>
              <div className="flex items-center gap-1 text-[10px] text-slate-500 justify-end">
                <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span>Wi-Fi P2P</span>
              </div>
            </div>
          </div>

          {/* Progress Bar Track */}
          <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Speed & Size metrics */}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-900">
            <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-900">
              <span className="text-[10px] text-slate-500 block font-medium">Bps Speed</span>
              <div className="flex items-center gap-1 bg-transparent mt-0.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/10" />
                <span className="text-sm font-bold text-emerald-400 font-mono">{transferSpeed}</span>
              </div>
            </div>

            <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-900">
              <span className="text-[10px] text-slate-500 block font-medium">Loaded</span>
              <p className="text-xs font-bold text-slate-300 font-mono mt-1">
                {formatBytes(bytesTransferred)} <span className="text-[10px] text-slate-500">/ {formatBytes(totalBytes)}</span>
              </p>
            </div>
          </div>

          {!subscription.isPremium && (
            <div className="mt-3.5 px-3 py-1.5 bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 text-[10px] font-medium rounded-xl flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Speed capped at 8 MB/s. Upgrade to P2P Pro for up to 75 MB/s unthrottled hardware.</span>
            </div>
          )}
        </div>
      )}

      {/* Connection Complete / Save Panel */}
      {success && (
        <div className="bg-slate-950 border border-emerald-500/20 rounded-3xl p-5 text-center flex flex-col items-center animate-fade-in shadow-2xl relative">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mb-3.5">
            <CheckCircle className="w-6 h-6 animate-bounce" />
          </div>

          <h3 className="text-sm font-bold text-white">Share Session Decoupled Successfully</h3>
          <p className="text-[11px] text-slate-400 mt-1 max-w-[210px]">
            The files are securely saved in memory buffer of this native client shell.
          </p>

          <div className="mt-4 px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl w-full text-left">
            <p className="text-[11px] font-bold text-slate-300 truncate max-w-[230px] font-mono select-all">
              {targetFileName} {targetFileCount > 1 ? `and ${targetFileCount - 1} other files` : ''}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Total Payload: {formatBytes(totalBytes)}</p>
          </div>

          <div className="flex gap-2 w-full mt-5">
            <button
              id="receiver-reset-btn"
              onClick={resetAll}
              className="flex-1 py-3 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Transfer Again
            </button>

            <button
              id="receiver-save-to-disk-btn"
              onClick={saveFilesToBrowser}
              className="flex-1 py-3 px-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/15 cursor-pointer"
            >
              <FileDown className="w-4 h-4 fill-slate-950/20" />
              <span>Save Files</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
