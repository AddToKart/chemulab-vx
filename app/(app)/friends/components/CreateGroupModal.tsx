'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGroupAvatarEditor } from '../hooks/useGroupAvatarEditor';
import { CreateGroupFormValues, FriendData } from '../types';
import { GroupAvatarCropModal } from './GroupAvatarCropModal';
import { GroupAvatarEditor } from './GroupAvatarEditor';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: CreateGroupFormValues) => Promise<void> | void;
  friends: FriendData[];
}

export function CreateGroupModal({ isOpen, onClose, onSubmit, friends }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const avatarEditor = useGroupAvatarEditor();

  if (!isOpen) {
    return null;
  }

  const handleToggleFriend = (friendUid: string) => {
    setSelectedFriendIds((currentFriendIds) =>
      currentFriendIds.includes(friendUid)
        ? currentFriendIds.filter((id) => id !== friendUid)
        : [...currentFriendIds, friendUid],
    );
  };

  const handleSubmit = () => {
    void onSubmit({
      name: name.trim(),
      description: description.trim(),
      avatar: avatarEditor.finalAvatar,
      selectedFriendIds,
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
        <div className="relative w-full max-w-[450px] rounded-[28px] border border-[var(--glass-border)] bg-[var(--bg-card)] p-5 sm:p-8">
          <button
            type="button"
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-full text-[var(--text-light)] hover:bg-red-500 hover:text-white hover:rotate-90 transition-all duration-200 cursor-pointer"
            onClick={onClose}
          >
            <X size={16} />
          </button>
          <h3 className="text-xl font-bold text-[var(--text-main)] mb-6 text-center">Create Group Chat</h3>

          <div className="space-y-4">
            <GroupAvatarEditor
              avatarPreview={avatarEditor.avatarPreview}
              avatarSourceUrl={avatarEditor.avatarSourceUrl}
              error={avatarEditor.error}
              onAvatarSourceChange={avatarEditor.handleAvatarSourceChange}
              onStartCrop={avatarEditor.handleStartCrop}
              onRemovePhoto={avatarEditor.handleRemovePhoto}
              placeholder="Paste photo URL (optional)..."
            />

            <div>
              <label className="block text-sm font-medium text-[var(--text-main)] mb-2">Group Name *</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter group name..."
                className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[12px] px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:outline-none focus:border-[var(--accent-color)] transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-main)] mb-2">Description (optional)</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Enter description..."
                rows={3}
                className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[12px] px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:outline-none focus:border-[var(--accent-color)] transition-colors text-sm resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-main)] mb-2">Add Members *</label>
              <div className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[12px] p-3 max-h-[200px] overflow-y-auto">
                {friends.length === 0 ? (
                  <p className="text-[var(--text-light)] text-sm text-center py-2">No friends to add.</p>
                ) : (
                  <div className="space-y-2">
                    {friends.map((friend) => {
                      const isSelected = selectedFriendIds.includes(friend.uid);

                      return (
                        <div
                          key={friend.uid}
                          className={cn(
                            'flex items-center gap-3 p-2 rounded-[8px] cursor-pointer transition-all',
                            isSelected
                              ? 'bg-[var(--accent-color)]/20 border border-[var(--accent-color)]/30'
                              : 'hover:bg-[var(--bg-card)] border border-transparent',
                          )}
                          onClick={() => handleToggleFriend(friend.uid)}
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[var(--bg-sidebar)]">
                            {friend.photoURL ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={friend.photoURL} alt={friend.username} width={32} height={32} />
                            ) : (
                              <Image src="/img/default-avatar.png" alt={friend.username} width={32} height={32} />
                            )}
                          </div>
                          <span className="text-sm text-[var(--text-main)] flex-1 truncate">{friend.username}</span>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-[var(--accent-color)] flex items-center justify-center">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="text-xs text-[var(--text-light)] mt-2">
                {selectedFriendIds.length} member{selectedFriendIds.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              className="flex-1 bg-[var(--bg-sidebar)] text-[var(--text-light)] border border-[var(--border-color)] font-semibold px-4 py-2.5 rounded-[12px] hover:border-[var(--accent-color)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="flex-1 bg-[var(--accent-color)] text-white font-semibold px-4 py-2.5 rounded-[12px] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSubmit}
              disabled={!name.trim() || selectedFriendIds.length < 1}
            >
              Create Group
            </button>
          </div>
        </div>
      </div>

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
