/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Send, Download, Sparkles, Layers, ShieldCheck, 
  Wifi, RefreshCw, Cpu 
} from 'lucide-react';
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';
import { 
  ShareableFile, TransferLog, NetworkConfig, 
  SubscriptionState, DevicePreference 
} from './types';
import Navbar from './components/Navbar';
import SenderDashboard from './components/SenderDashboard';
import ReceiverDashboard from './components/ReceiverDashboard';
import HistoryLogs from './components/HistoryLogs';
import PremiumModal from './components/PremiumModal';

// High-fidelity helper to fetch real local/network hostname IP context
async function getLocalIP(): Promise<string> {
  return new Promise((resolve) => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      pc.createOffer().then(offer => pc.setLocalDescription(offer));
      pc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) {
          resolve(window.location.hostname || '127.0.0.1');
          return;
        }
        const candidate = ice.candidate.candidate;
        // Search regular expression IPv4 format
        const match = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
        if (match) {
          resolve(match[1]);
          pc.close();
        }
      };
      setTimeout(() => {
        resolve(window.location.hostname || '127.0.0.1');
        try { pc.close(); } catch {}
      }, 700);
    } catch {
      resolve(window.location.hostname || '127.0.0.1');
    }
  });
}

export default function App() {
  // 1. Core State Handlers (persisted with standard localStorage)
  const [devicePref, setDevicePref] = useState<DevicePreference>(() => {
    const saved = localStorage.getItem('p2p_device_pref');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error(err);
      }
    }
    return {
      deviceName: 'Loading P2P Device...',
      avatarId: '1',
    };
  });

  const [subscription, setSubscription] = useState<SubscriptionState>(() => {
    const saved = localStorage.getItem('p2p_subscription');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error(err);
      }
    }
    return {
      isPremium: false,
      priceNaira: 700,
    };
  });

  const [logs, setLogs] = useState<TransferLog[]>(() => {
    const saved = localStorage.getItem('p2p_transfer_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error(err);
      }
    }
    return [];
  });

  // 2. Local App UI Navigation Modes
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>('send');
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

  // Dynamic network configurations
  const [networkConfig, setNetworkConfig] = useState<NetworkConfig>({
    ipAddress: window.location.hostname || '127.0.0.1',
    port: Number(window.location.port) || 3000,
    ssid: 'Offline Wi-Fi Network',
    isConnected: true,
  });

  // Communication states between dashboards for seamless single-page testing
  const [incomingFiles, setIncomingFiles] = useState<ShareableFile[]>([]);
  const [incomingUrl, setIncomingUrl] = useState<string>('');

  // 3. Mount-time real native access logic integration
  useEffect(() => {
    async function loadNativeHardwareInfo() {
      try {
        // Query Native device details
        const devInfo = await Device.getInfo();
        const baseDeviceName = `${devInfo.manufacturer || 'Local'} ${devInfo.model || 'Device'}`;
        
        setDevicePref((prev) => {
          if (prev.deviceName === 'Loading P2P Device...' || prev.deviceName.startsWith('P2P-Device')) {
            return {
              ...prev,
              deviceName: baseDeviceName.trim() || `Device-${Math.floor(Math.random() * 90) + 10}`,
            };
          }
          return prev;
        });

        // Query Native Network adapter details
        const netStatus = await Network.getStatus();
        const realIp = await getLocalIP();
        const realPort = Number(window.location.port) || 3000;

        setNetworkConfig({
          ipAddress: realIp,
          port: realPort,
          ssid: netStatus.connectionType === 'wifi' ? 'Wi-Fi Direct Active' : 'Native Local Connection',
          isConnected: netStatus.connected,
        });

        // Listen for live network adapter adjustments
        Network.addListener('networkStatusChange', (status) => {
          setNetworkConfig((prev) => ({
            ...prev,
            isConnected: status.connected,
            ssid: status.connectionType === 'wifi' ? 'Wi-Fi Direct Link' : 'Local Connection changed',
          }));
        });

      } catch (err) {
        console.warn('Native APIs unavailable in pure sandboxed web mode, using optimized WebRTC resolver.', err);
        // Fallback WebRTC dynamic resolver
        const fallbackIp = await getLocalIP();
        setNetworkConfig((prev) => ({
          ...prev,
          ipAddress: fallbackIp,
          port: Number(window.location.port) || 3000,
        }));
      }
    }

    loadNativeHardwareInfo();
  }, []);

  // 3. Save states on adjustment
  useEffect(() => {
    localStorage.setItem('p2p_device_pref', JSON.stringify(devicePref));
  }, [devicePref]);

  useEffect(() => {
    localStorage.setItem('p2p_subscription', JSON.stringify(subscription));
  }, [subscription]);

  useEffect(() => {
    localStorage.setItem('p2p_transfer_logs', JSON.stringify(logs));
  }, [logs]);

  // 4. Activity Callback functions
  const handleUpdateDeviceName = (newName: string) => {
    setDevicePref((prev) => ({ ...prev, deviceName: newName }));
  };

  const handleShareComplete = (files: ShareableFile[], speed: string) => {
    if (files.length === 0) return;
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    const newLog: TransferLog = {
      id: Math.random().toString(36).substring(7),
      fileName: files[0].name,
      fileCount: files.length,
      totalSize: totalSize,
      type: 'send',
      status: 'completed',
      progress: 100,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      speed: speed,
      peerDeviceName: 'Wi-Fi Broadcast Group',
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  const handleReceiveComplete = (fileName: string, fileCount: number, size: number, speed: string) => {
    const newLog: TransferLog = {
      id: Math.random().toString(36).substring(7),
      fileName: fileName,
      fileCount: fileCount,
      totalSize: size,
      type: 'receive',
      status: 'completed',
      progress: 100,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      speed: speed,
      peerDeviceName: 'Local Hotspot peer',
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  const handleSelfSimulationReceiveInit = (url: string, files: ShareableFile[]) => {
    setIncomingFiles(files);
    setIncomingUrl(url);
    // Swap slider mode
    setActiveTab('receive');
  };

  const handleResetIncoming = () => {
    setIncomingFiles([]);
    setIncomingUrl('');
  };

  const handleActivatePremium = () => {
    setSubscription((prev) => ({
      ...prev,
      isPremium: true,
      activatedAt: new Date().toISOString(),
    }));
  };

  const handleDeleteLog = (id: string) => {
    setLogs((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Phone Screen Mock Wrapper */}
      <div className="w-full max-w-md mx-auto bg-slate-950 flex-1 flex flex-col border-x border-slate-900 shadow-2xl overflow-x-hidden">
        
        {/* Navigation Info Bar */}
        <Navbar 
          devicePref={devicePref}
          networkConfig={networkConfig}
          subscription={subscription}
          onUpdateDeviceName={handleUpdateDeviceName}
          onOpenPremium={() => setIsPremiumModalOpen(true)}
        />

        {/* Primary Functional Container */}
        <main className="flex-1 p-4 flex flex-col gap-6">
          
          {/* Send / Receive Visual Slider Switch */}
          <div className="bg-slate-900 p-1.5 rounded-2xl border border-slate-800/60 flex relative">
            <button
              id="switch-to-send-btn"
              onClick={() => {
                setActiveTab('send');
                handleResetIncoming();
              }}
              className={`flex-1 py-3 px-4 font-bold text-xs tracking-wide rounded-xl flex items-center justify-center gap-2 transition-all relative z-10 cursor-pointer ${
                activeTab === 'send' 
                  ? 'text-slate-950' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Broadcast Send</span>
            </button>

            <button
              id="switch-to-receive-btn"
              onClick={() => setActiveTab('receive')}
              className={`flex-1 py-3 px-4 font-bold text-xs tracking-wide rounded-xl flex items-center justify-center gap-2 transition-all relative z-10 cursor-pointer ${
                activeTab === 'receive' 
                  ? 'text-slate-950' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Tap to Receive</span>
            </button>

            {/* Background slider highlighter */}
            <div 
              className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-emerald-400 rounded-xl transition-all duration-300 ease-out ${
                activeTab === 'send' ? 'left-1.5' : 'left-[calc(50%+4px)]'
              }`}
            />
          </div>

          {/* Interactive Panels */}
          <div className="flex-1 flex flex-col gap-5 justify-between">
            {activeTab === 'send' ? (
              <SenderDashboard
                subscription={subscription}
                onOpenPremium={() => setIsPremiumModalOpen(true)}
                ipAddress={networkConfig.ipAddress}
                port={networkConfig.port}
                onShareComplete={handleShareComplete}
                onTriggerSelfReceive={handleSelfSimulationReceiveInit}
              />
            ) : (
              <ReceiverDashboard
                subscription={subscription}
                onReceiveComplete={handleReceiveComplete}
                incomingFiles={incomingFiles}
                incomingUrl={incomingUrl}
                onResetIncoming={handleResetIncoming}
              />
            )}

            {/* Transmission History Logs Deck */}
            <HistoryLogs 
              logs={logs}
              onClearLogs={handleClearLogs}
              onDeleteLog={handleDeleteLog}
            />
          </div>
        </main>

        {/* Tech Branding Footer */}
        <footer className="p-4 pt-2 pb-6 text-center border-t border-slate-900/60 flex flex-col items-center gap-1.5 bg-slate-950">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold tracking-widest uppercase">
            <Cpu className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>Capacitor Mobile Native Sandbox</span>
          </div>
          <p className="text-[10px] text-slate-600">
            Powered by standard 127.0.0.1 Direct-Stream. Zero Cloud Storage required.
          </p>
        </footer>
      </div>

      {/* Premium Upgrader Modal Trigger Panel */}
      <PremiumModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
        subscription={subscription}
        onActivate={handleActivatePremium}
      />
    </div>
  );
}
