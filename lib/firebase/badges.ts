import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './config';
import { type UserBadges, getNewBadges, type BadgeType, BADGES } from '@/lib/types/badge';

const DEFAULT_BADGES: UserBadges = {
  beginner: false,
  intermediate: false,
  advanced: false,
  master: false,
};

export async function loadUserBadges(uid: string): Promise<UserBadges> {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    return DEFAULT_BADGES;
  }

  const data = snap.data();
  return data?.badges ?? DEFAULT_BADGES;
}

export async function saveUserBadges(uid: string, badges: UserBadges): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, { badges }, { merge: true });
}

export async function checkAndAwardBadges(
  uid: string,
  currentBadges: UserBadges,
  discoveryPercentage: number
): Promise<BadgeType[]> {
  console.log('[Badges] Checking percentage:', discoveryPercentage, '%');
  console.log('[Badges] Current badges:', currentBadges);
  
  const newBadges = getNewBadges(currentBadges, discoveryPercentage);
  console.log('[Badges] New badges found:', newBadges);

  if (newBadges.length === 0) {
    console.log('[Badges] No new badges to award');
    return [];
  }

  const updatedBadges: UserBadges = {
    ...currentBadges,
  };

  for (const badgeType of newBadges) {
    updatedBadges[badgeType] = true;
  }

  console.log('[Badges] Saving updated badges:', updatedBadges);
  await saveUserBadges(uid, updatedBadges);
  console.log('[Badges] Badges saved successfully!');

  return newBadges;
}

export async function updateUserBadges(uid: string): Promise<UserBadges> {
  const badges = await loadUserBadges(uid);
  return badges;
}