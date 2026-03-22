'use client';

import Image from 'next/image';
import { Pin } from 'lucide-react';
import { ModalData, ChatMessage } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  modalData: ModalData | null;
  pinnedMessages: ChatMessage[];
  onUnfriend: () => void;
  onBlock: () => void;
  onUnblock: () => void;
  isBlocked: boolean;
  onUnpinMessage: (msg: ChatMessage) => void;
}

export function FriendProfileModal({
  isOpen,
  onClose,
  modalData,
  pinnedMessages,
  onUnfriend,
  onBlock,
  onUnblock,
  isBlocked,
  onUnpinMessage,
}: Props) {
  if (!isOpen || !modalData) return null;

  function formatTime(ts: { seconds: number; nanoseconds: number } | null | undefined): string {
    if (!ts || !ts.seconds) return '';
    const d = new Date(ts.seconds * 1000);
    return d.toLocaleString();
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(2,6,23,0.85)] backdrop-blur-[8px]"
      onClick={(e) => { if (e.target === e.currentTarget) { onClose(); } }}
    >
      <div className="bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-[28px] p-8 relative">
        <button
          type="button"
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-full text-[var(--text-light)] hover:bg-red-500 hover:text-white hover:rotate-90 transition-all duration-200 cursor-pointer"
          onClick={onClose}
        >
          &times;
        </button>
        <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4 border-4 border-[var(--accent-color)]/30">
          {modalData.photoURL ? (
            <img src={modalData.photoURL} alt={modalData.username} width={80} height={80} />
          ) : (
            <Image src="/img/default-avatar.png" alt={modalData.username} width={80} height={80} />
          )}
        </div>
        <h3 className="text-xl font-bold text-[var(--text-main)] text-center mb-1">{modalData.username}</h3>
        <p className="text-[var(--text-light)] text-sm text-center">{modalData.email}</p>
        <div className="bg-[var(--bg-sidebar)] rounded-[16px] p-4 space-y-2 text-sm text-[var(--text-main)] my-5 border border-[var(--border-color)]">
          <div><strong>Joined:</strong> {modalData.joinDate}</div>
          <div><strong>Discoveries:</strong> {modalData.discoveryCount}</div>
        </div>
        <div className="mt-6 border-t border-[var(--border-color)] pt-4">
          <h4 className="text-sm font-bold text-[var(--text-main)] mb-3 flex items-center gap-2">
            <Pin size={16} className="text-amber-500 fill-amber-500/20" /> Pinned Messages
          </h4>
          <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {pinnedMessages.length === 0 ? (
              <p className="text-xs text-[var(--text-light)] italic text-center py-2">No pinned messages.</p>
            ) : (
              pinnedMessages.map(msg => (
                <div key={msg.id} className="p-2.5 bg-[rgba(16,185,129,0.05)] rounded-[12px] border border-[rgba(16,185,129,0.1)] group">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] text-[var(--accent-color)] font-bold uppercase tracking-wider">{msg.fromUsername}</span>
                      <p className="text-xs text-[var(--text-main)] line-clamp-2 leading-relaxed">{msg.text}</p>
                    </div>
                    <button onClick={() => onUnpinMessage(msg)} className="text-[var(--text-light)] hover:text-red-500 transition-colors" title="Unpin">
                      <Pin size={12} className="fill-current" />
                    </button>
                  </div>
                  <span className="text-[0.6rem] text-[var(--text-light)] mt-1 block">
                    {msg.createdAt ? formatTime(msg.createdAt) : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          {isBlocked ? (
            <button type="button" className="flex-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 font-semibold px-4 py-2.5 rounded-[12px] hover:bg-emerald-500 hover:text-white transition-colors cursor-pointer"
              onClick={onUnblock}>Unblock</button>
          ) : (
            <button type="button" className="flex-1 bg-red-500/10 text-red-500 border border-red-500/30 font-semibold px-4 py-2.5 rounded-[12px] hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
              onClick={onBlock}>Block</button>
          )}
          <button type="button" className="flex-1 bg-[var(--bg-sidebar)] text-[var(--text-light)] border border-[var(--border-color)] font-semibold px-4 py-2.5 rounded-[12px] hover:border-red-500/50 hover:text-red-400 transition-colors cursor-pointer"
            onClick={onUnfriend}>Unfriend</button>
        </div>
      </div>
    </div>
  );
}
