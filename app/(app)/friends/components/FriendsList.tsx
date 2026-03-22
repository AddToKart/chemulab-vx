'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { FriendData } from '../types';

interface Props {
  friends: FriendData[];
  activeChat: { friendUid: string } | null;
  uid: string | undefined;
  username: string | undefined;
  friendEmail: string;
  setFriendEmail: (v: string) => void;
  onAddFriend: () => void;
  onOpenChat: (friend: FriendData) => void;
  statusMsg: string;
}

export function FriendsList({
  friends,
  activeChat,
  uid,
  username,
  friendEmail,
  setFriendEmail,
  onAddFriend,
  onOpenChat,
  statusMsg,
}: Props) {
  return (
    <>
      <h3 className="font-bold text-[var(--text-main)] text-base">Friends</h3>
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="Friend's email"
          value={friendEmail}
          onChange={(e) => setFriendEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onAddFriend(); }}
          className="flex-1 min-w-0 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[12px] px-4 py-2 text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:outline-none focus:border-[var(--accent-color)] transition-colors text-sm"
        />
        <button
          type="button"
          onClick={onAddFriend}
          className="bg-[var(--accent-color)] text-white font-semibold px-4 py-2 rounded-[10px] text-sm hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
        >
          Add
        </button>
      </div>
      {statusMsg && (
        <div className="text-xs text-[var(--accent-color)] bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] rounded-[8px] px-3 py-1.5">
          {statusMsg}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
        {friends.length === 0 && (
          <p className="text-[var(--text-light)] text-sm text-center py-4">
            No friends yet. Add someone by email!
          </p>
        )}
        {friends.map((friend) => (
          <div
            key={friend.uid}
            className={`flex items-center gap-3 p-3 rounded-[12px] border cursor-pointer transition-all${
              activeChat?.friendUid === friend.uid
                ? ' bg-[var(--bg-item-active)] border-[var(--accent-color)]/30'
                : ' border-transparent hover:bg-[var(--bg-sidebar)] hover:border-[var(--border-color)]'
            }`}
            onClick={() => onOpenChat(friend)}
          >
            <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-[var(--bg-sidebar)]">
              {friend.photoURL ? (
                <img src={friend.photoURL} alt={friend.username} width={44} height={44} />
              ) : (
                <Image src="/img/default-avatar.png" alt={friend.username} width={44} height={44} />
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <strong className="text-[var(--text-main)] text-sm font-semibold truncate">
                {friend.username}
              </strong>
              {friend.lastMessage ? (
                <span
                  className={cn(
                    "text-xs truncate transition-colors",
                    uid && friend.unreadBy?.includes(uid)
                      ? "text-[var(--text-main)] font-bold"
                      : "text-[var(--text-light)]"
                  )}
                >
                  {friend.lastMessageFrom === username ? 'You' : friend.lastMessageFrom}: {friend.lastMessage}
                </span>
              ) : (
                <span className="text-[var(--text-light)] text-xs italic opacity-50">No messages yet</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
