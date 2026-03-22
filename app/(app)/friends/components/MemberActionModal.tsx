'use client';

import { X, Shield, UserMinus, AlertTriangle } from 'lucide-react';
import Image from 'next/image';

interface MemberInfo {
  uid: string;
  username: string;
  photoURL?: string;
  role: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: 'remove' | 'promote' | 'demote';
  member: MemberInfo | null;
  isLoading?: boolean;
}

export function MemberActionModal({
  isOpen,
  onClose,
  onConfirm,
  action,
  member,
  isLoading = false,
}: Props) {
  if (!isOpen || !member) return null;

  const getConfig = () => {
    switch (action) {
      case 'remove':
        return {
          title: 'Remove Member',
          icon: <UserMinus size={24} className="text-red-500" />,
          message: `Are you sure you want to remove ${member.username} from the group?`,
          warning: 'They will no longer be able to see group messages or participate in the group.',
          confirmText: 'Remove',
          confirmClass: 'bg-red-500 hover:bg-red-600',
        };
      case 'promote':
        return {
          title: 'Promote to Admin',
          icon: <Shield size={24} className="text-blue-400" />,
          message: `Promote ${member.username} to Admin?`,
          warning: 'Admins can edit group info, add/remove members, and pin messages.',
          confirmText: 'Promote',
          confirmClass: 'bg-blue-500 hover:bg-blue-600',
        };
      case 'demote':
        return {
          title: 'Remove Admin Role',
          icon: <Shield size={24} className="text-amber-500" />,
          message: `Remove admin privileges from ${member.username}?`,
          warning: 'They will become a regular member with limited permissions.',
          confirmText: 'Remove Admin',
          confirmClass: 'bg-amber-500 hover:bg-amber-600',
        };
    }
  };

  const config = getConfig();

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-[rgba(2,6,23,0.85)] backdrop-blur-[8px]"
      onClick={(e) => { if (e.target === e.currentTarget && !isLoading) onClose(); }}
    >
      <div className="bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-[24px] p-6 w-[400px] max-[450px]:w-[90%] relative">
        <button
          type="button"
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-full text-[var(--text-light)] hover:bg-red-500 hover:text-white hover:rotate-90 transition-all duration-200 cursor-pointer z-10"
          onClick={onClose}
          disabled={isLoading}
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-[var(--bg-sidebar)] flex items-center justify-center mb-4">
            {config.icon}
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">{config.title}</h3>

          {/* Member Info */}
          <div className="flex items-center gap-3 p-3 rounded-[12px] bg-[var(--bg-sidebar)] border border-[var(--border-color)] w-full mb-4">
            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-[var(--bg-card)]">
              {member.photoURL ? (
                <img src={member.photoURL} alt={member.username} className="w-full h-full object-cover" />
              ) : (
                <Image src="/img/default-avatar.png" alt={member.username} width={48} height={48} />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-[var(--text-main)]">{member.username}</p>
              <p className="text-xs text-[var(--text-light)] capitalize">{member.role}</p>
            </div>
          </div>

          {/* Message */}
          <p className="text-sm text-[var(--text-main)] mb-2">{config.message}</p>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 rounded-[12px] bg-amber-500/10 border border-amber-500/20 w-full mb-6">
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/80 text-left">{config.warning}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 bg-[var(--bg-sidebar)] border border-[var(--border-color)] text-[var(--text-main)] font-semibold px-4 py-2.5 rounded-[12px] hover:border-[var(--accent-color)] transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 text-white font-semibold px-4 py-2.5 rounded-[12px] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 ${config.confirmClass}`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Processing...
                </>
              ) : (
                config.confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
