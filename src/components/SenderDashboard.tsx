/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, FileText, Film, Music, Image as ImageIcon, File, 
  Smartphone, Search, Plus, Trash2, Play, CircleAlert, 
  Sparkles, CheckCircle2, ChevronRight, Share2, Eye, Compass,
  FolderOpen, ShieldAlert, Cpu
} from 'lucide-react';
import { ShareableFile, SubscriptionState } from '../types';
import { scanCapacitorDirectory, scanWebDirectory, ExplorerFile, CATEGORY_LABELS } from '../data';
import { Directory } from '@capacitor/filesystem';
import QRCodeDisplay from './QRCodeDisplay';
import FilePreviewModal from './FilePreviewModal';

interface SenderDashboardProps {
  subscription: SubscriptionState;
  onOpenPremium: () => void;
  ipAddress: string;
  port: number;
  onShareComplete: (files: ShareableFile[], speed: string) => void;
  onTriggerSelfReceive: (url: string, files: ShareableFile[]) => void;
}

type TabCategory = 'videos' | 'photos' | 'audios' | 'documents' | 'files' | 'apps';

export default function SenderDashboard({
  subscription,
  onOpenPremium,
  ipAddress,
  port,
  onShareComplete,
  onTriggerSelfReceive,
}: SenderDashboardProps) {
  // Real active explorer database state - initialized empty (zero mockups)
  const [explorerRepo, setExplorerRepo] = useState<ExplorerFile[]>([]);
  const [activeCategory, setActiveCategory] = useState<TabCategory>('videos');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Storage for multi-select file list
  const [selectedQueue, setSelectedQueue] = useState<ExplorerFile[]>([]);
  const [isHosting, setIsHosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Permission-status checking state ('prompt' | 'granted' | 'denied')
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>(() => {
    const saved = localStorage.getItem('native_storage_permission');
    return (saved === 'granted') ? 'granted' : 'prompt';
  });

  const [scanning, setScanning] = useState(false);

  // States for file preview overlays
  const [selectedPreviewFile, setSelectedPreviewFile] = useState<ExplorerFile | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Auto-scan on mount if permissions were granted formerly
  useEffect(() => {
    if (permissionStatus === 'granted') {
      triggerSilentScans();
    }
  }, [permissionStatus]);

  // Silent automatic scanning loop
  const triggerSilentScans = async () => {
    setScanning(true);
    try {
      // 1. Check native capacitor storage reads
      if (typeof window !== 'undefined' && (window as any).Capacitor) {
        // Scan Documents and Cache native directories recursively
        const docs = await scanCapacitorDirectory('', Directory.Documents);
        const caches = await scanCapacitorDirectory('', Directory.Cache);
        if (docs.length > 0 || caches.length > 0) {
          setExplorerRepo([...docs, ...caches]);
          setScanning(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Native Capacitor Scanner bypassed/not loaded.', e);
    }
    setScanning(false);
  };

  // Grant access click handler (Triggers official system/API files scan consent)
  const handleRequestPermissionsAndScan = async () => {
    try {
      // 1. Check Native Capacitor permissions if on native client shell
      if (typeof window !== 'undefined' && (window as any).Capacitor) {
        const { Filesystem } = await import('@capacitor/filesystem');
        const status = await Filesystem.requestPermissions();
        if (status.publicStorage === 'granted') {
          setPermissionStatus('granted');
          localStorage.setItem('native_storage_permission', 'granted');
          triggerSilentScans();
          return;
        }
      }
    } catch (e) {
      console.warn('Filesystem request permissions failed, standardizing to Web API fallback', e);
    }

    // 2. High fidelity Web API folder scanner (File System Access Directory Picker)
    try {
      if ('showDirectoryPicker' in window) {
        setScanning(true);
        const dirHandle = await (window as any).showDirectoryPicker({
          mode: 'read'
        });
        const scannedFiles = await scanWebDirectory(dirHandle);
        setExplorerRepo(scannedFiles);
        setPermissionStatus('granted');
        localStorage.setItem('native_storage_permission', 'granted');
      } else {
        triggerBackupPicker();
      }
    } catch (err: any) {
      console.warn('Directory Picker exception, standardizing web-directory input', err);
      if (err.name !== 'AbortError') {
        triggerBackupPicker();
      }
    } finally {
      setScanning(false);
    }
  };

  // Manual fallback clicker
  const triggerBackupPicker = () => {
    const input = document.getElementById('native-directory-fallback') as HTMLInputElement | null;
    if (input) {
      input.click();
    }
  };

  // Web directories webkit directory selection fallback change
  const handleBackupFolderSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setScanning(true);
      const fileList = Array.from(e.target.files);
      const scanned: ExplorerFile[] = fileList.map((file: any) => {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        let category: TabCategory = 'files';
        
        if (['mp4', 'mkv', 'avi', 'mov', '3gp', 'webm'].includes(ext)) category = 'videos';
        else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) category = 'photos';
        else if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) category = 'audios';
        else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'ts', 'js', 'json'].includes(ext)) {
          category = 'documents';
        } else if (ext === 'apk') {
          category = 'apps';
        }

        return {
          id: `web-back-${Math.random().toString(36).substring(4)}`,
          name: file.name,
          size: file.size,
          category,
          detail: file.type || 'Local Native File',
          extension: ext,
          senderBlobUrl: URL.createObjectURL(file),
        };
      });

      setExplorerRepo(scanned);
      setPermissionStatus('granted');
      localStorage.setItem('native_storage_permission', 'granted');
      setScanning(false);
    }
  };

  // Convert raw queue items into the share state schema required by our receiver
  const getMappedSelectedFiles = (): ShareableFile[] => {
    return selectedQueue.map(item => ({
      id: item.id,
      name: item.name,
      size: item.size,
      type: getMockMimeFromExtension(item.extension),
      dataUrl: item.senderBlobUrl || undefined,
    }));
  };

  const getMockMimeFromExtension = (ext: string): string => {
    switch (ext.toLowerCase()) {
      case 'mp4': return 'video/mp4';
      case 'png': return 'image/png';
      case 'jpg': return 'image/jpeg';
      case 'wav': return 'audio/wav';
      case 'mp3': return 'audio/mp3';
      case 'pdf': return 'application/pdf';
      case 'apk': return 'application/vnd.android.package-archive';
      default: return 'application/octet-stream';
    }
  };

  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const toggleSelectFile = (file: ExplorerFile, e?: React.MouseEvent) => {
    if (e) {
      const target = e.target as HTMLElement;
      if (target.closest('.preview-action-btn')) return;
    }

    const isAlreadySelected = selectedQueue.some(item => item.id === file.id);
    if (isAlreadySelected) {
      setSelectedQueue(prev => prev.filter(item => item.id !== file.id));
    } else {
      if (selectedQueue.length >= 1 && !subscription.isPremium) {
        onOpenPremium();
        return;
      }
      setSelectedQueue(prev => [...prev, file]);
    }
  };

  // Adds single manual devices file
  const handleDeviceAddFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const liveFiles = Array.from(e.target.files);
      const newItems: ExplorerFile[] = liveFiles.map((f: File) => {
        const fileType = f.type;
        let fileCategory: TabCategory = 'files';
        
        if (fileType.startsWith('image/')) fileCategory = 'photos';
        else if (fileType.startsWith('video/')) fileCategory = 'videos';
        else if (fileType.startsWith('audio/')) fileCategory = 'audios';
        else if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('sheet') || fileType.includes('excel')) {
          fileCategory = 'documents';
        }

        const ext = f.name.split('.').pop() || 'bin';
        return {
          id: 'user-' + Math.random().toString(36).substring(5),
          name: f.name,
          size: f.size,
          category: fileCategory,
          detail: 'Direct File Upload',
          extension: ext,
          senderBlobUrl: URL.createObjectURL(f),
        };
      });

      if (newItems.length > 1 && !subscription.isPremium) {
        onOpenPremium();
        setExplorerRepo(prev => [newItems[0], ...prev]);
        setSelectedQueue(prev => [newItems[0], ...prev]);
      } else {
        setExplorerRepo(prev => [...newItems, ...prev]);
        setSelectedQueue(prev => [...newItems, ...prev]);
      }
    }
  };

  const getTabIcon = (cat: TabCategory, isActive: boolean) => {
    const cl = isActive ? 'text-slate-950' : 'text-slate-400';
    switch (cat) {
      case 'videos': return <Film className={`w-4 h-4 ${cl}`} />;
      case 'photos': return <ImageIcon className={`w-4 h-4 ${cl}`} />;
      case 'audios': return <Music className={`w-4 h-4 ${cl}`} />;
      case 'documents': return <FileText className={`w-4 h-4 ${cl}`} />;
      case 'files': return <File className={`w-4 h-4 ${cl}`} />;
      case 'apps': return <Smartphone className={`w-4 h-4 ${cl}`} />;
    }
  };

  const categoryKeys: TabCategory[] = ['videos', 'photos', 'audios', 'documents', 'files', 'apps'];

  const filteredFiles = explorerRepo.filter(f => {
    const belongsToTab = f.category === activeCategory;
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    return belongsToTab && matchesSearch;
  });

  const totalBytes = selectedQueue.reduce((acc, f) => acc + f.size, 0);
  const queryParam = encodeURIComponent(selectedQueue.length > 0 ? selectedQueue[0].name : '');
  const downloadUrl = `http://${ipAddress}:${port}/download?files=${selectedQueue.length}&bytes=${totalBytes}&fileName=${queryParam}`;

  const handleInitializeServer = () => {
    if (selectedQueue.length === 0) return;
    setIsHosting(true);
    const mockSpeed = subscription.isPremium ? '64.8 MB/s' : '4.2 MB/s';
    onShareComplete(getMappedSelectedFiles(), mockSpeed);
  };

  const handleUpdateFile = (updated: ExplorerFile) => {
    setExplorerRepo((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    setSelectedQueue((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    if (selectedPreviewFile?.id === updated.id) {
       setSelectedPreviewFile(updated);
    }
  };

  const triggerPreview = (file: ExplorerFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPreviewFile(file);
    setIsPreviewOpen(true);
  };

  const renderItemThumbnail = (file: ExplorerFile, isSelected: boolean) => {
    const sizeCl = "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden relative";
    const bgCl = isSelected 
      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
      : 'bg-slate-950 text-slate-400 border-slate-900';

    if (file.category === 'photos') {
      if (file.senderBlobUrl) {
        return (
          <div className={sizeCl}>
            <img src={file.senderBlobUrl} alt="" className="w-full h-full object-cover" />
          </div>
        );
      }
      return (
        <div className={`${sizeCl} ${bgCl}`}>
          <ImageIcon className="w-4 h-4 text-emerald-400" />
        </div>
      );
    }

    if (file.category === 'audios') {
      return (
        <div className={`${sizeCl} ${bgCl} bg-gradient-to-br from-purple-950/60 to-indigo-950/50`}>
          <Music className="w-4 h-4 text-purple-400" />
        </div>
      );
    }

    if (file.category === 'videos') {
      return (
        <div className={`${sizeCl} ${bgCl} bg-gradient-to-r from-teal-950/40 via-slate-950 to-slate-950`}>
          <Film className="w-4 h-4 text-emerald-500" />
          <Play className="w-2.5 h-2.5 absolute top-1 right-1 fill-emerald-550 text-emerald-500" />
        </div>
      );
    }

    if (file.category === 'documents') {
      return (
        <div className={`${sizeCl} border border-slate-900 bg-slate-950 flex flex-col justify-center p-1`}>
          <FileText className="w-4 h-4 text-orange-400 mx-auto" />
        </div>
      );
    }

    if (file.category === 'apps') {
      const initials = file.name.substring(0, 2).toUpperCase();
      return (
        <div className={`${sizeCl} bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex flex-col items-center justify-center`}>
          <span className="text-[10px] font-black tracking-wide">{initials}</span>
          <span className="absolute bottom-0 text-[5px] font-mono text-emerald-300 font-bold bg-emerald-950/80 w-full text-center">APK</span>
        </div>
      );
    }

    return (
      <div className={`${sizeCl} ${bgCl}`}>
        <File className="w-4 h-4 text-slate-400" />
      </div>
    );
  };

  /* ----------------------------------------------------
     IF NO STORAGE PERMISSIONS HAVE BEEN GRANTED 
     ---------------------------------------------------- */
  if (permissionStatus !== 'granted') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 text-center animate-fade-in my-auto min-h-[350px]">
        <div className="w-16 h-16 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-3xl mx-auto mb-6 shadow-xl animate-pulse">
          🔒
        </div>
        
        <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest leading-loose">Storage Access Locked</h3>
        <p className="text-[11px] text-slate-400 mt-2.5 max-w-xs leading-relaxed font-semibold">
          Native Direct-Share requires local read authorization to search and list media packages automatic from directories.
        </p>

        {scanning ? (
          <div className="mt-8 flex flex-col items-center gap-3 w-full">
            <div className="h-1.5 w-40 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div className="h-full bg-emerald-400 animate-pulse w-2/3" />
            </div>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest animate-pulse">Indexing user directories...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 w-full max-w-xs mt-8">
            <button
              id="grant-permission-trigger-btn"
              onClick={handleRequestPermissionsAndScan}
              className="w-full py-3.5 bg-emerald-400 hover:bg-emerald-500 text-slate-950 font-black text-xs tracking-wider rounded-xl uppercase transition-all duration-150 shadow-lg shadow-emerald-400/10 cursor-pointer"
            >
              Allow File Auto-Scan
            </button>
            
            <button
              id="deny-permission-btn"
              onClick={() => setPermissionStatus('denied')}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold text-xs rounded-xl hover:text-white transition-colors cursor-pointer"
            >
              Deny
            </button>
          </div>
        )}

        {/* Hidden Fallbacks block */}
        <input
          id="native-directory-fallback"
          type="file"
          // @ts-ignore
          webkitdirectory="true"
          directory="true"
          multiple
          onChange={handleBackupFolderSelected}
          className="hidden"
        />

        <div className="mt-8 text-[10px] text-slate-600 font-bold max-w-[240px]">
          By clicking grant, you may load any custom storage folder (e.g. Pictures / Music) to sync automatically.
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------
     IF PERMISSIONS GRANTED (ACTIVE AUTO-SCANNED DB) 
     ---------------------------------------------------- */
  return (
    <div className="flex flex-col gap-4">
      
      {!isHosting ? (
        <>
          {/* Header query filtering & manual single file inclusions */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                id="xender-file-search"
                type="text"
                placeholder={`Search loaded ${CATEGORY_LABELS[activeCategory]}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all font-semibold"
              />
            </div>

            {/* Manual file injector */}
            <button
              id="trigger-native-file-picker"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-emerald-400 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 text-xs font-bold"
              title="Add File Manually"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Item</span>
            </button>
            <input
              id="real-file-native-picker-input"
              type="file"
              ref={fileInputRef}
              onChange={handleDeviceAddFile}
              multiple
              className="hidden"
            />
          </div>

          {/* Directory Categorization Tab bars */}
          <div className="w-full overflow-x-auto scrollbar-none flex gap-1.5 py-1 select-none border-b border-slate-900">
            {categoryKeys.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  id={`tab-category-btn-${cat}`}
                  onClick={() => {
                    setActiveCategory(cat);
                    setSearchQuery('');
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isActive 
                      ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-400/10' 
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-slate-950'
                  }`}
                >
                  {getTabIcon(cat, isActive)}
                  <span>{CATEGORY_LABELS[cat]}</span>
                </button>
              );
            })}
          </div>

          {/* Scanned files results viewer */}
          <div className="min-h-[220px]">
            {scanning ? (
              <div className="py-16 text-center text-slate-500 border border-dashed border-slate-900 rounded-3xl flex flex-col items-center justify-center">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 animate-pulse">Running Recursive Scan...</p>
                <p className="text-[10px] text-slate-600 mt-2">Checking on-device media files metadata registers</p>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="py-12 text-center text-slate-500 border border-dashed border-slate-900/80 rounded-3xl flex flex-col items-center justify-center">
                <FolderOpen className="w-10 h-10 text-slate-800 mb-2" />
                <p className="text-xs font-bold text-slate-350">No {CATEGORY_LABELS[activeCategory]} located inside this directory</p>
                <button
                  onClick={handleRequestPermissionsAndScan}
                  className="mt-3.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-[10px] uppercase font-black tracking-widest text-emerald-400 rounded-lg border border-slate-800"
                >
                  Reload/Scan Folder
                </button>
              </div>
            ) : activeCategory === 'photos' ? (
              /* Photo Grid Core View */
              <div key="photos-grid" className="grid grid-cols-3 gap-2">
                {filteredFiles.map((file) => {
                  const isSelected = selectedQueue.some(item => item.id === file.id);
                  return (
                    <div
                      key={file.id}
                      id={`file-card-${file.id}`}
                      onClick={(e) => toggleSelectFile(file, e)}
                      className={`relative aspect-square rounded-xl border overflow-hidden cursor-pointer group transition-all ${
                        isSelected 
                          ? 'border-emerald-400 scale-[0.98]' 
                          : 'border-slate-900 hover:border-slate-800'
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 to-transparent z-10" />
                      
                      {/* Thumbnail frame */}
                      <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
                        {file.senderBlobUrl ? (
                          <img src={file.senderBlobUrl} alt="" className="w-full h-full object-cover rounded" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-slate-800" />
                        )}
                      </div>

                      {/* Photo Overlays */}
                      <div className="absolute bottom-2 inset-x-2 z-20">
                        <p className="text-[9px] font-black text-white truncate">{file.name}</p>
                        <p className="text-[8px] text-slate-400 mt-0.5">{formatBytes(file.size)}</p>
                      </div>

                      {/* Immersive Trigger Eye btn */}
                      <button
                        onClick={(e) => triggerPreview(file, e)}
                        className="preview-action-btn absolute top-2 left-2 p-1.5 bg-black/60 hover:bg-emerald-400 hover:text-slate-950 rounded-lg text-slate-100 transition-all z-20"
                        title="Cinematic fullscreen preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Select check overlay badge */}
                      <div className={`absolute top-2 right-2 w-4 h-4 rounded-full border flex items-center justify-center transition-all z-20 ${
                        isSelected 
                          ? 'bg-emerald-400 border-emerald-400 text-slate-950 animate-bounce' 
                          : 'bg-black/40 border-slate-500 text-transparent'
                      }`}>
                        <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Audios/Videos/Docs/Files Lists */
              <div key="explorer-list" className="space-y-1.5">
                {filteredFiles.map((file) => {
                  const isSelected = selectedQueue.some(item => item.id === file.id);
                  return (
                    <div
                      key={file.id}
                      id={`file-row-${file.id}`}
                      onClick={(e) => toggleSelectFile(file, e)}
                      className={`flex items-center justify-between gap-3 bg-slate-900/40 hover:bg-slate-900 border p-3 rounded-2xl cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-emerald-500 bg-emerald-500/5' 
                          : 'border-slate-950 hover:border-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        {renderItemThumbnail(file, isSelected)}
                        
                        <div className="truncate text-left">
                          <p className={`text-xs font-bold truncate ${isSelected ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {file.name}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold mt-0.5 font-mono">
                            <span>{formatBytes(file.size)}</span>
                            <span className="text-slate-800">•</span>
                            <span>{file.detail}</span>
                          </div>
                        </div>
                      </div>

                      {/* Operations deck */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <button
                          onClick={(e) => triggerPreview(file, e)}
                          className="preview-action-btn p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-850 rounded-xl text-slate-400 hover:text-emerald-400 transition-colors"
                          title="Open fullscreen player"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                          isSelected 
                            ? 'bg-emerald-400 border-emerald-400 text-slate-950' 
                            : 'bg-transparent border-slate-850'
                        }`}>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-slate-950 fill-transparent" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Send Floating queues bottom deck (Standard Xender approach) */}
          {selectedQueue.length > 0 && (
            <div className="sticky bottom-2 inset-x-0 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-3 rounded-2xl flex items-center justify-between gap-4 shadow-2xl animate-fade-in z-30">
              <div className="truncate text-left">
                <p className="text-xs font-black text-white">
                  Share queue: <span className="text-emerald-400">{selectedQueue.length} items</span>
                </p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Bytes: {formatBytes(totalBytes)}</p>
              </div>

              <div className="flex gap-2">
                <button
                  id="clear-select-queue"
                  onClick={() => setSelectedQueue([])}
                  className="px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 text-xs font-bold transition-all"
                >
                  Clear
                </button>
                <button
                  id="xender-trigger-send-btn"
                  onClick={handleInitializeServer}
                  className="px-4 py-2.5 bg-emerald-400 hover:bg-emerald-500 text-slate-950 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-400/20 active:translate-y-[1px]"
                >
                  <span>Build P2P Stream</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Host Serving Broadcast block */
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-3 rounded-2xl flex items-center gap-2.5 text-emerald-400 text-xs font-semibold shadow-inner">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-left">
              <p className="font-black text-[12px]">P2P Hotspot Connection Active</p>
              <p className="text-[11px] text-slate-400 font-medium">Other device must scan link or parse connection QR block</p>
            </div>
          </div>

          <QRCodeDisplay value={downloadUrl} />

          {/* Hosting queue items board list */}
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 text-left">
              Broadcasting Items queue ({selectedQueue.length})
            </h4>
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
              {selectedQueue.map((file) => (
                <div key={file.id} className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-xl border border-slate-900/80">
                  <span className="text-xs font-bold text-slate-300 truncate max-w-[210px]">{file.name}</span>
                  <span className="text-[10px] font-mono text-slate-500">{formatBytes(file.size)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick peer emulation launcher deck */}
          <div className="bg-slate-950 border border-slate-900 p-4 rounded-2xl flex flex-col items-center text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Simulation Playground</p>
            <p className="text-[10px] text-slate-400 max-w-[270px] mb-3 leading-relaxed">
              Want to see what an offline receiver device will experience on their own native hardware client right now?
            </p>
            <button
              id="simulate-receiver-scan-btn"
              onClick={() => onTriggerSelfReceive(downloadUrl, getMappedSelectedFiles())}
              className="w-full py-3 px-4 bg-indigo-500 hover:bg-slate-800 text-white hover:text-indigo-400 hover:border-indigo-500/30 font-bold text-xs rounded-xl tracking-wide shadow-md shadow-indigo-500/10 border border-indigo-500/20 active:translate-y-[1px] transition-all cursor-pointer"
            >
              Simulate Peer Scan (Download Content)
            </button>
          </div>

          <button
            id="stop-hosting-stream-btn"
            onClick={() => {
              setIsHosting(false);
              setSelectedQueue([]);
            }}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 font-bold text-xs text-slate-300 rounded-xl transition-all cursor-pointer"
          >
            Cancel Broadcast & Reset
          </button>
        </div>
      )}

      {/* Embedded Immersive High Fidelity Fullscreen File Preview Overlay */}
      {selectedPreviewFile && (
        <FilePreviewModal
          file={selectedPreviewFile}
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setSelectedPreviewFile(null);
          }}
          onUpdateFile={handleUpdateFile}
        />
      )}
    </div>
  );
}
