/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { X, ShieldCheck, Sparkles, Check, CreditCard, Lock, RefreshCw } from 'lucide-react';
import { SubscriptionState } from '../types';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: SubscriptionState;
  onActivate: () => void;
}

export default function PremiumModal({ isOpen, onClose, subscription, onActivate }: PremiumModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleActivate = () => {
    setLoading(true);
    // Simulate real local card or wallet authorization
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        onActivate();
        setSuccess(false);
        onClose();
      }, 1500);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div 
        id="premium-billing-modal"
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative"
      >
        {/* Header background glow */}
        <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-indigo-500/20 to-transparent" />

        {/* Close Button */}
        <button
          id="close-premium-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 bg-slate-950/60 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 pt-8 flex flex-col items-center relative z-10 text-center">
          <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-400/30 rounded-2xl flex items-center justify-center text-indigo-400 mb-4 animate-pulse">
            <Sparkles className="w-7 h-7" />
          </div>

          <h3 className="text-xl font-bold text-white tracking-tight">Upgrade to P2P Pro</h3>
          <p className="text-xs text-indigo-400 font-semibold tracking-wider mt-1 uppercase">Local Wi-Fi File Turbine</p>

          <p className="text-sm text-slate-300 mt-3 px-2">
            Unlock the power of unlimited transfers. Batch share multiple items, complex media folders, and folders offline.
          </p>

          {/* Features check list */}
          <div className="mt-5 w-full text-left bg-slate-950/50 border border-slate-800/60 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <div className="p-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 mt-0.5">
                <Check className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Batch & Folder Transfers</p>
                <p className="text-[10px] text-slate-400">Send multiple files & folders containing photos or lists in one session</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="p-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 mt-0.5">
                <Check className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Zero File Size Restriction</p>
                <p className="text-[10px] text-slate-400">No limitations on 4K cinematic recordings or high-definition dumps</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="p-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 mt-0.5">
                <Check className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Ad-Free High Speed Lane</p>
                <p className="text-[10px] text-slate-400">Unthrottled local connection speeds matching maximum hardware bandwidth</p>
              </div>
            </div>
          </div>

          {/* Price Ring */}
          <div className="mt-6 flex items-baseline gap-1 bg-slate-950/80 border border-indigo-500/30 px-4 py-2 rounded-xl">
            <span className="text-2xl font-black text-white">₦700</span>
            <span className="text-xs text-slate-400 font-medium">/ monthly</span>
          </div>

          {/* CTA Trigger */}
          <div className="mt-6 w-full">
            {subscription.isPremium ? (
              <div className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
                <ShieldCheck className="w-4 h-4 animate-bounce" />
                <span className="text-sm font-semibold">Pro Activated Out of Box</span>
              </div>
            ) : success ? (
              <div className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 text-white rounded-xl font-bold animate-pulse">
                <Check className="w-4 h-4" />
                <span className="text-sm">Success! License Activated</span>
              </div>
            ) : (
              <button
                id="activate-premium-btn"
                onClick={handleActivate}
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 active:translate-y-[1px] disabled:opacity-75 disabled:pointer-events-none text-white rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Processing local Naira gateway...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4.5 h-4.5" />
                    <span>Pay ₦700 & Unlock Instant-Access</span>
                  </>
                )}
              </button>
            )}
          </div>

          <p className="text-[10px] text-slate-500 mt-3 tracking-wide">
            Interactive Offline Gatekeeper. Secure simulation with localStorage persistence.
          </p>
        </div>
      </div>
    </div>
  );
}
