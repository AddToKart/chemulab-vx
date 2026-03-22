'use client';

import Image from 'next/image';
import { X, UserPlus } from 'lucide-react';
import { FriendData } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  friends: FriendData[];
  currentMemberIds: string[];
  onAddMember: (uid: string) => void;
}

export function AddMembersModal({
  isOpen,
  onClose,
  friends,
  currentMemberIds,
  onAddMember,
}: Props) {
  if (!isOpen) return null;

  const availableFriends = friends.filter(f => !currentMemberIds.includes(f.uid));

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-center justify-center bg-[rgba(2,6,23,0.85)] backdrop-blur-[8px]"
      onClick={(e) => { if (e.target === e.currentTarget) { onClose(); } }}
    >
      <div className="bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-[28px] p-8 w-[450px] max-[500px]:w-[90%] relative">
        <button
          type="button"
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-full text-[var(--text-light)] hover:bg-red-500 hover:text-white hover:rotate-90 transition-all duration-200 cursor-pointer"
          onClick={onClose}
        >
          <X size={16} />
        </button>
        <h3 className="text-xl font-bold text-[var(--text-main)] mb-6 text-center">Add Members</h3>
        <div className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[12px] p-3 max-h-[300px] overflow-y-auto">
          {availableFriends.length === 0 ? (
            <p className="text-[var(--text-light)] text-sm text-center py-4">
              All your friends are already in this group!
            </p>
          ) : (
            <div className="space-y-2">
              {availableFriends.map((friend) => (
                <div
                  key={friend.uid}
                  className="flex items-center gap-3 p-2 rounded-[8px] hover:bg-[var(--bg-card)] cursor-pointer transition-all"
                  onClick={() => onAddMember(friend.uid)}
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[var(--bg-card)]">
                    {friend.photoURL ? (
                      <img src={friend.photoURL} alt={friend.username} width={32} height={32} />
                    ) : (
                      <Image src="/img/default-avatar.png" alt={friend.username} width={32} height={32} />
                    )}
                  </div>
                  <span className="text-sm text-[var(--text-main)] flex-1 truncate">{friend.username}</span>
                  <UserPlus size={16} className="text-[var(--text-light)]" />
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className="w-full mt-4 bg-[var(--bg-sidebar)] text-[var(--text-light)] border border-[var(--border-color)] font-semibold px-4 py-2.5 rounded-[12px] hover:border-[var(--accent-color)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          onClick={onClose}
        >
          Done
        </button>
      </div>
    </div>
  );
}
