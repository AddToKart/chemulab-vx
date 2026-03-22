'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { X, Users } from 'lucide-react';
import Cropper, { Area } from 'react-easy-crop';
import { getCroppedImg } from '@/lib/utils/crop-image';
import { cn } from '@/lib/utils';
import { FriendData } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  friends: FriendData[];
  selectedFriends: string[];
  setSelectedFriends: (v: string[]) => void;
  groupAvatar: string;
  setGroupAvatar: (v: string) => void;
  groupAvatarSource: string;
  setGroupAvatarSource: (v: string) => void;
}

export function CreateGroupModal({
  isOpen,
  onClose,
  onSubmit,
  friends,
  selectedFriends,
  setSelectedFriends,
  groupAvatar,
  setGroupAvatar,
  groupAvatarSource,
  setGroupAvatarSource,
}: Props) {
  // All hooks before conditional return
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [error, setError] = useState('');

  const handleStartCrop = useCallback(() => {
    if (!groupAvatarSource) {
      setError('Please provide an image URL first.');
      return;
    }
    const isDataUrl = groupAvatarSource.startsWith('data:');
    const isLocalUrl = groupAvatarSource.startsWith('/') || groupAvatarSource.startsWith('http://localhost') || groupAvatarSource.startsWith('http://192.168');
    const finalUrl = (isDataUrl || isLocalUrl)
      ? groupAvatarSource
      : `/api/image-proxy?url=${encodeURIComponent(groupAvatarSource)}`;
    setCropImageSrc(finalUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setError('');
    setShowCropModal(true);
  }, [groupAvatarSource]);

  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleCropConfirm = useCallback(async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;
    try {
      const croppedDataUrl = await getCroppedImg(cropImageSrc, croppedAreaPixels, 256);
      setGroupAvatar(croppedDataUrl);
      // groupAvatarSource (the URL input) stays unchanged - retains the original URL
      setShowCropModal(false);
      setCropImageSrc(null);
      setError('');
    } catch {
      setError('Failed to crop image. Please try again.');
    }
  }, [cropImageSrc, croppedAreaPixels, setGroupAvatar]);

  const handleCropCancel = useCallback(() => {
    setCropImageSrc(null);
    setShowCropModal(false);
  }, []);

  const handleRemovePhoto = useCallback(() => {
    setGroupAvatar('');
    setGroupAvatarSource('');
  }, [setGroupAvatar, setGroupAvatarSource]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(2,6,23,0.85)] backdrop-blur-[8px]"
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
          <h3 className="text-xl font-bold text-[var(--text-main)] mb-6 text-center">Create Group Chat</h3>
          <div className="space-y-4">
            {/* Group Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-[var(--bg-sidebar)] flex items-center justify-center border-4 border-[var(--accent-color)]/30">
                {/* Show cropped image if available, otherwise show original URL preview */}
                {(groupAvatar || groupAvatarSource) ? (
                  <img src={groupAvatar || groupAvatarSource} alt="Group avatar" className="w-full h-full object-cover" />
                ) : (
                  <Users size={32} className="text-[var(--text-light)]" />
                )}
              </div>
              <input
                type="text"
                placeholder="Paste photo URL (optional)..."
                value={groupAvatarSource}
                onChange={(e) => {
                  const val = e.target.value;
                  setGroupAvatarSource(val);
                  // Clear cropped data when URL changes, but keep the URL
                  if (groupAvatar && val !== groupAvatarSource) {
                    setGroupAvatar('');
                  }
                }}
                className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[12px] px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:outline-none focus:border-[var(--accent-color)] transition-colors text-sm"
              />
              <div className="w-full flex gap-2">
                <button
                  type="button"
                  onClick={handleStartCrop}
                  disabled={!groupAvatarSource}
                  className="flex-1 bg-[var(--accent-color)] text-white font-semibold px-4 py-2 rounded-[12px] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Crop
                </button>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={!groupAvatar && !groupAvatarSource}
                  className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/30 rounded-[12px] text-xs font-semibold hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Remove
                </button>
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>

            {/* Group Name */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-main)] mb-2">Group Name *</label>
              <input id="groupName" type="text" placeholder="Enter group name..."
                className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[12px] px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:outline-none focus:border-[var(--accent-color)] transition-colors text-sm" />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-main)] mb-2">Description (optional)</label>
              <textarea id="groupDesc" placeholder="Enter description..." rows={3}
                className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[12px] px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:outline-none focus:border-[var(--accent-color)] transition-colors text-sm resize-none" />
            </div>

            {/* Members */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-main)] mb-2">Add Members *</label>
              <div className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[12px] p-3 max-h-[200px] overflow-y-auto">
                {friends.length === 0 ? (
                  <p className="text-[var(--text-light)] text-sm text-center py-2">No friends to add.</p>
                ) : (
                  <div className="space-y-2">
                    {friends.map((friend) => (
                      <div
                        key={friend.uid}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-[8px] cursor-pointer transition-all",
                          selectedFriends.includes(friend.uid)
                            ? 'bg-[var(--accent-color)]/20 border border-[var(--accent-color)]/30'
                            : 'hover:bg-[var(--bg-card)] border border-transparent'
                        )}
                        onClick={() => {
                          setSelectedFriends(
                            selectedFriends.includes(friend.uid)
                              ? selectedFriends.filter(id => id !== friend.uid)
                              : [...selectedFriends, friend.uid]
                          );
                        }}
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[var(--bg-sidebar)]">
                          {friend.photoURL ? <img src={friend.photoURL} alt={friend.username} width={32} height={32} /> : <Image src="/img/default-avatar.png" alt={friend.username} width={32} height={32} />}
                        </div>
                        <span className="text-sm text-[var(--text-main)] flex-1 truncate">{friend.username}</span>
                        {selectedFriends.includes(friend.uid) && (
                          <div className="w-5 h-5 rounded-full bg-[var(--accent-color)] flex items-center justify-center">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-[var(--text-light)] mt-2">{selectedFriends.length} member{selectedFriends.length !== 1 ? 's' : ''} selected</p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button type="button" className="flex-1 bg-[var(--bg-sidebar)] text-[var(--text-light)] border border-[var(--border-color)] font-semibold px-4 py-2.5 rounded-[12px] hover:border-[var(--accent-color)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              onClick={onClose}>Cancel</button>
            <button type="button" className="flex-1 bg-[var(--accent-color)] text-white font-semibold px-4 py-2.5 rounded-[12px] hover:opacity-90 transition-opacity cursor-pointer"
              onClick={onSubmit}>Create Group</button>
          </div>
        </div>
      </div>

      {/* Crop Modal */}
      {showCropModal && cropImageSrc && (
        <div className="fixed inset-0 z-[2500] flex flex-col items-center justify-center bg-[rgba(2,6,23,0.92)] backdrop-blur-[10px]">
          <div className="w-full max-w-[500px] flex flex-col bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-[28px] overflow-hidden">
            <div className="px-6 pt-5 pb-3">
              <h3 className="text-lg font-bold text-[var(--text-main)]">Crop Group Photo</h3>
              <p className="text-xs text-[var(--text-light)] mt-1">Drag to reposition. Scroll or use slider to zoom.</p>
            </div>
            <div className="relative w-full" style={{ height: 340 }}>
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="px-6 py-3">
              <label className="text-xs font-semibold text-[var(--text-light)] mb-1 block">Zoom</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-[var(--accent-color)] h-1.5 rounded-full"
              />
            </div>
            <div className="flex gap-3 px-6 pb-5">
              <button
                type="button"
                className="flex-1 bg-[var(--accent-color)] text-white font-semibold px-6 py-2.5 rounded-[12px] hover:opacity-90 transition-opacity cursor-pointer"
                onClick={handleCropConfirm}
              >
                Apply Crop
              </button>
              <button
                type="button"
                className="flex-1 bg-[var(--bg-sidebar)] border border-[var(--border-color)] text-[var(--text-main)] font-semibold px-6 py-2.5 rounded-[12px] hover:border-[var(--accent-color)] transition-all cursor-pointer"
                onClick={handleCropCancel}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
