/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Trash2, Send, Download, Layers, ShieldCheck } from 'lucide-react';
import { TransferLog } from '../types';

interface HistoryLogsProps {
  logs: TransferLog[];
  onClearLogs: () => void;
  onDeleteLog: (id: string) => void;
}

export default function HistoryLogs({ logs, onClearLogs, onDeleteLog }: HistoryLogsProps) {
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-slate-950 border border-slate-900 rounded-3xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-black tracking-wider text-slate-200 uppercase">Recent Transfers</h3>
        </div>
        {logs.length > 0 && (
          <button
            id="clear-all-history-logs"
            onClick={onClearLogs}
            className="text-[10px] sm:text-xs font-bold text-red-500 hover:text-red-400 flex items-center gap-1 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-lg transition-all"
          >
            Clear All
          </button>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="py-6 text-center border border-dashed border-slate-900 rounded-2xl flex flex-col items-center justify-center">
          <p className="text-xs font-medium text-slate-500">Zero active transmissions saved.</p>
          <p className="text-[10px] text-slate-600 mt-0.5">Initialize a broadcast to start logging offline packet logs</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[190px] overflow-y-auto pr-1">
          {logs.map((log) => (
            <div
              key={log.id}
              className="group flex items-center justify-between bg-slate-900/40 hover:bg-slate-900/60 transition-all border border-slate-900 p-3 rounded-2xl gap-3"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 border ${
                  log.type === 'send' 
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {log.type === 'send' ? <Send className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                </div>

                <div className="truncate">
                  <div className="flex items-center gap-1.5 truncate">
                    <p className="text-xs font-bold text-slate-200 truncate select-all">{log.fileName}</p>
                    {log.fileCount > 1 && (
                      <span className="px-1.5 py-0.5 bg-slate-950 text-slate-400 text-[8px] font-black rounded-md border border-slate-800 tracking-wide">
                        +{log.fileCount - 1} items
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-[9px] text-slate-500 font-semibold mt-0.5">
                    <span>{formatBytes(log.totalSize)}</span>
                    <span className="text-slate-700">•</span>
                    <span className="font-mono text-emerald-400/95">{log.speed}</span>
                    <span className="text-slate-700">•</span>
                    <span>{log.timestamp}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  id={`delete-single-log-${log.id}`}
                  onClick={() => onDeleteLog(log.id)}
                  className="p-1 px-1.5 hover:bg-slate-900 rounded-lg text-slate-600 hover:text-red-400 transition-colors opacity-80 group-hover:opacity-100"
                  title="Remove log"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
