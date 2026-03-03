'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { getCroppedImg } from '@/lib/utils/crop-image';
import { db } from '@/lib/firebase/config';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { useAuthStore } from '@/store/auth-store';
import { loadDiscoveries } from '@/lib/firebase/discoveries';
import type { Discovery } from '@/lib/firebase/discoveries';


const TOTAL_ELEMENTS = 118;
const DEFAULT_AVATAR = '/img/default-avatar.png';
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

interface ProgressData {
  completedDiscoveries: number;
  totalDiscoveries: number;
  progressPercentage: number;
  milestones: {
    beginner: boolean;
    intermediate: boolean;
    advanced: boolean;
    master: boolean;
  };
  lastUpdated?: string;
}

interface UserProgressDoc {
  discoveries?: Discovery[];
  progress?: ProgressData;
  lastUpdated?: string;
}

function formatDate(date: Date | string | undefined | null): string {
  if (!date) return 'Unknown';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function computeProgress(discoveries: Discovery[]): ProgressData {
  const count = discoveries.length;
  const pct = Math.min((count / TOTAL_ELEMENTS) * 100, 100);
  return {
    completedDiscoveries: count,
    totalDiscoveries: count,
    progressPercentage: pct,
    milestones: {
      beginner: pct >= 10,
      intermediate: pct >= 50,
      advanced: pct >= 75,
      master: pct >= 100,
    },
    lastUpdated: new Date().toISOString(),
  };
}

export default function ProfilePage() {
  const { user, profile, loading: authLoading } = useAuthStore();
  const uid = user?.uid;

  // Profile state
  const [photoURL, setPhotoURL] = useState<string>('');
  const [photoSourceURL, setPhotoSourceURL] = useState<string>('');
  const [joinDate, setJoinDate] = useState<string>('Unknown');

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editPhotoURL, setEditPhotoURL] = useState('');
  const [editCroppedData, setEditCroppedData] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // Crop state
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Progress state
  const [progressData, setProgressData] = useState<ProgressData>({
    completedDiscoveries: 0,
    totalDiscoveries: 0,
    progressPercentage: 0,
    milestones: { beginner: false, intermediate: false, advanced: false, master: false },
  });
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [discoveriesLoading, setDiscoveriesLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('Syncing...');

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Load user doc for join date and photoURL
  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    async function fetchUserDoc() {
      try {
        const snap = await getDoc(doc(db, 'users', uid!));
        if (snap.exists() && !cancelled) {
          const data = snap.data();

          // Photo URL
          if (data.photoURL) {
            setPhotoURL(data.photoURL);
          }
          if (data.photoSourceURL) {
            setPhotoSourceURL(data.photoSourceURL);
          }

          // Join date: try registrationDate, then createdAt, then auth metadata
          let date: Date | null = null;
          if (data.registrationDate) {
            date =
              typeof data.registrationDate.toDate === 'function'
                ? data.registrationDate.toDate()
                : new Date(data.registrationDate);
          } else if (data.createdAt) {
            date =
              typeof data.createdAt.toDate === 'function'
                ? data.createdAt.toDate()
                : new Date(data.createdAt);
          }

          if (date && !isNaN(date.getTime())) {
            setJoinDate(formatDate(date));
          } else if (user?.metadata.creationTime) {
            setJoinDate(formatDate(user.metadata.creationTime));
          }
        } else if (!cancelled && user?.metadata.creationTime) {
          setJoinDate(formatDate(user.metadata.creationTime));
        }
      } catch (err) {
        console.warn('[profile] Error loading user doc:', err);
        if (!cancelled && user?.metadata.creationTime) {
          setJoinDate(formatDate(user.metadata.creationTime));
        }
      }
    }

    fetchUserDoc();
    return () => {
      cancelled = true;
    };
  }, [uid, user]);

  // Load discoveries
  useEffect(() => {
    if (!uid) {
      setDiscoveries([]);
      setDiscoveriesLoading(false);
      return;
    }

    let cancelled = false;
    setDiscoveriesLoading(true);

    loadDiscoveries(uid).then((data) => {
      if (!cancelled) {
        setDiscoveries(data);
        setProgressData(computeProgress(data));
        setDiscoveriesLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Real-time progress listener
  useEffect(() => {
    if (!uid) return;

    setSyncStatus('Syncing...');

    const unsubscribe = onSnapshot(
      doc(db, 'progress', uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserProgressDoc;

          if (data.progress) {
            setProgressData(data.progress);
          }

          if (Array.isArray(data.discoveries)) {
            setDiscoveries(data.discoveries);
            // Recompute in case progress field is stale
            if (!data.progress) {
              setProgressData(computeProgress(data.discoveries));
            }
          }

          setSyncStatus(
            data.lastUpdated
              ? `Last synced: ${formatDate(data.lastUpdated)}`
              : 'Synced',
          );
        } else {
          setSyncStatus('No progress data found');
        }
      },
      (err) => {
        console.warn('[profile] Progress listener error:', err);
        setSyncStatus('Sync error');
      },
    );

    return () => unsubscribe();
  }, [uid]);

  // Cleanup close timer
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Open edit modal
  const handleOpenEdit = useCallback(() => {
    setEditUsername(profile?.username || '');
    setEditPhotoURL(photoSourceURL || (photoURL && !photoURL.startsWith('data:') ? photoURL : ''));
    setEditCroppedData(null);
    setRemovePhoto(false);
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
      closeTimerRef.current = undefined;
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

    const usernameChanged =
      trimmedUsername.toLowerCase() !== profile.username.toLowerCase();

    // Calculate what the final state would be
    const finalPhotoURL = removePhoto ? '' : (editCroppedData || trimmedPhotoURL || '');
    const finalPhotoSourceURL = removePhoto ? '' : (trimmedPhotoURL || '');

    // Photo is changed if either the final display photo or the source URL differs from what's stored
    // Also consider the explicit removePhoto flag
    const photoChanged = removePhoto ? (!!photoURL || !!photoSourceURL) : (finalPhotoURL !== photoURL || finalPhotoSourceURL !== photoSourceURL);

    if (!usernameChanged && !photoChanged) {
      setEditError('No changes detected.');
      return;
    }

    setSaving(true);

    try {
      // Check username uniqueness
      if (usernameChanged) {
        const usernameDoc = await getDoc(
          doc(db, 'usernames', trimmedUsername.toLowerCase()),
        );
        if (usernameDoc.exists()) {
          setEditError('Username is already taken.');
          setSaving(false);
          return;
        }
      }

      // Build update object
      const updateData: Record<string, unknown> = {};
      if (usernameChanged) {
        updateData.username = trimmedUsername;
      }
      if (photoChanged) {
        updateData.photoURL = finalPhotoURL;
        updateData.photoSourceURL = finalPhotoSourceURL;
      }

      // Update user doc
      await updateDoc(doc(db, 'users', uid), updateData);

      // Handle username change in usernames collection
      if (usernameChanged) {
        // Delete old username doc
        await deleteDoc(doc(db, 'usernames', profile.username.toLowerCase()));

        // Create new username doc
        await setDoc(doc(db, 'usernames', trimmedUsername.toLowerCase()), {
          uid,
          email: user?.email || profile.email,
          createdAt: serverTimestamp(),
        });
      }

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
  }, [uid, profile, user, editUsername, editPhotoURL, editCroppedData, removePhoto, photoURL, photoSourceURL, handleCloseEdit]);

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
  const percentage = Math.round(progressData.progressPercentage);

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-[2rem] font-extrabold text-[var(--text-main)] tracking-tight">Profile</h1>
        <button
          className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] text-[var(--text-main)] font-semibold px-6 py-2.5 rounded-[12px] hover:border-[var(--accent-color)] transition-all cursor-pointer"
          onClick={handleOpenEdit}
        >
          Edit
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-[var(--bg-card)] backdrop-blur-[40px] border border-[var(--glass-border)] rounded-[28px] p-8">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-[var(--accent-color)]/30 ring-2 ring-[var(--accent-color)]/20">
              <Image
                src={displayAvatar}
                alt={profile.username}
                width={80}
                height={80}
                unoptimized={displayAvatar !== DEFAULT_AVATAR}
              />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-main)]">{profile.username}</h2>
            <p className="text-[var(--text-light)] text-sm">{user.email}</p>
            <p className="text-[var(--text-light)] text-sm">Joined: {joinDate}</p>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="bg-[var(--bg-card)] backdrop-blur-[40px] border border-[var(--glass-border)] rounded-[28px] p-8 space-y-4">
        <h2 className="text-lg font-bold text-[var(--text-main)] mb-4">Progress Tracker</h2>
        <p className="text-xs text-[var(--text-light)] italic">{syncStatus}</p>

        {/* Progress Bar */}
        <div className="relative h-3 bg-[var(--bg-sidebar)] rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--accent-color)] to-[#0ea5e9] rounded-full transition-[width] duration-700"
            style={{ width: `${percentage}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[0.65rem] font-bold text-white">{percentage}%</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mt-4 max-[600px]:grid-cols-1">
          <div className="bg-[var(--bg-sidebar)] rounded-[16px] p-5 border border-[var(--border-color)]">
            <h3 className="text-xs font-semibold text-[var(--text-light)] uppercase tracking-wide mb-2">Discoveries</h3>
            <p className="text-2xl font-extrabold text-[var(--text-main)]">
              {progressData.completedDiscoveries} / {TOTAL_ELEMENTS}
            </p>
          </div>
          <div className="bg-[var(--bg-sidebar)] rounded-[16px] p-5 border border-[var(--border-color)]">
            <h3 className="text-xs font-semibold text-[var(--text-light)] uppercase tracking-wide mb-2">Milestones</h3>
            <div className="flex flex-wrap gap-2">
              <div className={progressData.milestones.beginner ? 'bg-[rgba(16,185,129,0.15)] text-emerald-500 border border-[rgba(16,185,129,0.3)] px-3 py-1 rounded-full text-xs font-semibold' : 'bg-[var(--bg-sidebar)] text-[var(--text-light)] border border-[var(--border-color)] px-3 py-1 rounded-full text-xs font-semibold'}>
                Beginner
              </div>
              <div className={progressData.milestones.intermediate ? 'bg-[rgba(16,185,129,0.15)] text-emerald-500 border border-[rgba(16,185,129,0.3)] px-3 py-1 rounded-full text-xs font-semibold' : 'bg-[var(--bg-sidebar)] text-[var(--text-light)] border border-[var(--border-color)] px-3 py-1 rounded-full text-xs font-semibold'}>
                Intermediate
              </div>
              <div className={progressData.milestones.advanced ? 'bg-[rgba(16,185,129,0.15)] text-emerald-500 border border-[rgba(16,185,129,0.3)] px-3 py-1 rounded-full text-xs font-semibold' : 'bg-[var(--bg-sidebar)] text-[var(--text-light)] border border-[var(--border-color)] px-3 py-1 rounded-full text-xs font-semibold'}>
                Advanced
              </div>
              <div className={progressData.milestones.master ? 'bg-[rgba(16,185,129,0.15)] text-emerald-500 border border-[rgba(16,185,129,0.3)] px-3 py-1 rounded-full text-xs font-semibold' : 'bg-[var(--bg-sidebar)] text-[var(--text-light)] border border-[var(--border-color)] px-3 py-1 rounded-full text-xs font-semibold'}>
                Master
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Discoveries Section */}
      <div className="bg-[var(--bg-card)] backdrop-blur-[40px] border border-[var(--glass-border)] rounded-[28px] p-8 space-y-4">
        <h2 className="text-lg font-bold text-[var(--text-main)] mb-4">
          Discoveries ({progressData.completedDiscoveries} / {TOTAL_ELEMENTS})
        </h2>

        {discoveriesLoading ? (
          <p className="text-[var(--text-light)] text-sm text-center py-8">Loading discoveries...</p>
        ) : discoveries.length === 0 ? (
          <p className="text-[var(--text-light)] text-sm text-center py-8">
            No discoveries yet. Start combining elements in the Lab!
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-[600px]:grid-cols-1">
            {discoveries.map((d) => (
              <div key={d.symbol} className="flex items-center gap-3 p-3 bg-[var(--bg-sidebar)] rounded-[12px] border border-[var(--border-color)] hover:border-[var(--accent-color)] transition-colors">
                <div className="w-10 h-10 flex items-center justify-center bg-[var(--bg-item-active)] rounded-[8px] font-bold text-[var(--text-main)] text-sm">{d.symbol}</div>
                <div className="flex-1 text-[var(--text-main)] text-sm font-medium truncate">{d.name}</div>
                <div className="text-[var(--text-light)] text-xs">
                  {formatDate(d.dateDiscovered)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(2,6,23,0.85)] backdrop-blur-[8px]" onClick={handleBackdropClick}>
          <div className="w-full max-w-[480px] bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-[28px] p-8 relative max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-full text-[var(--text-light)] hover:bg-red-500 hover:text-white hover:rotate-90 transition-all duration-200 cursor-pointer"
              onClick={handleCloseEdit}
            >
              &times;
            </button>

            {/* Modal Header with avatar preview */}
            <div className="flex items-center gap-5 mb-6">
              <div className="w-[70px] h-[70px] rounded-full overflow-hidden border-4 border-[var(--accent-color)]/40">
                <Image
                  src={editPreviewAvatar}
                  alt="Avatar preview"
                  width={70}
                  height={70}
                  unoptimized={editPreviewAvatar !== DEFAULT_AVATAR}
                />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-main)]">Edit Profile</h3>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Avatar URL & Crop */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-light)]">Profile Picture URL</label>

                <div className="flex gap-2">
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
                  placeholder="Username (3-20 chars)"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  maxLength={20}
                />
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
            <div className="flex gap-3 mt-6">
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
        <div className="fixed inset-0 z-[2500] flex flex-col items-center justify-center bg-[rgba(2,6,23,0.92)] backdrop-blur-[10px]">
          <div className="w-full max-w-[500px] flex flex-col bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-[28px] overflow-hidden">
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
