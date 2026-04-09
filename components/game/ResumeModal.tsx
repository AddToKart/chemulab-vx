'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ResumeModalProps {
  gameName: string;
  onResume: () => void;
  onStartNew: () => void;
  previousScore?: number;
  previousProgress?: string;
  className?: string;
}

export function ResumeModal({
  gameName,
  onResume,
  onStartNew,
  previousScore,
  previousProgress,
  className,
}: ResumeModalProps) {
  return (
    <div className={cn("fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm", className)}>
      <div className="mx-4 max-w-sm rounded-2xl bg-[var(--bg-card)] p-6 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-cyan-500/20 p-4">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-8 w-8 text-cyan-500" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
            </div>
          </div>
          
          <h3 className="mb-2 text-xl font-bold text-[var(--text-main)]">
            Resume Game?
          </h3>
          
          <p className="mb-4 text-[var(--text-secondary)]">
            You have an unfinished {gameName} game. Would you like to continue where you left off?
          </p>

          {(previousScore !== undefined || previousProgress) && (
            <div className="mb-6 rounded-xl bg-slate-100 dark:bg-slate-800 p-4">
              {previousScore !== undefined && (
                <p className="text-lg font-semibold text-[var(--text-main)]">
                  Previous Score: <span className="text-cyan-500">{previousScore}</span>
                </p>
              )}
              {previousProgress && (
                <p className="text-sm text-[var(--text-secondary)]">
                  {previousProgress}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              className="flex-1 rounded-xl bg-slate-200 dark:bg-slate-700 px-4 py-3 font-semibold text-[var(--text-main)] transition-colors hover:bg-slate-300 dark:hover:bg-slate-600"
              onClick={onStartNew}
            >
              Start New
            </button>
            <button
              className="flex-1 rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-cyan-600"
              onClick={onResume}
            >
              Resume
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}