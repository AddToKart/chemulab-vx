'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface MultiplayerContainerProps {
  children: React.ReactNode;
  onLeave: () => void;
  gameTitle: string;
  isShaking?: boolean;
  className?: string;
}

export function MultiplayerContainer({
  children,
  onLeave,
  gameTitle,
  isShaking,
  className,
}: MultiplayerContainerProps) {
  return (
    <div className="w-full max-w-full mx-auto p-5 min-h-screen flex flex-col items-center">
      {/* Back Button */}
      <button
        className="self-start mb-4 text-cyan-500 font-medium hover:opacity-80 transition-opacity flex items-center gap-2"
        onClick={onLeave}
      >
        &larr; Leave {gameTitle}
      </button>

      {/* Main Game Area */}
      <div
        className={cn(
          "relative w-full max-w-[1000px] h-[calc(100vh-140px)] min-h-0 bg-[var(--bg-card)] p-5 md:p-8 rounded-[32px] text-center shadow-2xl flex flex-col justify-between overflow-y-auto overflow-x-hidden text-[var(--text-main)]",
          "before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-1.5 before:bg-gradient-to-r before:from-cyan-500 before:to-emerald-500",
          isShaking && "animate-[shake_0.5s_infinite]",
          className
        )}
      >
        {children}
      </div>

      <style jsx global>{`
        @keyframes shake {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          10% { transform: translate(-1px, -2px) rotate(-1deg); }
          20% { transform: translate(-3px, 0px) rotate(1deg); }
          30% { transform: translate(3px, 2px) rotate(0deg); }
          40% { transform: translate(1px, -1px) rotate(1deg); }
          50% { transform: translate(-1px, 2px) rotate(-1deg); }
          60% { transform: translate(-3px, 1px) rotate(0deg); }
          70% { transform: translate(3px, 1px) rotate(-1deg); }
          80% { transform: translate(-1px, -1px) rotate(1deg); }
          90% { transform: translate(1px, 2px) rotate(0deg); }
          100% { transform: translate(1px, -2px) rotate(-1deg); }
        }
      `}</style>
    </div>
  );
}
