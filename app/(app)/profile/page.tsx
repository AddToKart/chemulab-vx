'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { db } from '@/lib/firebase/config';
import {
  doc,
  updateDoc,
} from 'firebase/firestore';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';
import Cropper, { Area } from 'react-easy-crop';
import { getCroppedImg } from '@/lib/utils/crop-image';
import { useUserProgress } from '@/lib/hooks/use-user-progress';
import { TOTAL_ELEMENTS as CANONICAL_TOTAL_ELEMENTS } from '@/lib/firebase/discoveries';

const DEFAULT_AVATAR = '/images/profile.png';
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

interface FirestoreDate {
  toDate: () => Date;
}

// Helper function to format dates safely
function formatDate(date: string | FirestoreDate | null | undefined): string {
  if (!date) return 'Recently';
  try {
    const d = (typeof (date as FirestoreDate).toDate === 'function')
      ? (date as FirestoreDate).toDate()
      : new Date(date as string);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

export default function ProfilePage() {
  const { user, profile, loading: authLoading } = useAuthStore();
  const uid = user?.uid;

  // Real-time progress and discoveries
  const { discoveries, progress, loading: discoveriesLoading, syncState } = useUserProgress(uid);

  // Profile data state
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [photoSourceURL, setPhotoSourceURL] = useState(profile?.photoSourceURL || '');

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editPhotoURL, setEditPhotoURL] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // Cropping state
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [editCroppedData, setEditCroppedData] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Constants
  const joinDate = formatDate((profile?.registrationDate || profile?.createdAt) as string | FirestoreDate);

  // Initialize state when profile loads
  useEffect(() => {
    if (profile) {
      setPhotoURL(profile.photoURL || '');
      setPhotoSourceURL(profile.photoSourceURL || '');
    }
  }, [profile]);

  // Open edit modal
  const handleOpenEdit = useCallback(() => {
    setEditUsername(profile?.username || '');
    setEditPhotoURL(photoSourceURL || (photoURL && !photoURL.startsWith('data:') ? photoURL : ''));
    setEditCroppedData(null);
    setRemovePhoto(false);
    setEditBio(profile?.bio || '');
    setEditError('');
    setEditSuccess('');
    setShowEditModal(true);
  }, [profile, photoURL, photoSourceURL]);

  // Close edit modal
  const handleCloseEdit = useCallback(() => {
    setShowEditModal(false);
    setEditError('');
    setEditSuccess('');
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  // Remove photo
  const handleRemovePhoto = useCallback(() => {
    setEditPhotoURL('');
    setEditCroppedData(null);
    setRemovePhoto(true);
  }, []);

  // Start cropping flow for the current editPhotoURL
  const handleStartCrop = useCallback(() => {
    if (!editPhotoURL) {
      setEditError('Please provide an image URL first.');
      return;
    }

    // Use proxy for external URLs to avoid CORS/Tainted Canvas issues
    const isDataUrl = editPhotoURL.startsWith('data:');
    const isLocalUrl = editPhotoURL.startsWith('/') || editPhotoURL.startsWith('http://localhost') || editPhotoURL.startsWith('http://192.168');

    const finalUrl = (isDataUrl || isLocalUrl)
      ? editPhotoURL
      : `/api/image-proxy?url=${encodeURIComponent(editPhotoURL)}`;

    setCropImageSrc(finalUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setEditError('');
  }, [editPhotoURL]);

  // Crop complete callback
  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  // Confirm crop
  const handleCropConfirm = useCallback(async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;
    try {
      const croppedDataUrl = await getCroppedImg(cropImageSrc, croppedAreaPixels, 256);
      setEditCroppedData(croppedDataUrl);
      setCropImageSrc(null);
    } catch {
      setEditError('Failed to crop image. Please try again.');
    }
  }, [cropImageSrc, croppedAreaPixels]);

  // Cancel crop
  const handleCropCancel = useCallback(() => {
    setCropImageSrc(null);
  }, []);

  // Save profile
  const handleSave = useCallback(async () => {
    if (!uid || !profile) return;

    setEditError('');
    setEditSuccess('');

    const trimmedUsername = editUsername.trim();
    const trimmedPhotoURL = editPhotoURL.trim();
    const trimmedBio = editBio.trim();

    // Validate username
    if (!trimmedUsername) {
      setEditError('Username is required.');
      return;
    }

    if (!USERNAME_REGEX.test(trimmedUsername)) {
      setEditError(
        'Username must be 3-20 characters, alphanumeric and underscores only.',
      );
      return;
    }

    const usernameChanged = trimmedUsername !== profile.username;

    // Calculate what the final state would be
    let finalPhotoURL = photoURL;
    let finalPhotoSourceURL = photoSourceURL;

    if (removePhoto) {
      finalPhotoURL = '';
      finalPhotoSourceURL = '';
    } else if (editCroppedData) {
      // User provided a new crop
      finalPhotoURL = editCroppedData;
      finalPhotoSourceURL = trimmedPhotoURL;
    } else if (trimmedPhotoURL !== photoSourceURL) {
      // User changed the source URL but didn't crop yet
      finalPhotoURL = trimmedPhotoURL;
      finalPhotoSourceURL = trimmedPhotoURL;
    }
    // If trimmedPhotoURL === photoSourceURL and !editCroppedData, we keep existing finalPhotoURL (photoURL)

    // Photo is changed if either the final display photo or the source URL differs from what's stored
    const photoChanged = finalPhotoURL !== photoURL || finalPhotoSourceURL !== photoSourceURL;
    const bioChanged = trimmedBio !== (profile.bio || '');

    if (!usernameChanged && !photoChanged && !bioChanged) {
      setEditError('No changes detected.');
      return;
    }

    setSaving(true);

    try {
      // Build update object
      const updateData: Record<string, unknown> = {};
      if (usernameChanged) {
        updateData.username = trimmedUsername;
      }
      if (photoChanged) {
        updateData.photoURL = finalPhotoURL;
        updateData.photoSourceURL = finalPhotoSourceURL;
      }
      if (bioChanged) {
        const { filterProfanity } = await import('@/lib/utils');
        updateData.bio = filterProfanity(trimmedBio);
      }

      // Update user doc
      await updateDoc(doc(db, 'users', uid as string), updateData);

      // Update local state
      if (photoChanged) {
        setPhotoURL(finalPhotoURL);
        setPhotoSourceURL(finalPhotoSourceURL);
      }

      // Update auth store profile
      useAuthStore.getState().setProfile({
        ...profile,
        ...(usernameChanged ? { username: trimmedUsername } : {}),
        ...(photoChanged ? {
          photoURL: finalPhotoURL,
          photoSourceURL: finalPhotoSourceURL
        } : {}),
        ...(bioChanged ? { bio: (updateData.bio as string) } : {}),
      });

      setEditSuccess('Profile updated successfully!');

      // Close modal after 1.5s
      closeTimerRef.current = setTimeout(() => {
        handleCloseEdit();
      }, 1500);
    } catch (err) {
      console.error('[profile] Save error:', err);
      setEditError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [uid, profile, editUsername, editPhotoURL, editBio, editCroppedData, removePhoto, photoURL, photoSourceURL, handleCloseEdit]);

  // Modal backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        handleCloseEdit();
      }
    },
    [handleCloseEdit],
  );

  // Loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center p-16 text-[var(--text-light)]">
        <p>Loading profile...</p>
      </div>
    );
  }

  // Not authenticated
  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center p-16 text-[var(--text-light)]">
        <p>Please sign in to view your profile.</p>
      </div>
    );
  }

  const displayAvatar = photoURL || DEFAULT_AVATAR;

  let effectiveEditPhotoURL = '';
  if (removePhoto) {
    effectiveEditPhotoURL = '';
  } else if (editCroppedData) {
    effectiveEditPhotoURL = editCroppedData;
  } else if (editPhotoURL && !editPhotoURL.startsWith('data:')) {
    effectiveEditPhotoURL = editPhotoURL;
  } else if (photoURL) {
    effectiveEditPhotoURL = photoURL;
  }

  const editPreviewAvatar = effectiveEditPhotoURL || DEFAULT_AVATAR;
  const percentage = Math.round(progress.progressPercentage);
  const syncStatus = syncState === 'synced' ? 'Synced' : 'Syncing...';

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[2rem] font-extrabold tracking-tight text-[var(--text-main)]">Profile</h1>
        <button
          className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] text-[var(--text-main)] font-semibold px-6 py-2.5 rounded-[12px] hover:border-[var(--accent-color)] transition-all cursor-pointer"
          onClick={handleOpenEdit}
        >
          Edit
        </button>
      </div>

      {/* Profile Card */}
      <div className="rounded-[28px] border border-[var(--glass-border)] bg-[var(--bg-card)] p-5 backdrop-blur-[40px] sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-[var(--accent-color)]/30 ring-2 ring-[var(--accent-color)]/20 shadow-xl">
              <Image
                src={displayAvatar}
                alt={profile.username}
                width={80}
                height={80}
                unoptimized={displayAvatar !== DEFAULT_AVATAR}
                className="object-cover"
              />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-[var(--text-main)] truncate">{profile.username}</h2>
            <p className="text-[var(--text-light)] text-sm truncate">{user.email}</p>
            <p className="text-[var(--text-light)] text-xs mt-1">Joined: {joinDate}</p>
          </div>
        </div>

        {/* Bio Display */}
        <div className="mt-6 pt-6 border-t border-[var(--glass-border)]">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-light)] mb-2">About Me</h3>
          <p className="text-[var(--text-main)] text-sm leading-relaxed whitespace-pre-wrap italic">
            {profile.bio || "No bio yet. Click Edit to add one!"}
          </p>
        </div>
      </div>

      {/* Progress Section */}
      <div className="space-y-4 rounded-[28px] border border-[var(--glass-border)] bg-[var(--bg-card)] p-5 backdrop-blur-[40px] sm:p-8">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[var(--text-main)]">Progress Tracker</h2>
          <span className={cn(
            "text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full border",
            syncState === 'synced' ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" : "text-amber-500 border-amber-500/20 bg-amber-500/5"
          )}>
            {syncStatus}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="relative h-4 bg-[var(--bg-sidebar)] rounded-full overflow-hidden border border-[var(--border-color)]">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--accent-color)] to-[#0ea5e9] rounded-full transition-[width] duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.3)]"
            style={{ width: `${percentage}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[0.6rem] font-black text-white mix-blend-difference">
            {percentage}% COMPLETE
          </span>
        </div>

        {/* Stats */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="bg-[var(--bg-sidebar)] rounded-[16px] p-5 border border-[var(--border-color)] hover:border-[var(--accent-color)]/30 transition-colors group">
            <h3 className="text-xs font-semibold text-[var(--text-light)] uppercase tracking-wide mb-2 group-hover:text-[var(--accent-color)] transition-colors">Discoveries</h3>
            <p className="text-2xl font-extrabold text-[var(--text-main)] flex items-baseline gap-1">
              {progress.completedDiscoveries} <span className="text-xs font-medium text-[var(--text-light)]">/ {CANONICAL_TOTAL_ELEMENTS}</span>
            </p>
          </div>
          <div className="bg-[var(--bg-sidebar)] rounded-[16px] p-5 border border-[var(--border-color)]">
            <h3 className="text-xs font-semibold text-[var(--text-light)] uppercase tracking-wide mb-2">Milestones</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Beginner', active: progress.milestones.beginner },
                { label: 'Intermediate', active: progress.milestones.intermediate },
                { label: 'Advanced', active: progress.milestones.advanced },
                { label: 'Master', active: progress.milestones.master }
              ].map((m) => (
                <div 
                  key={m.label}
                  className={cn(
                    'px-3 py-1 rounded-full text-[0.65rem] font-bold border transition-all duration-300',
                    m.active 
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.15)]' 
                      : 'bg-[var(--bg-sidebar)] text-[var(--text-light)] border-[var(--border-color)] opacity-50 grayscale'
                  )}
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Discoveries Section */}
      <div className="space-y-4 rounded-[28px] border border-[var(--glass-border)] bg-[var(--bg-card)] p-5 backdrop-blur-[40px] sm:p-8">
        <h2 className="text-lg font-bold text-[var(--text-main)] mb-4">
          Discoveries ({progress.completedDiscoveries} / {CANONICAL_TOTAL_ELEMENTS})
        </h2>

        {discoveriesLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 border-4 border-[var(--accent-color)]/20 border-t-[var(--accent-color)] rounded-full animate-spin" />
            <p className="text-[var(--text-light)] text-sm font-medium">Loading discoveries...</p>
          </div>
        ) : discoveries.length === 0 ? (
          <div className="text-center py-12 px-6 border-2 border-dashed border-[var(--border-color)] rounded-[20px]">
            <p className="text-[var(--text-light)] text-sm italic">
              &quot;Every great discovery was once an experiment.&quot;
            </p>
            <p className="text-[var(--text-main)] text-sm font-bold mt-2">
              Start combining elements in the Lab to begin your collection!
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {discoveries.map((d) => (
              <div 
                key={d.symbol} 
                className="flex items-center gap-3 p-3 bg-[var(--bg-sidebar)] rounded-[16px] border border-[var(--border-color)] hover:border-[var(--accent-color)]/40 hover:bg-[var(--bg-item-active)] transition-all group overflow-hidden"
              >
                <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-[var(--bg-card)] rounded-[12px] font-bold text-[var(--text-main)] text-sm border border-[var(--border-color)] shadow-sm group-hover:scale-105 transition-transform duration-300">
                  {d.symbol}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[var(--text-main)] text-sm font-bold truncate group-hover:text-[var(--accent-color)] transition-colors">{d.name}</div>
                  <div className="text-[var(--text-light)] text-[0.65rem] font-medium opacity-80">
                    Discovered: {formatDate(d.dateDiscovered)}
                  </div>
                </div>
                {d.type && (
                  <div className="px-2 py-0.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] text-[10px] text-[var(--text-light)] font-semibold hidden sm:block">
                    {d.type}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(2,6,23,0.85)] p-4 backdrop-blur-[8px]" onClick={handleBackdropClick}>
          <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-[480px] overflow-y-auto rounded-[28px] border border-[var(--glass-border)] bg-[var(--bg-card)] p-5 sm:p-8">
            <button
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-full text-[var(--text-light)] hover:bg-red-500 hover:text-white hover:rotate-90 transition-all duration-200 cursor-pointer"
              onClick={handleCloseEdit}
            >
              &times;
            </button>

            {/* Modal Header with avatar preview */}
            <div className="mb-6 flex items-center gap-4 sm:gap-5">
              <div className="w-[70px] h-[70px] rounded-full overflow-hidden border-4 border-[var(--accent-color)]/40">
                <Image
                  src={editPreviewAvatar}
                  alt="Avatar preview"
                  width={70}
                  height={70}
                  unoptimized={editPreviewAvatar !== DEFAULT_AVATAR}
                  className="object-cover"
                />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-main)]">Edit Profile</h3>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Avatar URL & Crop */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-light)]">Profile Picture URL</label>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    className="flex-1 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[12px] px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:outline-none focus:border-[var(--accent-color)] transition-colors text-sm"
                    placeholder="https://example.com/photo.jpg"
                    value={editPhotoURL}
                    onChange={(e) => {
                      setEditPhotoURL(e.target.value);
                      if (editCroppedData) setEditCroppedData(null); // Clear pending crop if URL changes
                    }}
                  />
                  <button
                    type="button"
                    className="bg-[var(--accent-color)] text-white font-semibold px-4 py-2 rounded-[12px] hover:opacity-90 transition-opacity cursor-pointer text-sm"
                    onClick={handleStartCrop}
                  >
                    Crop
                  </button>
                </div>

                {editPreviewAvatar !== DEFAULT_AVATAR && (
                  <button
                    className="text-xs text-red-400 hover:text-red-500 underline cursor-pointer bg-transparent border-0 p-0 text-left"
                    onClick={handleRemovePhoto}
                    type="button"
                  >
                    Remove Photo
                  </button>
                )}
              </div>

              {/* Username */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-light)]">Username</label>
                <input
                  type="text"
                  className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[12px] px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:outline-none focus:border-[var(--accent-color)] transition-colors"
                  placeholder="Username (3-20 characters)"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  maxLength={20}
                />
              </div>

              {/* Bio */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-light)]">Bio</label>
                <textarea
                  className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[12px] px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:outline-none focus:border-[var(--accent-color)] transition-colors min-h-[100px] resize-none"
                  placeholder="Tell us about yourself..."
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  maxLength={160}
                />
                <div className="flex justify-end">
                  <span className="text-[10px] text-[var(--text-light)]">{editBio.length}/160</span>
                </div>
              </div>

              {/* Email (read-only) */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-light)]">Email</span>
                <span className="text-[var(--text-main)] font-semibold">{user.email}</span>
              </div>

              {/* Join Date (read-only) */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-light)]">Joined</span>
                <span className="text-[var(--text-main)] font-semibold">{joinDate}</span>
              </div>
            </div>

            {/* Messages */}
            {editError && <div className="mt-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-[10px] px-4 py-2.5 text-sm">{editError}</div>}
            {editSuccess && (
              <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-[10px] px-4 py-2.5 text-sm">{editSuccess}</div>
            )}

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                className="flex-1 bg-[var(--accent-color)] text-white font-semibold px-6 py-2.5 rounded-[12px] hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                className="flex-1 bg-[var(--bg-sidebar)] border border-[var(--border-color)] text-[var(--text-main)] font-semibold px-6 py-2.5 rounded-[12px] hover:border-[var(--accent-color)] transition-all cursor-pointer"
                onClick={handleCloseEdit}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {cropImageSrc && (
        <div className="fixed inset-0 z-[2500] flex flex-col items-center justify-center bg-[rgba(2,6,23,0.92)] p-4 backdrop-blur-[10px]">
          <div className="flex w-full max-w-[500px] flex-col overflow-hidden rounded-[28px] border border-[var(--glass-border)] bg-[var(--bg-card)]">
            <div className="px-6 pt-5 pb-3">
              <h3 className="text-lg font-bold text-[var(--text-main)]">Crop Profile Picture</h3>
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
    </section>
  );
}
