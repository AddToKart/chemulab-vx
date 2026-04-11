'use client';

import { Smile, SmilePlus, Pin, Info } from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { cn } from '@/lib/utils';
import { ChatMessage } from '../types';

interface Props {
  activeChat: { friendUid: string; friendName: string; chatId: string };
  messages: ChatMessage[];
  messageText: string;
  setMessageText: (v: string) => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (v: boolean) => void;
  activeReactionMessageId: string | null;
  setActiveReactionMessageId: (v: string | null) => void;
  showFullReactionPicker: boolean;
  setShowFullReactionPicker: (v: boolean) => void;
  uid: string | undefined;
  blockedUsers: string[];
  onSendMessage: () => void;
  onToggleReaction: (msg: ChatMessage, emoji: string) => void;
  onPinMessage: (msg: ChatMessage) => void;
  onReportMessage: (msg: ChatMessage) => void;
  onViewProfile: () => void;
  onBack: () => void;
  chatMessagesRef: React.RefObject<HTMLDivElement | null>;
  reactionPickerRef: React.RefObject<HTMLDivElement | null>;
  PREDEFINED_REACTIONS: string[];
}

export function ChatView({
  activeChat,
  messages,
  messageText,
  setMessageText,
  showEmojiPicker,
  setShowEmojiPicker,
  activeReactionMessageId,
  setActiveReactionMessageId,
  showFullReactionPicker,
  setShowFullReactionPicker,
  uid,
  blockedUsers,
  onSendMessage,
  onToggleReaction,
  onPinMessage,
  onReportMessage,
  onViewProfile,
  onBack,
  chatMessagesRef,
  reactionPickerRef,
  PREDEFINED_REACTIONS,
}: Props) {
  function formatTime(ts: { seconds: number; nanoseconds: number } | null | undefined): string {
    if (!ts || !ts.seconds) return '';
    const d = new Date(ts.seconds * 1000);
    return d.toLocaleString();
  }

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] font-semibold text-[var(--text-main)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="hidden max-xl:flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-sidebar)] hover:bg-[var(--border-color)] transition-colors text-[var(--text-light)] cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <span>{activeChat.friendName}</span>
        </div>
        <button
          type="button"
          onClick={onViewProfile}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] text-[var(--accent-color)] hover:bg-[rgba(16,185,129,0.2)] transition-colors cursor-pointer"
          title="View Profile"
        >
          <Info size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3" ref={chatMessagesRef}>
        {messages.length === 0 && (
          <p className="text-[var(--text-light)] text-sm text-center mt-8">No messages yet. Say hello!</p>
        )}
        {messages.map((msg) => {
          if (msg.fromUid !== uid && blockedUsers.includes(msg.fromUid)) return null;
          return (
            <div
              key={msg.id}
              className={`relative flex flex-col max-w-[50%] group${msg.fromUid === uid ? ' self-end items-end' : ' self-start items-start'}`}
            >
              <div className={cn(
                "relative text-sm shadow-sm break-words max-w-full",
                msg.fromUid === uid
                  ? 'bg-[var(--accent-color)] text-white px-4 py-2.5 rounded-[16px] rounded-br-[4px]'
                  : 'bg-[var(--bg-sidebar)] text-[var(--text-main)] border border-[var(--border-color)] px-4 py-2.5 rounded-[16px] rounded-bl-[4px]',
                msg.isPinned && 'ring-2 ring-amber-500/80'
              )}>
                {msg.isPinned && <Pin size={12} className="absolute top-1.5 right-2.5 text-white/70" />}
                {msg.text}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex gap-1.5 mt-2">
                    {Object.entries(msg.reactions).map(([emoji, uids]) => uids.length > 0 && (
                      <button
                        key={emoji}
                        onClick={() => onToggleReaction(msg, emoji)}
                        className={cn(
                          "flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border transition-all",
                          uid && uids.includes(uid)
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                            : 'bg-black/20 border-white/20 hover:bg-black/40 text-white/80'
                        )}
                      >
                        <span>{emoji}</span><span className="font-semibold">{uids.length}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div
                className="absolute top-1/2 -translate-y-1/2 flex items-center gap-1 p-1 rounded-full bg-slate-800/80 border border-slate-700 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                style={msg.fromUid === uid ? { left: '-3.5rem' } : { right: '-3.5rem' }}
              >
                <button onClick={() => setActiveReactionMessageId(msg.id)} className="w-7 h-7 flex items-center justify-center rounded-full text-slate-300 hover:bg-slate-700 hover:text-white transition-colors" title="React"><SmilePlus size={16} /></button>
                <button onClick={() => onPinMessage(msg)} className="w-7 h-7 flex items-center justify-center rounded-full text-slate-300 hover:bg-slate-700 hover:text-white transition-colors" title={msg.isPinned ? "Unpin" : "Pin"}><Pin size={16} /></button>
              </div>
              {activeReactionMessageId === msg.id && (
                <div ref={reactionPickerRef} className="absolute bottom-full mb-2 z-50">
                  <div className="flex items-center gap-1 p-1.5 rounded-full bg-slate-800 border border-slate-700 shadow-lg">
                    {PREDEFINED_REACTIONS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => { onToggleReaction(msg, emoji); setActiveReactionMessageId(null); }}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-xl hover:bg-slate-700 transition-colors"
                      >{emoji}</button>
                    ))}
                    <button onClick={() => setShowFullReactionPicker(true)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-700 transition-colors text-slate-300"><Smile size={20}/></button>
                  </div>
                  {showFullReactionPicker && (
                    <div className="absolute bottom-12 left-0 z-50 shadow-xl rounded-lg overflow-hidden border border-[var(--glass-border)]">
                      <EmojiPicker
                        onEmojiClick={(emojiData: EmojiClickData) => { onToggleReaction(msg, emojiData.emoji); setActiveReactionMessageId(null); setShowFullReactionPicker(false); }}
                        theme={Theme.DARK}
                        open={showFullReactionPicker}
                      />
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 mt-1 px-1">
                <span className="text-[var(--text-light)] text-[0.65rem]">
                  {msg.fromUsername}{msg.createdAt ? ` · ${formatTime(msg.createdAt)}` : ''}
                </span>
                {msg.fromUid !== uid && (
                  <button
                    onClick={() => onReportMessage(msg)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-red-400 hover:text-red-500 hover:underline cursor-pointer font-medium"
                  >Report</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 p-4 border-t border-[var(--border-color)] relative">
        <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-[var(--text-light)] hover:text-[var(--text-main)] transition-colors p-2">
          <Smile size={24} />
        </button>
        {showEmojiPicker && (
          <div className="absolute bottom-12 left-0 z-50 shadow-xl rounded-lg overflow-hidden border border-[var(--glass-border)]">
            <EmojiPicker
              onEmojiClick={(emojiData: EmojiClickData) => { setMessageText(messageText + emojiData.emoji); setShowEmojiPicker(false); }}
              theme={Theme.DARK}
            />
          </div>
        )}
        <input
          type="text"
          placeholder="Type a message..."
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSendMessage(); }}
          className="flex-1 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[12px] px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:outline-none focus:border-[var(--accent-color)] transition-colors text-sm"
        />
        <button
          type="button"
          onClick={onSendMessage}
          className="bg-[var(--accent-color)] text-white w-10 h-10 rounded-[12px] flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer"
        >Send</button>
      </div>
    </>
  );
}
