/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Play, Pause, RotateCw, ZoomIn, ZoomOut, Save, FileText, CheckCircle2,
  Sliders, Music, Film, Image as ImageIcon, Smartphone, HelpCircle, Laptop,
  Cpu, Activity, Terminal
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

  // 1. Common States
  const [activePlay, setActivePlay] = useState(false);

  // 2. Photo States (Zoom, Rotate, CSS filters)
  const [photoZoom, setPhotoZoom] = useState(1);
  const [photoRotate, setPhotoRotate] = useState(0); // 0, 90, 180, 270
  const [photoSepia, setPhotoSepia] = useState(0);
  const [photoGrayscale, setPhotoGrayscale] = useState(0);
  const [photoInvert, setPhotoInvert] = useState(0);
  const [photoHue, setPhotoHue] = useState(0);

  // 3. Audio States
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0.8);

  // 4. Video Canvas Simulation States (for simulated mp4 videos)
  const videoSimCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const [videoSpeed, setVideoSpeed] = useState(1);
  const [videoParticleColor, setVideoParticleColor] = useState('#60a5fa'); // blue
  const [videoDensity, setVideoDensity] = useState(150);

  // For real uploaded videos
  const realVideoRef = useRef<HTMLVideoElement | null>(null);

  // 5. Document text-editing states
  const [docContent, setDocContent] = useState(file.rawText || '');
  const [isDocSaved, setIsDocSaved] = useState(false);

  // 6. App simulation interactive terminal states
  const [appLog, setAppLog] = useState<string[]>([]);
  const [appIsRunning, setAppIsRunning] = useState(false);

  // Load and reset states on file changes
  useEffect(() => {
    setActivePlay(false);
    setPhotoZoom(1);
    setPhotoRotate(0);
    setPhotoSepia(0);
    setPhotoGrayscale(0);
    setPhotoInvert(0);
    setPhotoHue(0);
    getMnemonicText();
    setAppIsRunning(false);
    setAppLog([]);
    setIsDocSaved(false);

    if (file.rawText) {
      setDocContent(file.rawText);
    } else {
      setDocContent(`--- Binary file data [${file.name}] ---\nSize: ${file.size} bytes\nCategory: ${file.category}\nExtension: ${file.extension}`);
    }

    // Stop former animation if any
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
  }, [file]);

  // Clean audio and video animation elements on close
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  // Handle HTML5 sound triggers
  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (activePlay) {
      audioRef.current.pause();
      setActivePlay(false);
    } else {
      audioRef.current.play().then(() => {
        setActivePlay(true);
      }).catch(err => {
        console.warn('Playback block', err);
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

  // 480p Video simulation loop on a canvas for personalized Cosmic simulation videos
  useEffect(() => {
    if (file.category === 'videos' && isOpen) {
      const isSimulated = file.id.startsWith('dyn-vid');
      if (isSimulated) {
        // Run particle system simulation
        const canvas = videoSimCanvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            let width = canvas.width = 480;
            let height = canvas.height = 320;
            const particles: Array<{ x: number; y: number; z: number; color: string }> = [];

            // Initialize 3D points
            const initParticles = () => {
              particles.length = 0;
              for (let i = 0; i < videoDensity; i++) {
                particles.push({
                  x: (Math.random() - 0.5) * width * 2,
                  y: (Math.random() - 0.5) * height * 2,
                  z: Math.random() * width,
                  color: `hsl(${Math.random() * 360}, ${70 + Math.random() * 30}%, 65%)`
                });
              }
            };

            initParticles();

            let angle = 0;
            const render = () => {
              ctx.fillStyle = '#020617';
              ctx.fillRect(0, 0, width, height);

              // Center glow
              const grad = ctx.createRadialGradient(width/2, height/2, 5, width/2, height/2, 180);
              grad.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
              grad.addColorStop(1, 'transparent');
              ctx.fillStyle = grad;
              ctx.fillRect(0, 0, width, height);

              angle += 0.01 * videoSpeed;

              particles.forEach((p) => {
                p.z -= 2 * videoSpeed;
                if (p.z <= 0) {
                  p.z = width;
                  p.x = (Math.random() - 0.5) * width * 2;
                  p.y = (Math.random() - 0.5) * height * 2;
                }

                // 3D Projection calculations
                const scale = width / (p.z || 1);
                // Orbit rotation vector
                const cosA = Math.cos(angle * 0.2);
                const sinA = Math.sin(angle * 0.2);
                const rx = p.x * cosA - p.y * sinA;
                const ry = p.x * sinA + p.y * cosA;

                const sx = rx * scale + width / 2;
                const sy = ry * scale + height / 2;

                if (sx >= 0 && sx <= width && sy >= 0 && sy <= height) {
                  const size = Math.max(0.5, scale * 1.5);
                  ctx.fillStyle = p.z < width / 2 ? videoParticleColor : '#475569';
                  ctx.beginPath();
                  ctx.arc(sx, sy, size, 0, Math.PI * 2);
                  ctx.fill();

                  // Orbit trail traces
                  if (size > 2) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                    ctx.fillRect(sx - size, sy, size * 2, 0.5);
                  }
                }
              });

              // Onscreen Info
              ctx.fillStyle = '#38bdf8';
              ctx.font = 'bold 11px monospace';
              ctx.fillText('DIRECT FLUID FIELD RENDER', 20, 25);
              ctx.fillStyle = '#64748b';
              ctx.fillText(`FPS: 60 • Speed: ${videoSpeed}x • Particles: ${particles.length}`, 20, 42);

              animationFrameId.current = requestAnimationFrame(render);
            };

            render();
          }
        }
      }
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [file, isOpen, videoSpeed, videoParticleColor, videoDensity]);

  // Real Web playback trigger for user-uploaded direct videos
  const togglePlayRealVideo = () => {
    if (!realVideoRef.current) return;
    if (activePlay) {
      realVideoRef.current.pause();
      setActivePlay(false);
    } else {
      realVideoRef.current.play().then(() => {
        setActivePlay(true);
      }).catch(() => {
        alert('Browser codec exception for this media packet.');
      });
    }
  };

  // Re-save Document to client memory
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

  // Helper text mnemonic generators
  const getMnemonicText = () => {
    const ext = file.extension.toLowerCase();
    if (ext === 'apk') return 'Android App Bundle';
    if (ext === 'pdf') return 'PDF Document Sheet';
    if (ext === 'ts' || ext === 'js' || ext === 'json') return 'Executable Script source';
    return `${file.extension.toUpperCase()} File format`;
  };

  // Simulated retro droid shell emulator for Apps panel
  const handleLaunchAppSimulation = () => {
    setAppIsRunning(true);
    setAppLog(['[SYSTEM] Initializing virtual device wrapper...', '[SYSTEM] Verifying certificate authority (100% OK)']);

    const steps = [
      'Establishing P2P local loopback...',
      `Triggering intent main matching package: ${file.name}`,
      `Binding memory allocations (Heap 12MB)...`,
      `Success. Rendering virtual Android process...`,
      '--- APP IS RUNNING LIVE ---',
      'Select, share and drag anything instantly!',
      'Press Stop Simulation to back out.'
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setAppLog((prev) => [...prev, `[LOG] ${step}`]);
      }, (idx + 1) * 700);
    });
  };

  const getMockApkIcon = (name: string) => {
    if (name.toLowerCase().includes('transit')) return '🚇';
    if (name.toLowerCase().includes('xender')) return '⚡';
    return '🤖';
  };

  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] animate-fade-in shadow-2xl">
        
        {/* Modal Window Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800/80 bg-slate-900">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              {file.category === 'photos' && <ImageIcon className="w-4 h-4" />}
              {file.category === 'audios' && <Music className="w-4 h-4" />}
              {file.category === 'videos' && <Film className="w-4 h-4" />}
              {file.category === 'documents' && <FileText className="w-4 h-4" />}
              {file.category === 'files' && <FileText className="w-4 h-4" />}
              {file.category === 'apps' && <Smartphone className="w-4 h-4" />}
            </div>
            <div className="truncate">
              <h3 className="text-xs font-black text-slate-100 truncate max-w-[210px]">{file.name}</h3>
              <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-0.5">{getMnemonicText()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-850 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content viewer body area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

          {/* 1. PHOTO PREVIEW */}
          {file.category === 'photos' && (
            <div className="flex flex-col gap-4">
              <div className="bg-slate-950 rounded-2xl aspect-square overflow-hidden flex items-center justify-center border border-slate-950 relative">
                {file.senderBlobUrl ? (
                  <img
                    src={file.senderBlobUrl}
                    alt={file.name}
                    className="max-h-full max-w-full object-contain transition-all duration-200"
                    referrerPolicy="no-referrer"
                    style={{
                      transform: `scale(${photoZoom}) rotate(${photoRotate}deg)`,
                      filter: `sepia(${photoSepia}%) grayscale(${photoGrayscale}%) invert(${photoInvert}%) hue-rotate(${photoHue}deg)`
                    }}
                  />
                ) : (
                  <div className="text-center p-8 text-slate-500">
                    <ImageIcon className="w-12 h-12 text-slate-700 mx-auto mb-2" />
                    <p className="text-[11px] font-bold">Image loaded format un-cached</p>
                  </div>
                )}
              </div>

              {/* Photo dynamic adjustments */}
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 border-b border-slate-900 pb-2">
                  <span className="flex items-center gap-1.5"><Sliders className="w-3.5 h-3.5 text-emerald-400" /> Dynamic Adjusters</span>
                  <button
                    onClick={() => {
                      setPhotoZoom(1);
                      setPhotoRotate(0);
                      setPhotoSepia(0);
                      setPhotoGrayscale(0);
                      setPhotoInvert(0);
                      setPhotoHue(0);
                    }}
                    className="text-[10px] text-emerald-400 hover:underline"
                  >
                    Reset Look
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Zoom: {photoZoom.toFixed(1)}x</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPhotoZoom(Math.max(0.5, photoZoom - 0.25))} className="p-1.5 bg-slate-900 rounded-lg text-slate-400"><ZoomOut className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setPhotoZoom(Math.min(3, photoZoom + 0.25))} className="p-1.5 bg-slate-900 rounded-lg text-slate-400"><ZoomIn className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Rotation: {photoRotate}°</label>
                    <button
                      onClick={() => setPhotoRotate((prev) => (prev + 90) % 360)}
                      className="px-3 py-1.5 bg-slate-900 text-slate-300 font-bold text-[11px] rounded-lg hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Rotate 90</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-900 pt-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-bold">Grayscale filter:</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={photoGrayscale}
                      onChange={(e) => setPhotoGrayscale(parseInt(e.target.value))}
                      className="w-28 accent-emerald-400"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-bold">Sepia warmth:</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={photoSepia}
                      onChange={(e) => setPhotoSepia(parseInt(e.target.value))}
                      className="w-28 accent-emerald-400"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-bold">Hue Rotate:</span>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={photoHue}
                      onChange={(e) => setPhotoHue(parseInt(e.target.value))}
                      className="w-28 accent-emerald-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. AUDIO PREVIEW */}
          {file.category === 'audios' && (
            <div className="flex flex-col gap-4">
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
                {/* Vinyl plate graphic */}
                <div className="w-36 h-36 rounded-full bg-slate-900 border-4 border-slate-800 flex items-center justify-center relative shadow-black shadow-2xl">
                  <div 
                    className={`w-28 h-28 rounded-full bg-emerald-500/10 border-2 border-dashed border-emerald-500/30 flex items-center justify-center ${
                      activePlay ? 'animate-spin' : ''
                    }`}
                    style={{ animationDuration: '6s' }}
                  >
                    <Music className="w-12 h-12 text-emerald-400" />
                  </div>
                  {/* golden copper pin hole */}
                  <div className="absolute w-3.5 h-3.5 bg-yellow-500 rounded-full border border-slate-950" />
                </div>

                {/* Simulated wave bars */}
                <div className="flex gap-1 h-8 mt-5 items-end justify-center w-full">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1].map((bar, idx) => (
                    <div
                      key={idx}
                      className="w-1.5 bg-emerald-400 rounded-full transition-all"
                      style={{
                        height: activePlay ? `${Math.floor(Math.random() * 22) + 6}px` : '4px',
                        transitionDuration: '150ms'
                      }}
                    />
                  ))}
                </div>

                {/* Hidden real audio */}
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

              {/* Player deck controls */}
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span className="font-mono text-[11px] text-emerald-400">
                    {Math.floor(audioCurrentTime / 60)}:{(Math.floor(audioCurrentTime % 60)).toString().padStart(2, '0')}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    {Math.floor(audioDuration / 60)}:{(Math.floor(audioDuration % 60)).toString().padStart(2, '0')}
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max={audioDuration || 1}
                  step="0.05"
                  value={audioCurrentTime}
                  onChange={handleAudioValueSeek}
                  className="w-full accent-emerald-400 bg-slate-900 rounded-lg appearance-auto h-1.5 cursor-pointer"
                />

                <div className="flex items-center justify-between gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Volume</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={audioVolume}
                      onChange={handleAudioVolumeChange}
                      className="w-16 accent-emerald-400 h-1"
                    />
                  </div>

                  <button
                    onClick={togglePlayAudio}
                    className="px-5 py-2 bg-emerald-400 hover:bg-emerald-500 text-slate-950 text-xs font-black rounded-xl transition-all flex items-center gap-1.5"
                  >
                    {activePlay ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-slate-950" />
                        <span>Pause Audio</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-slate-950" />
                        <span>Play Synth</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. VIDEO PREVIEW */}
          {file.category === 'videos' && (
            <div className="flex flex-col gap-4">
              <div className="bg-slate-950 rounded-2xl aspect-video overflow-hidden border border-slate-950 flex items-center justify-center relative">
                {file.id.startsWith('dyn-vid') ? (
                  /* Starfield/cosmic 2D canvas recorder simulation */
                  <canvas
                    ref={videoSimCanvasRef}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  /* Real uploaded video packet */
                  file.senderBlobUrl ? (
                    <video
                      ref={realVideoRef}
                      src={file.senderBlobUrl}
                      controls
                      className="w-full h-full object-contain"
                      onPlay={() => setActivePlay(true)}
                      onPause={() => setActivePlay(false)}
                    />
                  ) : (
                    <div className="text-center text-slate-500">
                      <Film className="w-12 h-12 mx-auto text-slate-700 mb-2" />
                      <p className="text-[11px] font-black">Unable to map video pipeline sources</p>
                    </div>
                  )
                )}
              </div>

              {/* Video control dashboard */}
              {file.id.startsWith('dyn-vid') && (
                <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                    <span className="flex items-center gap-1.5"><Film className="w-3.5 h-3.5 text-emerald-400" /> Vector Render Params</span>
                    <span className="text-[10px] font-mono bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 text-rose-400">PERSONALIZED</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Velocity speed: {videoSpeed}x</label>
                      <select
                        value={videoSpeed}
                        onChange={(e) => setVideoSpeed(parseFloat(e.target.value))}
                        className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-emerald-400 w-full"
                      >
                        <option value="0.5">0.5x Eco</option>
                        <option value="1">1.0x Regular</option>
                        <option value="1.5">1.5x Fast</option>
                        <option value="2.5">2.5x Hyper</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Aesthetic Tint</label>
                      <select
                        value={videoParticleColor || '#60a5fa'}
                        onChange={(e) => setVideoParticleColor(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-emerald-400 w-full"
                      >
                        <option value="#60a5fa">Cosmic Tint</option>
                        <option value="#34d399">Matrix Lime</option>
                        <option value="#f43f5e">Crimson Nebula</option>
                        <option value="#fbbf24">Aurum Dust</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-900">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span>Render particle density: {videoDensity}</span>
                      <input
                        type="range"
                        min="50"
                        max="350"
                        step="25"
                        value={videoDensity}
                        onChange={(e) => setVideoDensity(parseInt(e.target.value))}
                        className="w-28 accent-emerald-400 h-1"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. DOCUMENTS PREVIEW (Editable & Rebuilds dynamic Blob!) */}
          {(file.category === 'documents' || file.category === 'files') && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-black text-slate-400 mb-0.5">
                <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-emerald-400" /> Live Content Core Parser</span>
                <span className="text-[10px] font-mono text-slate-500">Bytes: {formatBytes(file.size)}</span>
              </div>

              <textarea
                id="doc-raw-text-editor"
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                className="w-full h-44 bg-slate-950 border border-slate-850 rounded-2xl p-3 text-[11px] font-mono text-slate-300 focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                placeholder="Empty source bytes log file content stream."
              />

              <div className="flex items-center justify-between gap-3 mt-1.5">
                <p className="text-[10px] text-slate-500 max-w-[190px] font-semibold leading-normal">
                  Any changes typed directly above will dynamically rebuild the real downloadable file package!
                </p>
                <button
                  id="rebuild-dynamic-doc-bytes"
                  onClick={handleSaveDocContent}
                  className="px-4 py-2.5 bg-emerald-400 hover:bg-emerald-500 text-slate-950 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-lg shadow-emerald-400/10"
                >
                  {isDocSaved ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Rebuilt OK!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Process Bytes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 5. APPS INTERACTIVE SIMULATION */}
          {file.category === 'apps' && (
            <div className="flex flex-col gap-4">
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-3xl mx-auto mb-3">
                  {getMockApkIcon(file.name)}
                </div>
                <h4 className="text-sm font-black text-white">{file.name}</h4>
                <p className="text-xs text-slate-500 font-bold tracking-widest uppercase mt-1 font-mono">{file.detail}</p>
                
                <div className="flex justify-center gap-2 mt-3.5">
                  <span className="px-2 py-1 bg-slate-900 border border-slate-850 rounded-lg text-[9px] text-slate-400 font-mono">SDK v35</span>
                  <span className="px-2 py-1 bg-slate-900 border border-slate-850 rounded-lg text-[9px] text-slate-400 font-mono">SHA256 Cert Signed</span>
                  <span className="px-2 py-1 bg-slate-900 border border-slate-850 rounded-lg text-[9px] text-emerald-400 font-mono">ARM64 Compatible</span>
                </div>
              </div>

              {/* Permissions Checklist */}
              <div className="bg-slate-950 border border-slate-900 p-3.5 rounded-2xl">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-900 pb-1.5">
                  Permissions Manifest Analysis
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 select-none">
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> WiFi Direct Core</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Bluetooth Socket</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Read Storage</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Camera API</div>
                </div>
              </div>

              {/* Interactive Virtual Emulator terminal */}
              {appIsRunning ? (
                <div className="bg-black/90 border border-emerald-500/20 p-3 rounded-2xl font-mono text-[10px] text-emerald-400 h-36 overflow-y-auto flex flex-col gap-1 shadow-inner relative">
                  <div className="absolute top-2 right-2 flex items-center gap-1 text-[8px] bg-emerald-500/10 border border-emerald-400/20 px-1.5 py-0.5 rounded text-emerald-300 font-extrabold uppercase animate-pulse">
                    <Activity className="w-2.5 h-2.5" /> Simulation Alive
                  </div>

                  {appLog.map((log, idx) => (
                    <div key={idx} className="leading-relaxed whitespace-pre-wrap">{log}</div>
                  ))}

                  <button
                    onClick={() => {
                      setAppIsRunning(false);
                      setAppLog([]);
                    }}
                    className="w-full mt-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-slate-950 font-bold block text-center rounded-lg transition-all"
                  >
                    Kill Simulator System
                  </button>
                </div>
              ) : (
                <button
                  id="apk-simulation-ignite"
                  onClick={handleLaunchAppSimulation}
                  className="w-full py-3 bg-emerald-400 hover:bg-emerald-500 text-slate-950 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-400/15 cursor-pointer"
                >
                  <Terminal className="w-4 h-4" />
                  <span>Emulate App Sandbox</span>
                </button>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
