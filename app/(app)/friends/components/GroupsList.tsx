'use client';

import { Users, Plus, Crown, Shield } from 'lucide-react';
import { GroupChat, GroupRole } from '@/lib/firebase/group-chats';

interface Props {
  groupChats: GroupChat[];
  activeGroupChat: GroupChat | null;
  statusMsg: string;
  onCreateClick: () => void;
  onOpenGroup: (group: GroupChat) => void;
  getUserGroupRole: (group: GroupChat) => GroupRole | null;
  getGroupMemberCount: (group: GroupChat) => number;
}

export function GroupsList({
  groupChats,
  activeGroupChat,
  statusMsg,
  onCreateClick,
  onOpenGroup,
  getUserGroupRole,
  getGroupMemberCount,
}: Props) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-[var(--text-main)] text-base">Groups</h3>
        <button
          type="button"
          onClick={onCreateClick}
          className="flex items-center gap-1 bg-[var(--accent-color)] text-white text-xs font-semibold px-3 py-1.5 rounded-[8px] hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Plus size={14} /> New
        </button>
      </div>
      {statusMsg && (
        <div className="text-xs text-[var(--accent-color)] bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] rounded-[8px] px-3 py-1.5">
          {statusMsg}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
        {groupChats.length === 0 && (
          <p className="text-[var(--text-light)] text-sm text-center py-4">No groups yet. Create one!</p>
        )}
        {groupChats.map((group) => {
          const role = getUserGroupRole(group);
          return (
            <div
              key={group.id}
              className={`flex items-center gap-3 p-3 rounded-[12px] border cursor-pointer transition-all${
                activeGroupChat?.id === group.id
                  ? ' bg-[var(--bg-item-active)] border-[var(--accent-color)]/30'
                  : ' border-transparent hover:bg-[var(--bg-sidebar)] hover:border-[var(--border-color)]'
              }`}
              onClick={() => onOpenGroup(group)}
            >
              <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-[var(--bg-sidebar)] flex items-center justify-center">
                {group.avatar ? (
                  <img src={group.avatar} alt={group.name} width={44} height={44} />
                ) : (
                  <Users size={20} className="text-[var(--text-light)]" />
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-center gap-2">
                  <strong className="text-[var(--text-main)] text-sm font-semibold truncate">{group.name}</strong>
                  {role === 'creator' && <Crown size={12} className="text-amber-500 fill-amber-500/20 flex-shrink-0" />}
                  {role === 'admin' && <Shield size={12} className="text-blue-400 flex-shrink-0" />}
                </div>
                {group.lastMessage ? (
                  <span className="text-xs text-[var(--text-light)] truncate">
                    {group.lastMessageFrom}: {group.lastMessage}
                  </span>
                ) : (
                  <span className="text-[var(--text-light)] text-xs italic opacity-50">No messages yet</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[var(--text-light)]">
                <Users size={14} /><span className="text-xs">{getGroupMemberCount(group)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
