'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { loadUserBadges, checkAndAwardBadges } from '@/lib/firebase/badges';
import { useBadgeStore } from '@/store/badge-store';
import type { UserBadges, BadgeType } from '@/lib/types/badge';

interface UseBadgesResult {
  userBadges: UserBadges;
  loading: boolean;
  pendingBadge: BadgeType | null;
  isModalOpen: boolean;
  openModal: (badgeType: BadgeType) => void;
  closeModal: () => void;
  checkBadges: (discoveryPercentage: number) => Promise<void>;
}

export function useBadges(uid?: string): UseBadgesResult {
  const { userBadges, setUserBadges, pendingBadge, setPendingBadge, isModalOpen, openModal, closeModal } = useBadgeStore();
  const [loading, setLoading] = useState(true);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!uid || checkedRef.current) {
      setLoading(false);
      return;
    }

    checkedRef.current = true;
    setLoading(true);

    loadUserBadges(uid)
      .then((badges) => {
        setUserBadges(badges);
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
      });
  }, [uid, setUserBadges]);

  const checkBadges = useCallback(
    async (discoveryPercentage: number) => {
      if (!uid) return;

      const newBadges = await checkAndAwardBadges(uid, userBadges, discoveryPercentage);

      if (newBadges.length > 0) {
        setUserBadges({
          ...userBadges,
          ...Object.fromEntries(newBadges.map((b) => [b, true])),
        });

        if (newBadges.length > 0) {
          openModal(newBadges[0]);
        }
      }
    },
    [uid, userBadges, setUserBadges, openModal]
  );

  return {
    userBadges,
    loading,
    pendingBadge,
    isModalOpen,
    openModal,
    closeModal,
    checkBadges: checkBadges as (discoveryPercentage: number) => Promise<void>,
  };
}

export function useBadgeCheck() {
  const { userBadges } = useBadgeStore();

  const check = useCallback(
    async (uid: string, discoveryPercentage: number) => {
      const newBadges = await checkAndAwardBadges(uid, userBadges, discoveryPercentage);
      return newBadges;
    },
    [userBadges]
  );

  return { check };
}