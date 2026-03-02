'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
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
import styles from './page.module.css';

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
  const [joinDate, setJoinDate] = useState<string>('Unknown');

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editPhotoURL, setEditPhotoURL] = useState('');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [saving, setSaving] = useState(false);

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
    setEditPhotoURL(photoURL);
    setEditError('');
    setEditSuccess('');
    setShowEditModal(true);
  }, [profile, photoURL]);

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
    const photoChanged = trimmedPhotoURL !== photoURL;

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
        updateData.photoURL = trimmedPhotoURL || '';
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
        setPhotoURL(trimmedPhotoURL);
      }

      // Update auth store profile
      if (usernameChanged) {
        useAuthStore.getState().setProfile({
          ...profile,
          username: trimmedUsername,
        });
      }

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
  }, [uid, profile, user, editUsername, editPhotoURL, photoURL, handleCloseEdit]);

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
      <div className={styles.loadingContainer}>
        <p>Loading profile...</p>
      </div>
    );
  }

  // Not authenticated
  if (!user || !profile) {
    return (
      <div className={styles.loadingContainer}>
        <p>Please sign in to view your profile.</p>
      </div>
    );
  }

  const displayAvatar = photoURL || DEFAULT_AVATAR;
  const editPreviewAvatar = editPhotoURL || DEFAULT_AVATAR;
  const percentage = Math.round(progressData.progressPercentage);

  return (
    <section className={styles.profileSection}>
      {/* Header */}
      <div className={styles.header}>
        <h1>Profile</h1>
        <button className={styles.editBtn} onClick={handleOpenEdit}>
          Edit
        </button>
      </div>

      {/* Profile Card */}
      <div className={styles.profileCard}>
        <div className={styles.profileHeader}>
          <div className={styles.avatarContainer}>
            <div className={styles.avatar}>
              <Image
                src={displayAvatar}
                alt={profile.username}
                width={80}
                height={80}
                unoptimized={displayAvatar !== DEFAULT_AVATAR}
              />
            </div>
          </div>
          <div className={styles.profileInfo}>
            <h2>{profile.username}</h2>
            <p className={styles.muted}>{user.email}</p>
            <p className={styles.muted}>Joined: {joinDate}</p>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className={styles.progressSection}>
        <h2>Progress Tracker</h2>
        <p className={styles.syncStatus}>{syncStatus}</p>

        {/* Progress Bar */}
        <div className={styles.progressBarContainer}>
          <div
            className={styles.progressBar}
            style={{ width: `${percentage}%` }}
          />
          <span className={styles.progressText}>{percentage}%</span>
        </div>

        {/* Stats */}
        <div className={styles.progressStats}>
          <div className={styles.statItem}>
            <h3>Discoveries</h3>
            <p>
              {progressData.completedDiscoveries} / {TOTAL_ELEMENTS}
            </p>
          </div>
          <div className={styles.statItem}>
            <h3>Milestones</h3>
            <div className={styles.milestones}>
              <div
                className={`${styles.milestone} ${
                  progressData.milestones.beginner
                    ? styles.milestoneAchieved
                    : ''
                }`}
              >
                Beginner
              </div>
              <div
                className={`${styles.milestone} ${
                  progressData.milestones.intermediate
                    ? styles.milestoneAchieved
                    : ''
                }`}
              >
                Intermediate
              </div>
              <div
                className={`${styles.milestone} ${
                  progressData.milestones.advanced
                    ? styles.milestoneAchieved
                    : ''
                }`}
              >
                Advanced
              </div>
              <div
                className={`${styles.milestone} ${
                  progressData.milestones.master
                    ? styles.milestoneAchieved
                    : ''
                }`}
              >
                Master
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Discoveries Section */}
      <div className={styles.discoveriesSection}>
        <h2>
          Discoveries ({progressData.completedDiscoveries} / {TOTAL_ELEMENTS})
        </h2>

        {discoveriesLoading ? (
          <p className={styles.emptyText}>Loading discoveries...</p>
        ) : discoveries.length === 0 ? (
          <p className={styles.emptyText}>
            No discoveries yet. Start combining elements in the Lab!
          </p>
        ) : (
          <div className={styles.discoveriesList}>
            {discoveries.map((d) => (
              <div key={d.symbol} className={styles.discoveryItem}>
                <div className={styles.discoverySymbol}>{d.symbol}</div>
                <div className={styles.discoveryName}>{d.name}</div>
                <div className={styles.discoveryDate}>
                  {formatDate(d.dateDiscovered)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className={styles.modal} onClick={handleBackdropClick}>
          <div className={styles.modalContent}>
            <button className={styles.closeBtn} onClick={handleCloseEdit}>
              &times;
            </button>

            {/* Modal Header with avatar preview */}
            <div className={styles.modalHeader}>
              <div className={styles.editAvatarPreview}>
                <Image
                  src={editPreviewAvatar}
                  alt="Avatar preview"
                  width={70}
                  height={70}
                  unoptimized={editPreviewAvatar !== DEFAULT_AVATAR}
                />
              </div>
              <h3 className={styles.modalTitle}>Edit Profile</h3>
            </div>

            {/* Form */}
            <div className={styles.infoGrid}>
              {/* Avatar URL */}
              <div className={styles.infoItem}>
                <label className={styles.infoLabel}>Avatar URL</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Image URL"
                  value={editPhotoURL}
                  onChange={(e) => setEditPhotoURL(e.target.value)}
                />
                {editPhotoURL && (
                  <button
                    className={styles.removePhotoBtn}
                    onClick={handleRemovePhoto}
                    type="button"
                  >
                    Remove Photo
                  </button>
                )}
              </div>

              {/* Username */}
              <div className={styles.infoItem}>
                <label className={styles.infoLabel}>Username</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Username (3-20 chars)"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  maxLength={20}
                />
              </div>

              {/* Email (read-only) */}
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Email</span>
                <span className={styles.infoValue}>{user.email}</span>
              </div>

              {/* Join Date (read-only) */}
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Joined</span>
                <span className={styles.infoValue}>{joinDate}</span>
              </div>
            </div>

            {/* Messages */}
            {editError && <div className={styles.errorMsg}>{editError}</div>}
            {editSuccess && (
              <div className={styles.successMsg}>{editSuccess}</div>
            )}

            {/* Actions */}
            <div className={styles.footerActions}>
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                className={styles.cancelBtnModal}
                onClick={handleCloseEdit}
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
