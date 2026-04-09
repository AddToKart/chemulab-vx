'use client';

import React from 'react';
import { GameTutorial } from '@/components/game/GameTutorial';
import { cn } from '@/lib/utils';

interface MultiplayerLobbyProps {
  title: string;
  description: string;
  tutorial: any;
  accentColor: string;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  roomCodeInput: string;
  setRoomCodeInput: (val: string) => void;
  errorMessage?: string;
  isLoading?: boolean;
  className?: string;
}

export function MultiplayerLobby({
  title,
  description,
  tutorial,
  accentColor,
  onCreateRoom,
  onJoinRoom,
  roomCodeInput,
  setRoomCodeInput,
  errorMessage,
  isLoading,
  className,
}: MultiplayerLobbyProps) {
  return (
    <div className={cn("flex flex-col items-center animate-in fade-in zoom-in-95 duration-500", className)}>
      <h1 className="text-4xl md:text-5xl font-extrabold mb-3 text-[var(--text-main)] tracking-tight">
        {title}
      </h1>
      <p className="text-lg text-[var(--text-light)] mb-6 max-w-2xl text-center leading-relaxed">
        {description}
      </p>

      {tutorial && (
        <div className="mb-8 w-full max-w-md">
           <GameTutorial tutorial={tutorial} accentColor={accentColor} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl px-4">
        {/* Create Room Card */}
        <div className="glass-panel glass-panel-hover p-8 rounded-[var(--radius-xl)] flex flex-col items-center text-center group">
          <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🏠</div>
          <h2 className="text-2xl font-bold mb-3 text-[var(--text-main)]">Create Room</h2>
          <p className="text-[var(--text-light)] mb-8 flex-grow">
            Start a new game and invite a friend to play with you.
          </p>
          <button
            onClick={onCreateRoom}
            disabled={isLoading}
            className="w-full py-4 rounded-[var(--radius-lg)] bg-[var(--primary)] text-white font-bold text-lg shadow-lg hover:shadow-xl hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: accentColor }}
          >
            {isLoading ? 'Creating...' : 'Create New Room'}
          </button>
        </div>

        {/* Join Room Card */}
        <div className="glass-panel glass-panel-hover p-8 rounded-[var(--radius-xl)] flex flex-col items-center text-center group">
          <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🔗</div>
          <h2 className="text-2xl font-bold mb-3 text-[var(--text-main)]">Join Room</h2>
          <p className="text-[var(--text-light)] mb-6 flex-grow">
            Enter a room code to join an existing game session.
          </p>
          
          <div className="w-full space-y-3">
            <input
              type="text"
              placeholder="ROOM CODE"
              maxLength={6}
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              className="w-full p-4 rounded-[var(--radius-lg)] border-2 border-[var(--border-color)] bg-[var(--bg-card)] text-center text-2xl font-black tracking-[0.2em] outline-none focus:border-[var(--primary)] transition-colors uppercase placeholder:text-slate-400 placeholder:tracking-normal placeholder:font-normal placeholder:text-base"
              onKeyDown={(e) => {
                if (e.key === 'Enter') onJoinRoom();
              }}
            />
            <button
              onClick={onJoinRoom}
              disabled={isLoading}
              className="w-full py-4 rounded-[var(--radius-lg)] bg-[var(--primary)] text-white font-bold text-lg shadow-lg hover:shadow-xl hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: accentColor }}
            >
              {isLoading ? 'Joining...' : 'Join Game'}
            </button>
          </div>
          
          {errorMessage && (
            <p className="mt-4 text-red-500 font-medium animate-in slide-in-from-top-2 duration-300">
              {errorMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
