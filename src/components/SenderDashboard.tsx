/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, FileText, Film, Music, Image as ImageIcon, File, 
  Smartphone, Search, Plus, Trash2, Play, CircleAlert, 
  Sparkles, CheckCircle2, ChevronRight, Share2, Eye, Compass
} from 'lucide-react';
import { ShareableFile, SubscriptionState } from '../types';
import { populatePersonalizedRepository, ExplorerFile, CATEGORY_LABELS } from '../data';
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
  // Real active explorer database state - populated with raw mock items
  const [explorerRepo, setExplorerRepo] = useState<ExplorerFile[]>([]);
  const [activeCategory, setActiveCategory] = useState<TabCategory>('videos');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Storage for multi-select file list
  const [selectedQueue, setSelectedQueue] = useState<ExplorerFile[]>([]);
  const [isHosting, setIsHosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // States for file preview overlays
  const [selectedPreviewFile, setSelectedPreviewFile] = useState<ExplorerFile | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Initialize the list using the premium local populator on mount
  useEffect(() => {
    const initializedFiles = populatePersonalizedRepository('Local Native App', ipAddress, port);
    setExplorerRepo(initializedFiles);
  }, [ipAddress, port]);

  // Auto-sync real selected files into the queue format required by the parent app
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
      case 'mp4':
      case 'mov':
        return 'video/mp4';
      case 'png':
      case 'jpg':
      case 'raw':
        return 'image/png';
      case 'mp3':
      case 'wav':
      case 'flac':
      case 'aac':
        return 'audio/wav';
      case 'pdf':
        return 'application/pdf';
      case 'xlsx':
      case 'docx':
        return 'application/msword';
      case 'apk':
        return 'application/vnd.android.package-archive';
      default:
        return 'application/octet-stream';
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

  // Toggle item in selection queue
  const toggleSelectFile = (file: ExplorerFile, e?: React.MouseEvent) => {
    if (e) {
      // Prevent double triggers if clicking on direct preview eye button
      const target = e.target as HTMLElement;
      if (target.closest('.preview-action-btn')) {
        return;
      }
    }

    const isAlreadySelected = selectedQueue.some(item => item.id === file.id);
    
    if (isAlreadySelected) {
      setSelectedQueue(prev => prev.filter(item => item.id !== file.id));
    } else {
      // Premium feature gatekeeping validation
      if (selectedQueue.length >= 1 && !subscription.isPremium) {
        onOpenPremium();
        return;
      }
      setSelectedQueue(prev => [...prev, file]);
    }
  };

  // Let core app load user uploaded device file dynamically
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
          detail: 'Uploaded Device File',
          extension: ext,
          senderBlobUrl: URL.createObjectURL(f),
        };
      });

      // Gate check if multiple folders/files addition attempted on free mode
      if (newItems.length > 1 && !subscription.isPremium) {
        onOpenPremium();
        // Fallback to push first item
        setExplorerRepo(prev => [newItems[0], ...prev]);
        setSelectedQueue(prev => {
          if (prev.length === 0) return [newItems[0]];
          return prev;
        });
      } else {
        setExplorerRepo(prev => [...newItems, ...prev]);
        // Auto-select files in queue
        setSelectedQueue(prev => {
          const combined = [...prev, ...newItems];
          if (combined.length > 1 && !subscription.isPremium) {
            onOpenPremium();
            return [combined[0]];
          }
          return combined;
        });
      }

      // Reset picker
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Category Icon Generator
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

  // Categories rendering list
  const categoryKeys: TabCategory[] = ['videos', 'photos', 'audios', 'documents', 'files', 'apps'];

  // Query engine
  const filteredFiles = explorerRepo.filter(f => {
    const belongsToTab = f.category === activeCategory;
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    return belongsToTab && matchesSearch;
  });

  const totalBytes = selectedQueue.reduce((acc, f) => acc + f.size, 0);
  const queryParam = encodeURIComponent(selectedQueue.length > 0 ? selectedQueue[0].name : '');
  const downloadUrl = `http://${ipAddress}:${port}/download?files=${selectedQueue.length}&bytes=${totalBytes}&fileName=${queryParam}&hostId=${Math.random().toString(36).substring(7)}`;

  const handleInitializeServer = () => {
    if (selectedQueue.length === 0) return;
    setIsHosting(true);
    const mockSpeed = subscription.isPremium ? '64.8 MB/s' : '4.2 MB/s';
    onShareComplete(getMappedSelectedFiles(), mockSpeed);
  };

  // Handle updates to edited documents
  const handleUpdateFile = (updated: ExplorerFile) => {
    setExplorerRepo((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    setSelectedQueue((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    if (selectedPreviewFile?.id === updated.id) {
       setSelectedPreviewFile(updated);
    }
  };

  // Helper to open the full visual preview player custom analyzer popover
  const triggerPreview = (file: ExplorerFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPreviewFile(file);
    setIsPreviewOpen(true);
  };

  // Render Category Specific Thumbs
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
        <div className={`${sizeCl} ${bgCl} bg-gradient-to-br from-purple-950 to-indigo-950`}>
          <Music className="w-4 h-4 text-purple-400" />
          {/* subtle mini visualizer bar indicator overlay */}
          <span className="absolute bottom-0 text-[6px] font-extrabold uppercase bg-purple-900/60 px-1 py-0.2 rounded text-white tracking-widest scale-75">WAV</span>
        </div>
      );
    }

    if (file.category === 'videos') {
      return (
        <div className={`${sizeCl} ${bgCl} bg-gradient-to-r from-teal-950 via-slate-950 to-slate-950`}>
          <Film className="w-4 h-4 text-emerald-400 animate-pulse" />
          <Play className="w-2.5 h-2.5 absolute top-1 right-1 fill-emerald-400 text-emerald-400" />
        </div>
      );
    }

    if (file.category === 'documents') {
      const extStr = file.extension.substring(0, 3).toUpperCase();
      return (
        <div className={`${sizeCl} border border-slate-800 bg-slate-950 flex flex-col justify-between p-1`}>
          <FileText className="w-3.5 h-3.5 text-orange-400 mx-auto" />
          <span className="text-[6px] text-center font-bold bg-slate-900 border border-slate-800 text-orange-300 rounded block w-full uppercase py-0.2">{extStr}</span>
        </div>
      );
    }

    if (file.category === 'apps') {
      // dynamic initials for APK names
      const initials = file.name.substring(0, 2).toUpperCase();
      return (
        <div className={`${sizeCl} bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex flex-col items-center justify-center`}>
          <span className="text-[9px] font-black tracking-wide">{initials}</span>
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

  return (
    <div className="flex flex-col gap-4">
      
      {!isHosting ? (
        <>
          {/* Modern Header Search & Direct Action */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                id="xender-file-search"
                type="text"
                placeholder={`Search ${CATEGORY_LABELS[activeCategory]}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all font-medium"
              />
            </div>

            {/* Custom file adder */}
            <button
              id="trigger-native-file-picker"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-emerald-400 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 text-xs font-bold"
              title="Add Real File"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Real</span>
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

          {/* horizontal scrolling Tabs Bar */}
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
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
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

          {/* Files List/Grid presentation depending on selected category */}
          <div className="min-h-[220px]">
            {filteredFiles.length === 0 ? (
              <div className="py-12 text-center text-slate-500 border border-dashed border-slate-900 rounded-2xl flex flex-col items-center justify-center">
                <p className="text-xs font-medium">No {CATEGORY_LABELS[activeCategory]} located on this directory</p>
                <p className="text-[10px] text-slate-600 mt-1">Tap 'Add Real' to select directly from your local hardware storage</p>
              </div>
            ) : activeCategory === 'photos' ? (
              /* Photo Grid Representation */
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
                      
                      {/* Photo Thumbnail */}
                      <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
                        {file.senderBlobUrl ? (
                          <img src={file.senderBlobUrl} alt="" className="w-full h-full object-cover rounded" />
                        ) : (
                          <ImageIcon className={`w-8 h-8 ${isSelected ? 'text-emerald-400' : 'text-slate-700'}`} />
                        )}
                      </div>

                      {/* File Info */}
                      <div className="absolute bottom-2 inset-x-2 z-20">
                        <p className="text-[9px] font-bold text-white truncate">{file.name}</p>
                        <p className="text-[8px] text-slate-400 mt-0.5">{formatBytes(file.size)}</p>
                      </div>

                      {/* Interactive Eye icon overlay for Photos */}
                      <button
                        onClick={(e) => triggerPreview(file, e)}
                        className="preview-action-btn absolute top-2 left-2 p-1 bg-black/60 hover:bg-emerald-400 hover:text-slate-950 rounded-lg text-slate-100 transition-all z-20"
                        title="Analyze File"
                      >
                        <Eye className="w-3 h-3" />
                      </button>

                      {/* Checkbox Badge */}
                      <div className={`absolute top-2 right-2 w-4 h-4 rounded-full border flex items-center justify-center transition-all z-20 ${
                        isSelected 
                          ? 'bg-emerald-400 border-emerald-400 text-slate-950' 
                          : 'bg-black/40 border-slate-500 text-transparent'
                      }`}>
                        <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Audios/Videos/Docs/Files/Apps ListView Representation */
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
                        
                        <div className="truncate">
                          <p className={`text-xs font-bold truncate ${isSelected ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {file.name}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold mt-0.5">
                            <span>{formatBytes(file.size)}</span>
                            <span className="text-slate-700">•</span>
                            <span>{file.detail}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right-aligned operations queue (Preview eye button and status checkbox) */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <button
                          onClick={(e) => triggerPreview(file, e)}
                          className="preview-action-btn p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-850 rounded-xl text-slate-400 hover:text-emerald-400 transition-colors"
                          title="Open Live Preview Analyzer"
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

          {/* Floating Actions Strip (Similar to Xender) */}
          {selectedQueue.length > 0 && (
            <div className="sticky bottom-2 inset-x-0 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-3 rounded-2xl flex items-center justify-between gap-4 shadow-2xl animate-fade-in z-30">
              <div className="truncate">
                <p className="text-xs font-black text-white">
                  Selected <span className="text-emerald-400">{selectedQueue.length} items</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Total Size: {formatBytes(totalBytes)}</p>
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
        /* Broadcast / Host Serving Display */
        <div className="flex flex-col gap-4 animate-fade-in">
          {/* Status Alert Banner */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-3 rounded-2xl flex items-center gap-2.5 text-emerald-400 text-xs font-semibold shadow-inner">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-black text-[12px]">P2P Hotspot Connection Active</p>
              <p className="text-[10px] text-slate-400 font-medium">Other device must scan or input dynamic link URL</p>
            </div>
          </div>

          <QRCodeDisplay value={downloadUrl} />

          {/* Queue in Host State */}
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
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

          {/* Peer Simulation Quick Hook */}
          <div className="bg-slate-950 border border-slate-900 p-4 rounded-2xl flex flex-col items-center text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Simulation Playground</p>
            <p className="text-[10px] text-slate-400 max-w-[270px] mb-3 leading-relaxed">
              Want to see what an offline receiver device will experience right now on their own hardware client?
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
            Stop Broadcast & Reset Client
          </button>
        </div>
      )}

      {/* Embedded High Fidelity File Preview Analyzer Lightbox */}
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
