'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Crown, Shield, UserMinus, UserPlus, LogOut } from 'lucide-react';
import { GroupChat, GroupMember, GroupRole } from '@/lib/firebase/group-chats';
import { GroupFormValues } from '../types';
import { useGroupAvatarEditor } from '../hooks/useGroupAvatarEditor';
import { GroupAvatarCropModal } from './GroupAvatarCropModal';
import { GroupAvatarEditor } from './GroupAvatarEditor';
import { MemberActionModal } from './MemberActionModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  group: GroupChat;
  mode: 'info' | 'members';
  uid: string | undefined;
  onAddMembers: () => void;
  onLeaveGroup: () => void;
  onDeleteGroup: () => void;
  onPromoteToAdmin: (uid: string, name: string) => Promise<void>;
  onDemoteFromAdmin: (uid: string, name: string) => Promise<void>;
  onRemoveMember: (uid: string, name: string) => Promise<void>;
  onUpdateGroup: (values: GroupFormValues) => Promise<void> | void;
  getUserGroupRole: (group: GroupChat) => GroupRole | null;
  canDeleteGroup: (role: GroupRole | null) => boolean;
  canManageMembers: (role: GroupRole | null) => boolean;
  canPromoteToAdmin: (role: GroupRole | null) => boolean;
}

interface MemberActionState {
  member: GroupMember | null;
  action: 'remove' | 'promote' | 'demote';
}

