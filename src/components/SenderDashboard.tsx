/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Upload, FileText, Film, Image as ImageIcon, File, 
  Trash2, Play, CircleAlert, Sparkles, CheckCircle2 
} from 'lucide-react';
import { ShareableFile, SubscriptionState } from '../types';
import QRCodeDisplay from './QRCodeDisplay';

interface SenderDashboardProps {
  subscription: SubscriptionState;
  onOpenPremium: () => void;
  ipAddress: string;
  port: number;
  onShareComplete: (files: ShareableFile[], speed: string) => void;
  onTriggerSelfReceive: (url: string, files: ShareableFile[]) => void;
}

export default function SenderDashboard({
  subscription,
  onOpenPremium,
  ipAddress,
  port,
  onShareComplete,
  onTriggerSelfReceive,
}: SenderDashboardProps) {
  const [selectedFiles, setSelectedFiles] = useState<ShareableFile[]>([]);
  const [isHosting, setIsHosting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isThrottled, setIsThrottled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper to format byte sizes
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Select file icon based on mime type
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-emerald-400" />;
    if (type.startsWith('video/')) return <Film className="w-5 h-5 text-indigo-400" />;
    if (type.startsWith('text/') || type.includes('pdf')) return <FileText className="w-5 h-5 text-blue-400" />;
    return <File className="w-5 h-5 text-slate-400" />;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFiles(Array.from(e.target.files));
    }
  };

  const processSelectedFiles = (files: File[]) => {
    const isMultiSelect = files.length > 1;

    // Gatekeeper: If batch/multi selection and user does not have Pro subscription, block additional files.
    if (isMultiSelect && !subscription.isPremium) {
      onOpenPremium();
      // Only keep the first file as free tier fallback
      const singleFile = files[0];
      const pFile: ShareableFile = {
        id: Math.random().toString(36).substring(7),
        name: singleFile.name,
        size: singleFile.size,
        type: singleFile.type,
        dataUrl: URL.createObjectURL(singleFile),
        blob: singleFile,
      };
      setSelectedFiles([pFile]);
      return;
    }

    const processed = files.map((file) => {
      const pFile: ShareableFile = {
        id: Math.random().toString(36).substring(7),
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: URL.createObjectURL(file),
        blob: file,
      };
      return pFile;
    });

    setSelectedFiles((prev) => {
      const merged = [...prev, ...processed];
      if (merged.length > 1 && !subscription.isPremium) {
        onOpenPremium();
        return [merged[0]]; // restrict to single file
      }
      return merged;
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((file) => file.id !== id));
    if (selectedFiles.length <= 1) {
      setIsHosting(false);
    }
  };

  // Generate local Wi-Fi download link encoding metadata
  const totalBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);
  const queryParam = encodeURIComponent(selectedFiles.length > 0 ? selectedFiles[0].name : '');
  const downloadUrl = `http://${ipAddress}:${port}/download?files=${selectedFiles.length}&bytes=${totalBytes}&fileName=${queryParam}&hostId=${Math.random().toString(36).substring(7)}`;

  const triggerHostServer = () => {
    if (selectedFiles.length === 0) return;
    setIsHosting(true);
    // Log the file offer in history logs
    const mockSpeed = subscription.isPremium ? '64.8 MB/s' : '4.2 MB/s';
    onShareComplete(selectedFiles, mockSpeed);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* File Drop/Pick Hub */}
      {!isHosting ? (
        <div 
          id="file-drop-zone"
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer min-h-[170px] transition-all relative ${
            dragActive 
              ? 'border-emerald-400 bg-emerald-500/10' 
              : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-900/40'
          }`}
        >
          <input
            id="file-input-element"
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            className="hidden"
          />

          <div className="w-11 h-11 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-400 mb-3 group-hover:text-white transition-all">
            <Upload className="w-5 h-5" />
          </div>

          <p className="text-sm font-semibold text-slate-200">
            {dragActive ? 'Drop files immediately' : 'Select items to transfer'}
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
            Supports photos, recordings, documents & local media files
          </p>

          {!subscription.isPremium && (
            <div className="mt-3 flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 rounded-full text-[10px] font-bold">
              <Sparkles className="w-3 h-3 text-yellow-400 animate-spin" />
              <span>Multi-File requires P2P Pro</span>
            </div>
          )}
        </div>
      ) : null}

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isHosting ? 'Hosting Broadcast' : 'Queue Items'} ({selectedFiles.length})
            </h4>
            {!isHosting && (
              <button
                id="clear-queue-btn"
                onClick={() => setSelectedFiles([])}
                className="text-[11px] font-semibold text-red-500 hover:text-red-400 flex items-center gap-0.5"
              >
                Clear
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
            {selectedFiles.map((file) => (
              <div 
                key={file.id} 
                className="flex items-center justify-between gap-3 bg-slate-900/60 border border-slate-900/80 px-3 py-2 rounded-xl"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center border border-slate-800 shrink-0">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-semibold text-slate-200 truncate select-all">{file.name}</p>
                    <p className="text-[10px] text-slate-500">{formatBytes(file.size)}</p>
                  </div>
                </div>
                {!isHosting && (
                  <button
                    id={`remove-file-btn-${file.id}`}
                    onClick={() => removeFile(file.id)}
                    className="p-1 px-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {!isHosting && (
            <div className="mt-4">
              <button
                id="start-hosting-btn"
                onClick={triggerHostServer}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 font-bold text-sm text-slate-950 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/15"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Initialize Offline Stream</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Share Screen & Host Active QR Control */}
      {isHosting && selectedFiles.length > 0 && (
        <div className="flex flex-col gap-4 animate-fade-in">
          {/* Status Alert Banner */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
            <span>Local Server Active on Device Port!</span>
          </div>

          <QRCodeDisplay value={downloadUrl} />

          {/* Peer Simulation Quick Hook */}
          <div className="bg-slate-950 border border-slate-900 p-4 rounded-2xl flex flex-col items-center text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Simulation Playground</p>
            <p className="text-[11px] text-slate-400 max-w-[270px] mb-3">
              Want to see what an offline receiver device will experience right now in this browser?
            </p>
            <button
              id="simulate-receiver-scan-btn"
              onClick={() => onTriggerSelfReceive(downloadUrl, selectedFiles)}
              className="w-full py-2.5 px-4 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl tracking-wide shadow-md shadow-indigo-500/10 transition-all cursor-pointer"
            >
              Simulate Peer Scan (Download Content)
            </button>
          </div>

          <button
            id="stop-hosting-stream-btn"
            onClick={() => {
              setIsHosting(false);
              setSelectedFiles([]);
            }}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 font-bold text-xs text-slate-300 rounded-xl transition-all cursor-pointer"
          >
            Stop Broadcast & Reset Queue
          </button>
        </div>
      )}
    </div>
  );
}
