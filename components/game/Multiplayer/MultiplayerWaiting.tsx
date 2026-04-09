'use client';

import React from 'react';
import { GameTutorial } from '@/components/game/GameTutorial';
import { cn } from '@/lib/utils';
import { Loader2, Copy, X } from 'lucide-react';

interface MultiplayerWaitingProps {
  title?: string;
  subtitle?: string;
  roomCode: string;
  tutorial: any;
  accentColor: string;
  onCopyCode: () => void;
  onCancel: () => void;
  copyFeedback?: string;
  className?: string;
}

export function MultiplayerWaiting({
  title = "Waiting for Player 2",
  subtitle = "Share this code with a friend to start the experiment!",
  roomCode,
  tutorial,
  accentColor,
  onCopyCode,
  onCancel,
  copyFeedback,
  className,
}: MultiplayerWaitingProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center min-h-[400px] animate-in fade-in slide-in-from-bottom-4 duration-500", className)}>
      <h1 className="text-4xl font-extrabold mb-2 text-[var(--text-main)]">
        {title}
      </h1>
      <p className="text-lg text-[var(--text-light)] mb-6 text-center">
        {subtitle}
      </p>

      {tutorial && (
        <div className="mb-6 w-full max-w-md">
           <GameTutorial tutorial={tutorial} accentColor={accentColor} />
        </div>
      )}

      <div className="flex flex-col items-center space-y-6 w-full max-w-md">
        {/* Room Code Display */}
        <div 
          className="relative group cursor-pointer"
          onClick={onCopyCode}
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative px-10 py-6 bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-2xl flex flex-col items-center">
             <span className="text-5xl font-black tracking-[0.2em] text-[var(--text-main)] uppercase select-all">
               {roomCode}
             </span>
             {copyFeedback && (
               <span className="absolute -bottom-8 text-sm font-bold text-emerald-500 animate-in fade-in slide-in-from-top-1">
                 {copyFeedback}
               </span>
             )}
          </div>
        </div>

        {/* Status Indicator */}
        <p className="flex items-center gap-3 text-lg font-medium text-[var(--text-light)]">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--primary)]" />
          Waiting for opponent...
        </p>

        {/* Action Buttons */}
        <div className="flex gap-4 w-full pt-4">
          <button
            onClick={onCopyCode}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-[var(--text-main)] font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:scale-95"
          >
            <Copy className="w-4 h-4" />
            Copy Code
          </button>
          <button
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors active:scale-95"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
