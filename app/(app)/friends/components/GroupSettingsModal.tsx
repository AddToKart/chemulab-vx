'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { X, Crown, Shield, UserMinus, UserPlus, LogOut, Users } from 'lucide-react';
import Cropper, { Area } from 'react-easy-crop';
import { getCroppedImg } from '@/lib/utils/crop-image';
import { GroupChat, GroupRole, GroupMember } from '@/lib/firebase/group-chats';
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
  onUpdateGroup: (name: string, desc: string, avatar: string) => void;
  getUserGroupRole: (group: GroupChat) => GroupRole | null;
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
  canManageMembers,
  canPromoteToAdmin,
}: Props) {
  // All hooks must be called before any conditional returns
  const role = getUserGroupRole(group);
  const [memberAction, setMemberAction] = useState<MemberActionState | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  // Original URL from input (never changes after paste, used for re-cropping)
  const [avatarSourceUrl, setAvatarSourceUrl] = useState<string | null>(group?.avatar || null);
  // Cropped image data (base64)
  const [croppedData, setCroppedData] = useState<string | null>(null);
  // Display preview: shows cropped if available, otherwise original URL
  const avatarPreview = croppedData || avatarSourceUrl;

  // Sync avatarSourceUrl when group avatar changes (e.g., after save)
  useEffect(() => {
    if (group?.avatar && !croppedData) {
      setAvatarSourceUrl(group.avatar);
    }
  }, [group?.avatar, croppedData]);
  
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [error, setError] = useState('');

  // Start cropping flow - always uses the original URL from avatarSourceUrl
  const handleStartCrop = useCallback(() => {
    if (!avatarSourceUrl) {
      setError('Please provide an image URL first.');
      return;
    }

    const isDataUrl = avatarSourceUrl.startsWith('data:');
    const isLocalUrl = avatarSourceUrl.startsWith('/') || avatarSourceUrl.startsWith('http://localhost') || avatarSourceUrl.startsWith('http://192.168');

    const finalUrl = (isDataUrl || isLocalUrl)
      ? avatarSourceUrl
      : `/api/image-proxy?url=${encodeURIComponent(avatarSourceUrl)}`;

    setCropImageSrc(finalUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setError('');
    setShowCropModal(true);
  }, [avatarSourceUrl, setCrop, setZoom]);

  // Crop complete callback
  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  // Confirm crop - keeps original URL in avatarSourceUrl, stores cropped data separately
  const handleCropConfirm = useCallback(async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;
    try {
      const croppedDataUrl = await getCroppedImg(cropImageSrc, croppedAreaPixels, 256);
      setCroppedData(croppedDataUrl);
      // avatarSourceUrl stays unchanged - retains the original URL
      setShowCropModal(false);
      setCropImageSrc(null);
    } catch {
      setError('Failed to crop image. Please try again.');
    }
  }, [cropImageSrc, croppedAreaPixels]);

  // Cancel crop
  const handleCropCancel = useCallback(() => {
    setCropImageSrc(null);
    setShowCropModal(false);
  }, []);

  // Remove photo - clears both cropped data and source URL
  const handleRemovePhoto = useCallback(() => {
    setAvatarSourceUrl(null);
    setCroppedData(null);
  }, []);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(2,6,23,0.85)] backdrop-blur-[8px]"
        onClick={(e) => { if (e.target === e.currentTarget) { onClose(); } }}
      >
        <div className="bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-[28px] p-8 w-[500px] max-[600px]:w-[90%] relative max-h-[80vh] overflow-hidden flex flex-col">
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
                {/* Group Avatar */}
                <div className="flex flex-col items-center gap-3">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-[var(--bg-sidebar)] flex items-center justify-center border-4 border-[var(--accent-color)]/30">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Group avatar"
                        className="w-full h-full object-cover"
                        onError={() => setError('Failed to load image')}
                      />
                    ) : (
                      <Users size={32} className="text-[var(--text-light)]" />
                    )}
                  </div>
                  <div className="w-full flex gap-2">
                    <input
                      id="editGroupAvatar"
                      type="text"
                      value={avatarSourceUrl || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAvatarSourceUrl(val || null);
                        setCroppedData(null);
                        setError('');
                      }}
                      placeholder="Paste photo URL..."
                      className="flex-1 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[12px] px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:outline-none focus:border-[var(--accent-color)] transition-colors text-sm"
                    />
                  </div>
                  <div className="w-full flex gap-2">
                    <button
                      type="button"
                      onClick={handleStartCrop}
                      disabled={!avatarSourceUrl}
                      className="flex-1 bg-[var(--accent-color)] text-white font-semibold px-4 py-2 rounded-[12px] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Crop
                    </button>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={!avatarPreview}
                      className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/30 rounded-[12px] text-xs font-semibold hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Remove
                    </button>
                  </div>
                  {error && (
                    <p className="text-xs text-red-400">{error}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-main)] mb-2">Group Name</label>
                  <input id="editGroupName" type="text" defaultValue={group.name}
                    className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[12px] px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:outline-none focus:border-[var(--accent-color)] transition-colors text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-main)] mb-2">Description</label>
                  <textarea id="editGroupDesc" defaultValue={group.description || ''} rows={3}
                    className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[12px] px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:outline-none focus:border-[var(--accent-color)] transition-colors text-sm resize-none" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" className="flex-1 bg-red-500/10 text-red-500 border border-red-500/30 font-semibold px-4 py-2.5 rounded-[12px] hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                  onClick={onDeleteGroup}>Delete Group</button>
                <button type="button" className="flex-1 bg-[var(--accent-color)] text-white font-semibold px-4 py-2.5 rounded-[12px] hover:opacity-90 transition-opacity cursor-pointer"
                  onClick={() => {
                    const name = (document.getElementById('editGroupName') as HTMLInputElement)?.value?.trim();
                    const desc = (document.getElementById('editGroupDesc') as HTMLTextAreaElement)?.value?.trim();
                    // Use cropped data if available, otherwise use the original URL
                    const finalAvatar = croppedData || avatarSourceUrl || '';
                    if (name) onUpdateGroup(name, desc || '', finalAvatar);
                  }}>Save Changes</button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold text-[var(--text-main)] mb-2 text-center">Members ({group.members?.length || 0})</h3>
              <div className="flex-1 overflow-y-auto space-y-2 my-4">
                {[...new Map((group.members || []).map(m => [m.uid, m])).values()].map((member) => {
                  const isCreator = member.role === 'creator';
                  const isAdmin = member.role === 'admin';
                  const isMe = member.uid === uid;
                  const canManage = canManageMembers(role);
                  const canPromote = canPromoteToAdmin(role);
                  return (
                    <div key={member.uid} className="flex items-center gap-3 p-3 rounded-[12px] bg-[var(--bg-sidebar)] border border-[var(--border-color)]">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-[var(--bg-card)]">
                        {member.photoURL ? <img src={member.photoURL} alt={member.username} width={40} height={40} /> : <Image src="/img/default-avatar.png" alt={member.username} width={40} height={40} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--text-main)] truncate">
                            {member.username} {isMe && <span className="text-[var(--text-light)]">(You)</span>}
                          </span>
                          {isCreator && <Crown size={14} className="text-amber-500 fill-amber-500/20 flex-shrink-0" />}
                          {isAdmin && !isCreator && <Shield size={14} className="text-blue-400 flex-shrink-0" />}
                        </div>
                        <span className="text-xs text-[var(--text-light)]">{isCreator ? 'Creator' : isAdmin ? 'Admin' : 'Member'}</span>
                      </div>
                      {canManage && !isCreator && !isMe && (
                        <div className="flex gap-1">
                          {canPromote && !isAdmin && (
                            <button type="button" onClick={() => setMemberAction({ member, action: 'promote' })}
                              className="p-2 rounded-full hover:bg-[var(--accent-color)]/20 text-[var(--text-light)] hover:text-[var(--accent-color)] transition-colors" title="Promote to Admin">
                              <Shield size={16} />
                            </button>
                          )}
                          {isAdmin && canPromote && (
                            <button type="button" onClick={() => setMemberAction({ member, action: 'demote' })}
                              className="p-2 rounded-full hover:bg-amber-500/20 text-[var(--text-light)] hover:text-amber-500 transition-colors" title="Remove Admin">
                              <Shield size={16} />
                            </button>
                          )}
                          <button type="button" onClick={() => setMemberAction({ member, action: 'remove' })}
                            className="p-2 rounded-full hover:bg-red-500/20 text-[var(--text-light)] hover:text-red-500 transition-colors" title="Remove Member">
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
                  <button type="button" className="flex-1 flex items-center justify-center gap-2 bg-[var(--accent-color)] text-white font-semibold px-4 py-2.5 rounded-[12px] hover:opacity-90 transition-opacity cursor-pointer"
                    onClick={onAddMembers}>
                    <UserPlus size={16} /> Add Members
                  </button>
                )}
                <button type="button" className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border border-red-500/30 font-semibold px-4 py-2.5 rounded-[12px] hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                  onClick={onLeaveGroup}>
                  <LogOut size={16} /> Leave Group
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Member Action Confirmation Modal */}
      <MemberActionModal
        isOpen={!!memberAction}
        onClose={() => setMemberAction(null)}
        onConfirm={async () => {
          if (!memberAction?.member) return;
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
        member={memberAction?.member ? {
          uid: memberAction.member.uid,
          username: memberAction.member.username,
          photoURL: memberAction.member.photoURL,
          role: memberAction.member.role,
        } : null}
        isLoading={isActionLoading}
      />

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
