'use client';

/* eslint-disable @next/next/no-img-element */

import { Users } from 'lucide-react';

interface GroupAvatarEditorProps {
  avatarPreview: string;
  avatarSourceUrl: string;
  error: string;
  onAvatarSourceChange: (value: string) => void;
  onStartCrop: () => void;
  onRemovePhoto: () => void;
  placeholder?: string;
}

export function GroupAvatarEditor({
  avatarPreview,
  avatarSourceUrl,
  error,
  onAvatarSourceChange,
  onStartCrop,
  onRemovePhoto,
  placeholder = 'Paste photo URL...',
}: GroupAvatarEditorProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--accent-color)]/30 bg-[var(--bg-sidebar)]">
        {avatarPreview ? (
          <img
            src={avatarPreview}
            alt="Group avatar"
            className="h-full w-full object-cover"
          />
        ) : (
          <Users size={32} className="text-[var(--text-light)]" />
        )}
      </div>
      <input
        type="text"
        value={avatarSourceUrl}
        onChange={(event) => onAvatarSourceChange(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[12px] px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:outline-none focus:border-[var(--accent-color)] transition-colors text-sm"
      />
      <div className="flex w-full gap-2">
        <button
          type="button"
          onClick={onStartCrop}
          disabled={!avatarSourceUrl}
          className="flex-1 bg-[var(--accent-color)] text-white font-semibold px-4 py-2 rounded-[12px] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          Crop
        </button>
        <button
          type="button"
          onClick={onRemovePhoto}
          disabled={!avatarPreview}
          className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/30 rounded-[12px] text-xs font-semibold hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Remove
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
