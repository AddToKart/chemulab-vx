'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2, AlertTriangle, RefreshCw, XCircle } from 'lucide-react';

interface MultiplayerOverlayProps {
  type: 'reconnecting' | 'opponent-disconnected';
  timeout: number;
  onReconnect?: () => void;
  onDrop?: () => void;
  error?: string;
  className?: string;
}

export function MultiplayerOverlay({
  type,
  timeout,
  onReconnect,
  onDrop,
  error,
  className,
}: MultiplayerOverlayProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (type === 'opponent-disconnected') {
    return (
      <div className={cn("fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300", className)}>
        <div className="text-center max-w-md px-6 animate-in zoom-in-95 duration-500">
          <div className="mb-6 relative flex justify-center">
             <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full"></div>
             <AlertTriangle className="w-20 h-20 text-yellow-500 relative" />
          </div>
          
          <h2 className="mb-4 text-4xl font-extrabold text-white tracking-tight">
            Opponent Disconnected!
          </h2>
          <p className="mb-10 text-xl text-slate-300 leading-relaxed font-medium">
            Waiting for your opponent to reconnect...
          </p>
          
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
            <div className="text-6xl font-mono font-black text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.4)]">
              {formatTime(timeout)}
            </div>
            <p className="mt-4 text-slate-400 font-semibold tracking-wider uppercase text-sm">
              Remaining
            </p>
          </div>
          
          <div className="mt-12 flex items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Establishing connection...</span>
          </div>
        </div>
      </div>
    );
  }

  // Reconnecting state (Full screen modal for local player)
  return (
    <div className={cn("fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300", className)}>
      <div className="text-center max-w-lg px-8 animate-in slide-in-from-bottom-6 duration-500">
        <div className="mb-8 relative flex justify-center">
           <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full animate-pulse"></div>
           <RefreshCw className="w-20 h-20 text-cyan-400 relative animate-[spin_3s_linear_infinite]" />
        </div>
        
        <h1 className="text-4xl font-extrabold text-white mb-4 tracking-tight">
          🔄 Reconnecting...
        </h1>
        <p className="text-xl text-slate-300 mb-2 leading-relaxed">
          Your connection was lost.
        </p>
        <p className="text-slate-400 font-medium mb-8">
          You have <span className="text-cyan-400 font-bold">{timeout} seconds</span> to reconnect before the session expires.
        </p>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 font-medium animate-in shake-in">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <button
            onClick={onReconnect}
            className="flex-1 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-lg rounded-2xl shadow-lg shadow-cyan-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Reconnect Now
          </button>
          <button
            onClick={onDrop}
            className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg rounded-2xl border border-slate-700 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <XCircle className="w-5 h-5" />
            Drop Game
          </button>
        </div>
      </div>
    </div>
  );
}
