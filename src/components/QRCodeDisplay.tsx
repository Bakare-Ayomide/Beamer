/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Clipboard, Check, RefreshCw } from 'lucide-react';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

export default function QRCodeDisplay({ value, size = 200 }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    QRCode.toCanvas(
      canvasRef.current,
      value,
      {
        width: size,
        margin: 2,
        color: {
          dark: '#0f172a', // deep indigo/slate
          light: '#ffffff', // pure white
        },
      },
      (err) => {
        if (err) {
          console.error(err);
          setError('Failed to generate high-speed connection QR code.');
        } else {
          setError(null);
        }
      }
    );
  }, [value, size]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Could not copy URL to clipboard', err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
      <div className="relative p-3 bg-white rounded-xl shadow-inner min-h-[160px] min-w-[160px] flex items-center justify-center">
        {error ? (
          <div className="text-sm text-red-500 text-center flex flex-col items-center gap-2">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <span>{error}</span>
          </div>
        ) : (
          <canvas id="qr-canvas-element" ref={canvasRef} className="rounded-lg" />
        )}
        <div className="absolute top-0 right-0 p-1 bg-emerald-500 rounded-full border border-white text-white translate-x-1 -translate-y-1">
          <QrCode className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="mt-4 w-full text-center">
        <p className="text-xs text-slate-400 font-medium mb-2">Scan with other device to download</p>
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-950 rounded-lg border border-slate-800 text-left">
          <span className="text-xs font-mono text-emerald-400 truncate select-all">{value}</span>
          <button
            id="copy-qr-url-btn"
            onClick={copyToClipboard}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
            title="Copy URL"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Clipboard className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