export function GroupSettingsModal({
  isOpen,
  onClose,
  group,
  mode,
  uid,
  onAddMembers,
  onLeaveGroup,
  onDeleteGroup,
  onPromoteToAdmin,
  onDemoteFromAdmin,
  onRemoveMember,
  onUpdateGroup,
  getUserGroupRole,
  canDeleteGroup,
  canManageMembers,
  canPromoteToAdmin,
}: Props) {
  const role = getUserGroupRole(group);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [memberAction, setMemberAction] = useState<MemberActionState | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const avatarEditor = useGroupAvatarEditor({
    initialAvatarSourceUrl: group.avatar || '',
  });

  if (!isOpen) {
    return null;
  }

  const uniqueMembers = [...new Map((group.members || []).map((member) => [member.uid, member])).values()];

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    void onUpdateGroup({
      name: trimmedName,
      description: description.trim(),
      avatar: avatarEditor.finalAvatar,
    });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(2,6,23,0.85)] backdrop-blur-[8px]"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-[500px] flex-col overflow-hidden rounded-[28px] border border-[var(--glass-border)] bg-[var(--bg-card)] p-5 sm:p-8">
          <button
            type="button"
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-full text-[var(--text-light)] hover:bg-red-500 hover:text-white hover:rotate-90 transition-all duration-200 cursor-pointer z-10"
            onClick={onClose}
          >
            <X size={16} />
          </button>

          {mode === 'info' ? (
            <>
              <h3 className="text-xl font-bold text-[var(--text-main)] mb-6 text-center">Group Settings</h3>
              <div className="space-y-4 flex-1 overflow-y-auto">
                <GroupAvatarEditor
                  avatarPreview={avatarEditor.avatarPreview}
                  avatarSourceUrl={avatarEditor.avatarSourceUrl}
                  error={avatarEditor.error}
                  onAvatarSourceChange={avatarEditor.handleAvatarSourceChange}
                  onStartCrop={avatarEditor.handleStartCrop}
                  onRemovePhoto={avatarEditor.handleRemovePhoto}
                />

                <div>
                  <label className="block text-sm font-medium text-[var(--text-main)] mb-2">Group Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[12px] px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:outline-none focus:border-[var(--accent-color)] transition-colors text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-main)] mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={3}
                    className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[12px] px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:outline-none focus:border-[var(--accent-color)] transition-colors text-sm resize-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                {canDeleteGroup(role) && (
                  <button
                    type="button"
                    className="flex-1 bg-red-500/10 text-red-500 border border-red-500/30 font-semibold px-4 py-2.5 rounded-[12px] hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                    onClick={onDeleteGroup}
                  >
                    Delete Group
                  </button>
                )}
                <button
                  type="button"
                  className="flex-1 bg-[var(--accent-color)] text-white font-semibold px-4 py-2.5 rounded-[12px] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSave}
                  disabled={!name.trim()}
                >
                  Save Changes
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold text-[var(--text-main)] mb-2 text-center">
                Members ({group.members?.length || 0})
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2 my-4">
                {uniqueMembers.map((member) => {
                  const isCreator = member.role === 'creator';
                  const isAdmin = member.role === 'admin';
                  const isMe = member.uid === uid;
                  const canManage = canManageMembers(role);
                  const canPromote = canPromoteToAdmin(role);

                  return (
                    <div
                      key={member.uid}
                      className="flex items-center gap-3 p-3 rounded-[12px] bg-[var(--bg-sidebar)] border border-[var(--border-color)]"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-[var(--bg-card)]">
                        {member.photoURL ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={member.photoURL} alt={member.username} width={40} height={40} />
                        ) : (
                          <Image src="/img/default-avatar.png" alt={member.username} width={40} height={40} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--text-main)] truncate">
                            {member.username} {isMe && <span className="text-[var(--text-light)]">(You)</span>}
                          </span>
                          {isCreator && <Crown size={14} className="text-amber-500 fill-amber-500/20 flex-shrink-0" />}
                          {isAdmin && !isCreator && <Shield size={14} className="text-blue-400 flex-shrink-0" />}
                        </div>
                        <span className="text-xs text-[var(--text-light)]">
                          {isCreator ? 'Creator' : isAdmin ? 'Admin' : 'Member'}
                        </span>
                      </div>
                      {canManage && !isCreator && !isMe && (
                        <div className="flex gap-1">
                          {canPromote && !isAdmin && (
                            <button
                              type="button"
                              onClick={() => setMemberAction({ member, action: 'promote' })}
                              className="p-2 rounded-full hover:bg-[var(--accent-color)]/20 text-[var(--text-light)] hover:text-[var(--accent-color)] transition-colors"
                              title="Promote to Admin"
                            >
                              <Shield size={16} />
                            </button>
                          )}
                          {isAdmin && canPromote && (
                            <button
                              type="button"
                              onClick={() => setMemberAction({ member, action: 'demote' })}
                              className="p-2 rounded-full hover:bg-amber-500/20 text-[var(--text-light)] hover:text-amber-500 transition-colors"
                              title="Remove Admin"
                            >
                              <Shield size={16} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setMemberAction({ member, action: 'remove' })}
                            className="p-2 rounded-full hover:bg-red-500/20 text-[var(--text-light)] hover:text-red-500 transition-colors"
                            title="Remove Member"
                          >
                            <UserMinus size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 mt-4">
                {canManageMembers(role) && (
                  <button
                    type="button"
                    className="flex-1 flex items-center justify-center gap-2 bg-[var(--accent-color)] text-white font-semibold px-4 py-2.5 rounded-[12px] hover:opacity-90 transition-opacity cursor-pointer"
                    onClick={onAddMembers}
                  >
                    <UserPlus size={16} /> Add Members
                  </button>
                )}
                <button
                  type="button"
                  className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border border-red-500/30 font-semibold px-4 py-2.5 rounded-[12px] hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                  onClick={onLeaveGroup}
                >
                  <LogOut size={16} /> Leave Group
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <MemberActionModal
        isOpen={!!memberAction}
        onClose={() => setMemberAction(null)}
        onConfirm={async () => {
          if (!memberAction?.member) {
            return;
          }

          setIsActionLoading(true);

          try {
            if (memberAction.action === 'remove') {
              await onRemoveMember(memberAction.member.uid, memberAction.member.username);
            } else if (memberAction.action === 'promote') {
              await onPromoteToAdmin(memberAction.member.uid, memberAction.member.username);
            } else if (memberAction.action === 'demote') {
              await onDemoteFromAdmin(memberAction.member.uid, memberAction.member.username);
            }

            setMemberAction(null);
          } finally {
            setIsActionLoading(false);
          }
        }}
        action={memberAction?.action || 'remove'}
        member={
          memberAction?.member
            ? {
                uid: memberAction.member.uid,
                username: memberAction.member.username,
                photoURL: memberAction.member.photoURL,
                role: memberAction.member.role,
              }
            : null
        }
        isLoading={isActionLoading}
      />

      {avatarEditor.showCropModal && avatarEditor.cropImageSrc && (
        <GroupAvatarCropModal
          crop={avatarEditor.crop}
          image={avatarEditor.cropImageSrc}
          onApply={() => {
            void avatarEditor.handleCropConfirm();
          }}
          onCancel={avatarEditor.handleCropCancel}
          onCropChange={avatarEditor.setCrop}
          onCropComplete={avatarEditor.handleCropComplete}
          onZoomChange={avatarEditor.setZoom}
          zoom={avatarEditor.zoom}
        />
      )}
    </>
  );
}
