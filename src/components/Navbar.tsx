/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Wifi, Edit2, Check, Radio, Sparkles, ShieldCheck } from 'lucide-react';
import { DevicePreference, NetworkConfig, SubscriptionState } from '../types';

interface NavbarProps {
  devicePref: DevicePreference;
  networkConfig: NetworkConfig;
  subscription: SubscriptionState;
  onUpdateDeviceName: (newName: string) => void;
  onOpenPremium: () => void;
}

export default function Navbar({
  devicePref,
  networkConfig,
  subscription,
  onUpdateDeviceName,
  onOpenPremium,
}: NavbarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(devicePref.deviceName);

  const saveName = () => {
    if (tempName.trim()) {
      onUpdateDeviceName(tempName.trim());
      setIsEditing(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        {/* Device Name Controller */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-inner">
            {devicePref.deviceName.charAt(0).toUpperCase()}
          </div>
          
          {isEditing ? (
            <div className="flex items-center gap-1.5">
              <input
                id="edit-device-name-input"
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                maxLength={18}
                className="bg-slate-900 border border-emerald-500/50 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium max-w-[100px]"
                autoFocus
              />
              <button
                id="save-device-name-btn"
                onClick={saveName}
                className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md transition-colors"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-100 tracking-tight max-w-[110px] truncate">
                {devicePref.deviceName}
              </span>
              <button
                id="trigger-edit-device-name"
                onClick={() => {
                  setTempName(devicePref.deviceName);
                  setIsEditing(true);
                }}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-900 rounded-md transition-all"
                title="Change Device Name"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Brand / Center Label */}
        <div className="hidden sm:block text-center select-none">
          <p className="text-xs font-black tracking-wider text-emerald-400 uppercase">OFFLINE DIRECT</p>
        </div>

        {/* Subscription & Utility */}
        <div className="flex items-center gap-2.5">
          {subscription.isPremium ? (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 rounded-full text-[10px] sm:text-xs font-bold shadow-lg shadow-emerald-500/5">
              <ShieldCheck className="w-3 h-3 animate-pulse text-emerald-400" />
              <span>P2P Pro</span>
            </div>
          ) : (
            <button
              id="header-upgrade-btn"
              onClick={onOpenPremium}
              className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-full text-[10px] sm:text-xs font-bold shadow-md shadow-indigo-500/10 active:translate-y-[1px] transition-all cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-yellow-300 animate-spin" />
              <span>Unlock Pro</span>
            </button>
          )}
        </div>
      </div>

      {/* Network Status Header Ribbon */}
      <div className="flex items-center justify-between text-[11px] bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-900/80">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Wifi className={`w-3.5 h-3.5 ${networkConfig.isConnected ? 'text-emerald-500 animate-pulse' : 'text-slate-500'}`} />
          <span className="font-semibold">{networkConfig.ssid}</span>
        </div>
        <div className="flex items-center gap-1">
          <Radio className="w-3 h-3 text-indigo-400 animate-ping" />
          <span className="font-mono text-slate-300">{networkConfig.ipAddress}:{networkConfig.port}</span>
        </div>
      </div>
    </header>
  );
}
