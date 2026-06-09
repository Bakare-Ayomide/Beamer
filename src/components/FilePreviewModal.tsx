/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Play, Pause, RotateCw, ZoomIn, ZoomOut, Save, FileText, CheckCircle2,
  Sliders, Music, Film, Image as ImageIcon, Smartphone, HelpCircle, Laptop,
  Cpu, Activity, Terminal, Share2, Volume2, ShieldCheck, Download
} from 'lucide-react';
import { ExplorerFile } from '../data';

interface FilePreviewModalProps {
  file: ExplorerFile;
  isOpen: boolean;
  onClose: () => void;
  onUpdateFile: (updated: ExplorerFile) => void;
}

export default function FilePreviewModal({
  file,
  isOpen,
  onClose,
  onUpdateFile,
}: FilePreviewModalProps) {
  if (!isOpen) return null;

  // 1. Common playback states
  const [activePlay, setActivePlay] = useState(false);

  // 2. Photo adjustments (Dynamic zoom/filters)
  const [photoZoom, setPhotoZoom] = useState(1);
  const [photoRotate, setPhotoRotate] = useState(0); // 0, 90, 180, 270
  const [photoSepia, setPhotoSepia] = useState(0);
  const [photoGrayscale, setPhotoGrayscale] = useState(0);
  const [photoInvert, setPhotoInvert] = useState(0);
  const [photoHue, setPhotoHue] = useState(0);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // 3. Audio elements & states
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0.8);

  // 4. Video controls (Real User Video)
  const realVideoRef = useRef<HTMLVideoElement | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoVolume, setVideoVolume] = useState(0.8);

  // 5. Document text-editing states
  const [docContent, setDocContent] = useState(file.rawText || '');
  const [isDocSaved, setIsDocSaved] = useState(false);

  // Track state clean-up on file or mount changes
  useEffect(() => {
    setActivePlay(false);
    setPhotoZoom(1);
    setPhotoRotate(0);
    setPhotoSepia(0);
    setPhotoGrayscale(0);
    setPhotoInvert(0);
    setPhotoHue(0);
    setShowFiltersPanel(false);
    setIsDocSaved(false);

    if (file.rawText) {
      setDocContent(file.rawText);
    } else {
      setDocContent(`File: ${file.name}\nSize: ${file.size} bytes\nCategory: ${file.category}\nExtension: ${file.extension}\nDetail: ${file.detail}`);
    }
  }, [file]);

  // Clean elements on close
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (realVideoRef.current) {
        realVideoRef.current.pause();
      }
    };
  }, []);

  // 1. Audio Methods
  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (activePlay) {
      audioRef.current.pause();
      setActivePlay(false);
    } else {
      audioRef.current.play().then(() => {
        setActivePlay(true);
      }).catch(err => {
        console.warn('Audio playback access exception', err);
      });
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setAudioCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleAudioLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration || 0);
    }
  };

  const handleAudioValueSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setAudioCurrentTime(val);
    }
  };

  const handleAudioVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setAudioVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  // 2. Video Methods
  const togglePlayVideo = () => {
    if (!realVideoRef.current) return;
    if (activePlay) {
      realVideoRef.current.pause();
      setActivePlay(false);
    } else {
      realVideoRef.current.play().then(() => {
        setActivePlay(true);
      }).catch(err => {
        console.warn('Video playback block. Codecs or gestural request mismatch.', err);
      });
    }
  };

  const handleVideoTimeUpdate = () => {
    if (realVideoRef.current) {
      setVideoCurrentTime(realVideoRef.current.currentTime);
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (realVideoRef.current) {
      setVideoDuration(realVideoRef.current.duration || 0);
    }
  };

  const handleVideoValueSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (realVideoRef.current) {
      realVideoRef.current.currentTime = val;
      setVideoCurrentTime(val);
    }
  };

  const handleVideoVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVideoVolume(val);
    if (realVideoRef.current) {
      realVideoRef.current.volume = val;
    }
  };

  // 3. Document Save File
  const handleSaveDocContent = () => {
    const docBlob = new Blob([docContent], { type: 'text/plain' });
    const updatedFile: ExplorerFile = {
      ...file,
      size: docBlob.size,
      rawText: docContent,
      senderBlobUrl: URL.createObjectURL(docBlob),
    };
    onUpdateFile(updatedFile);
    setIsDocSaved(true);
    setTimeout(() => setIsDocSaved(false), 2000);
  };

  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const timeFormat = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col w-screen h-screen overflow-hidden text-slate-100 select-none animate-fade-in">
      
      {/* 1. Fullscreen Floating Top Header */}
      <header className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-50 flex items-center justify-between px-6">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-2 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/40 rounded-xl transition-all cursor-pointer text-slate-100 font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Player</span>
        </button>

        <div className="text-center max-w-[60%]">
          <h3 className="text-xs font-black truncate text-white">{file.name}</h3>
          <p className="text-[10px] font-mono text-emerald-400 font-black mt-0.5 tracking-wider uppercase">
            {formatBytes(file.size)} • Real Device Media
          </p>
        </div>

        {file.senderBlobUrl ? (
          <a
            href={file.senderBlobUrl}
            download={file.name}
            className="flex items-center gap-2 p-2.5 bg-emerald-400 hover:bg-emerald-500 rounded-xl text-slate-950 transition-all font-bold text-xs"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Save Copy</span>
          </a>
        ) : (
          <div className="w-10 h-10" />
        )}
      </header>

      {/* 2. MAIN IMMERSIVE CONTENT VIEWPORT */}
      <div className="flex-1 w-full h-full flex items-center justify-center bg-zinc-950 relative overflow-hidden">
        
        {/* PHOTO PREVIEW (CINEMATIC) */}
        {file.category === 'photos' && (
          <div className="w-full h-full flex items-center justify-center p-4 relative">
            <div className="w-full h-full flex items-center justify-center select-none">
              {file.senderBlobUrl ? (
                <img
                  src={file.senderBlobUrl}
                  alt={file.name}
                  className="max-h-[85vh] max-w-full object-contain transition-transform duration-150 shadow-2xl rounded"
                  referrerPolicy="no-referrer"
                  style={{
                    transform: `scale(${photoZoom}) rotate(${photoRotate}deg)`,
                    filter: `sepia(${photoSepia}%) grayscale(${photoGrayscale}%) invert(${photoInvert}%) hue-rotate(${photoHue}deg)`
                  }}
                />
              ) : (
                <div className="text-center p-8 text-slate-500">
                  <ImageIcon className="w-16 h-16 text-slate-700 mx-auto mb-3" />
                  <p className="text-xs font-mono">No direct photo binary pipeline</p>
                </div>
              )}
            </div>

            {/* Photo Toolbar Controls Overlay */}
            <div className="absolute bottom-6 inset-x-6 flex flex-col items-center gap-3 bg-slate-900/80 backdrop-blur-md p-4 rounded-3xl border border-slate-800 max-w-lg mx-auto z-40">
              <div className="flex items-center justify-between w-full h-8">
                <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5 uppercase tracking-widest">
                  <Sliders className="w-4 h-4" /> Realtime Filters
                </span>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setPhotoZoom(1);
                      setPhotoRotate(0);
                      setPhotoSepia(0);
                      setPhotoGrayscale(0);
                      setPhotoInvert(0);
                      setPhotoHue(0);
                    }}
                    className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-[10px] uppercase font-bold tracking-widest text-slate-400 hover:text-white rounded"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                    className="px-3 py-1 bg-emerald-450/10 text-emerald-400 text-[10px] uppercase font-black tracking-widest rounded border border-emerald-500/20"
                  >
                    {showFiltersPanel ? 'Hide Bars' : 'Adjust Look'}
                  </button>
                </div>
              </div>

              {/* Basic Zoom & Rotation Actions Always Visible */}
              <div className="flex items-center justify-between w-full gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Scale</span>
                  <button onClick={() => setPhotoZoom(Math.max(0.5, photoZoom - 0.25))} className="p-2 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 hover:text-white"><ZoomOut className="w-4 h-4" /></button>
                  <span className="font-mono text-xs w-10 text-center font-bold">{photoZoom.toFixed(2)}x</span>
                  <button onClick={() => setPhotoZoom(Math.min(4, photoZoom + 0.25))} className="p-2 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 hover:text-white"><ZoomIn className="w-4 h-4" /></button>
                </div>

                <button
                  onClick={() => setPhotoRotate((prev) => (prev + 90) % 360)}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 rounded-xl text-slate-100 font-bold text-xs flex items-center gap-2 transition-colors duration-150"
                >
                  <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Rotate 90°</span>
                </button>
              </div>

              {/* Expandable CSS filters panel */}
              {showFiltersPanel && (
                <div className="w-full space-y-3 pt-3 border-t border-slate-800 animate-slide-up">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-400 font-bold">Grayscale filter:</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={photoGrayscale}
                      onChange={(e) => setPhotoGrayscale(parseInt(e.target.value))}
                      className="w-44 accent-emerald-400 bg-slate-950"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-400 font-bold">Sepia warmth:</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={photoSepia}
                      onChange={(e) => setPhotoSepia(parseInt(e.target.value))}
                      className="w-44 accent-emerald-400 bg-slate-950"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-400 font-bold">Hue rotate spectrum:</span>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={photoHue}
                      onChange={(e) => setPhotoHue(parseInt(e.target.value))}
                      className="w-44 accent-emerald-400 bg-slate-950"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AUDIO PLAYER (CINEMATIC FULLSCREEN DECK) */}
        {file.category === 'audios' && (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 relative bg-gradient-to-b from-emerald-950/20 via-zinc-950 to-neutral-950">
            
            <div className="flex flex-col items-center max-w-sm w-full gap-8 z-10 mt-12">
              {/* Grand Rotating Vinyl Record Graphic */}
              <div className="w-56 h-56 md:w-64 md:h-64 rounded-full bg-slate-900 border-8 border-slate-800 flex items-center justify-center relative shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]">
                <div 
                  className={`w-44 h-44 md:w-52 md:h-52 rounded-full bg-emerald-500/10 border-4 border-dashed border-emerald-500/30 flex items-center justify-center ${
                    activePlay ? 'animate-spin' : ''
                  }`}
                  style={{ animationDuration: '8s' }}
                >
                  <Music className="w-20 h-20 text-emerald-400/80" />
                </div>
                {/* golden copper pin hole center pin overlay */}
                <div className="absolute w-5 h-5 bg-yellow-500 rounded-full border-2 border-slate-950 shadow-inner" />
              </div>

              {/* Title representation block */}
              <div className="text-center w-full">
                <h2 className="text-base font-black text-slate-100 truncate">{file.name}</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest font-mono mt-1">Audio Track Source • {file.detail}</p>
              </div>

              {/* Playback Progress Board */}
              <div className="w-full bg-slate-900/60 border border-slate-800 p-5 rounded-3xl flex flex-col gap-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span className="font-mono text-emerald-400">{timeFormat(audioCurrentTime)}</span>
                  <span className="font-mono text-slate-500">{timeFormat(audioDuration)}</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max={audioDuration || 1}
                  step="0.05"
                  value={audioCurrentTime}
                  onChange={handleAudioValueSeek}
                  className="w-full accent-emerald-400 bg-slate-950 rounded-lg h-1.5 cursor-pointer appearance-none outline-none border border-slate-800"
                />

                <div className="flex items-center justify-between gap-4 mt-1">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-slate-500" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={audioVolume}
                      onChange={handleAudioVolumeChange}
                      className="w-18 accent-emerald-400 h-1 bg-slate-950"
                    />
                  </div>

                  <button
                    onClick={togglePlayAudio}
                    className="px-6 py-2.5 bg-emerald-400 hover:bg-emerald-500 text-slate-950 text-xs font-black rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-400/20"
                  >
                    {activePlay ? (
                      <>
                        <Pause className="w-4 h-4 fill-slate-950 text-slate-950" />
                        <span>Pause Audio</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
                        <span>Play File</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Invisible real audio tag linking to Object URL */}
            {file.senderBlobUrl && (
              <audio
                ref={audioRef}
                src={file.senderBlobUrl}
                onTimeUpdate={handleAudioTimeUpdate}
                onLoadedMetadata={handleAudioLoadedMetadata}
                onEnded={() => setActivePlay(false)}
                className="hidden"
              />
            )}
          </div>
        )}

        {/* VIDEO PLAYER (IMMERSIVE FULLSCREEN VIDEO CORE) */}
        {file.category === 'videos' && (
          <div className="w-full h-full flex items-center justify-center bg-black relative">
            
            {file.senderBlobUrl ? (
              <video
                ref={realVideoRef}
                src={file.senderBlobUrl}
                onTimeUpdate={handleVideoTimeUpdate}
                onLoadedMetadata={handleVideoLoadedMetadata}
                onEnded={() => setActivePlay(false)}
                className="w-full h-full object-contain pointer-events-auto"
                onClick={togglePlayVideo}
              />
            ) : (
              <div className="text-center p-8 text-slate-500">
                <Film className="w-16 h-16 text-slate-800 mx-auto mb-3" />
                <p className="text-xs font-mono">No direct video source stream</p>
              </div>
            )}

            {/* Video overlay controls panel */}
            <div className="absolute bottom-6 inset-x-6 bg-gradient-to-t from-black/90 via-black/80 to-black/30 p-4 border border-slate-800/40 rounded-3xl max-w-2xl mx-auto flex flex-col gap-3.5 z-40">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-emerald-400 font-extrabold">{timeFormat(videoCurrentTime)}</span>
                <span className="font-mono text-slate-400">{timeFormat(videoDuration)}</span>
              </div>

              <input
                type="range"
                min="0"
                max={videoDuration || 1}
                step="0.05"
                value={videoCurrentTime}
                onChange={handleVideoValueSeek}
                className="w-full accent-emerald-400 bg-slate-950 border border-slate-800/80 h-1.5 rounded-lg appearance-none cursor-pointer outline-none"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-slate-500" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={videoVolume}
                    onChange={handleVideoVolumeChange}
                    className="w-20 accent-emerald-400 h-1 bg-slate-950"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={togglePlayVideo}
                    className="px-6 py-2.5 bg-emerald-400 hover:bg-emerald-500 text-slate-950 text-xs font-black rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-400/20 cursor-pointer"
                  >
                    {activePlay ? (
                      <>
                        <Pause className="w-4 h-4 fill-slate-950 text-slate-950" />
                        <span>Pause Video</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
                        <span>Play Video</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DOCUMENT VIEW & LIVE TEXT FILE WRITER */}
        {(file.category === 'documents' || file.category === 'files') && (
          <div className="w-full h-full flex flex-col pt-20 px-6 pb-6 relative max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Real Document Text Stream</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                Raw Byte Array Mode
              </span>
            </div>

            <div className="flex-1 bg-slate-950 border border-slate-900 rounded-3xl overflow-hidden p-1 flex flex-col">
              <textarea
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                className="flex-1 w-full p-6 text-slate-200 font-mono text-xs focus:outline-none bg-slate-950 resize-none leading-relaxed overflow-y-auto"
                placeholder="No text encoding streams located."
              />
            </div>

            <div className="flex items-center justify-between gap-4 mt-4 bg-slate-900/40 p-4 border border-slate-900 rounded-3xl max-w-lg mx-auto w-full">
              <p className="text-[10px] text-slate-500 leading-normal font-semibold">
                Changing files directly rewrites on-device buffers dynamically and compiles real-time blobs for transfer!
              </p>
              <button
                onClick={handleSaveDocContent}
                className="px-5 py-3 bg-emerald-400 hover:bg-emerald-500 text-slate-950 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-lg shadow-emerald-400/20 active:translate-y-[1px]"
              >
                {isDocSaved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Rebuilt File</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 animate-bounce" />
                    <span>Process & Write</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* APP PACKAGE (APK MANIFEST ANALYSIS DECK) */}
        {file.category === 'apps' && (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 pt-20 overflow-y-auto max-w-lg mx-auto">
            <div className="bg-slate-900/60 border border-slate-850/80 rounded-3xl p-6 text-center w-full shadow-2xl relative overflow-hidden">
              <div className="absolute top-3 right-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[9px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Checked Safe
              </div>

              <div className="w-20 h-20 rounded-3xl bg-gradient-to-b from-emerald-500/10 to-emerald-500/5 border border-emerald-400/20 flex items-center justify-center text-4xl mx-auto mb-4 shadow-xl shadow-black/40">
                🤖
              </div>

              <h2 className="text-base font-black text-white truncate px-4">{file.name}</h2>
              <p className="text-xs text-slate-500 font-bold tracking-widest uppercase mt-1.5 font-mono">{file.detail}</p>

              <div className="grid grid-cols-2 gap-2 mt-6">
                <div className="bg-slate-950/60 border border-slate-900 p-3 rounded-2xl text-left">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">App Framework</span>
                  <span className="text-xs font-bold text-slate-300">Native Android APK</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-900 p-3 rounded-2xl text-left">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">Signature cert</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">Keystore SHA-256</span>
                </div>
              </div>

              {/* Permissions manifest check */}
              <div className="mt-5 bg-slate-950/45 p-4 rounded-2xl border border-slate-900 text-left">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-900">
                  Permissions Manifest Analysis
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                  <div className="flex items-center gap-1 text-slate-300"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> ACCESS_COARSE_LOCATION</div>
                  <div className="flex items-center gap-1 text-slate-300"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> READ_EXTERNAL_STORAGE</div>
                  <div className="flex items-center gap-1 text-slate-300"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> CHANGE_WIFI_STATE</div>
                  <div className="flex items-center gap-1 text-slate-300"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> INTERNET ACCESS</div>
                </div>
              </div>

              <div className="mt-5 text-[10px] text-slate-500 font-semibold leading-normal pb-1">
                This Android application package was fully mapped on your local storage device structure.
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
