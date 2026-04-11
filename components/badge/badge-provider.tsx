'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { loadUserBadges, checkAndAwardBadges } from '@/lib/firebase/badges';
import { BadgeUnlockModal } from '@/components/badge/badge-unlock-modal';
import type { UserBadges, BadgeType } from '@/lib/types/badge';

interface BadgeContextValue {
  userBadges: UserBadges;
  loading: boolean;
  pendingBadge: BadgeType | null;
  isModalOpen: boolean;
  closeModal: () => void;
  checkAndAwardBadges: (discoveryPercentage: number) => Promise<void>;
}

const BadgeContext = createContext<BadgeContextValue | null>(null);

export function useBadgeContext() {
  const context = useContext(BadgeContext);
  if (!context) {
    throw new Error('useBadgeContext must be used within BadgeProvider');
  }
  return context;
}

export function BadgeProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const [userBadges, setUserBadges] = useState<UserBadges>({
    beginner: false,
    intermediate: false,
    advanced: false,
    master: false,
  });
  const [loading, setLoading] = useState(true);
  const [pendingBadge, setPendingBadge] = useState<BadgeType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const checkedRef = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    loadUserBadges(user.uid)
      .then((badges) => {
        setUserBadges(badges);
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
      });
  }, [user?.uid]);

  const checkBadges = useCallback(
    async (discoveryPercentage: number) => {
      if (!user?.uid) return;

      const newBadges = await checkAndAwardBadges(user.uid, userBadges, discoveryPercentage);

      if (newBadges.length > 0) {
        setUserBadges((prev) => ({
          ...prev,
          ...Object.fromEntries(newBadges.map((b) => [b, true])),
        }));

        if (newBadges.length > 0) {
          setPendingBadge(newBadges[0]);
          setIsModalOpen(true);
        }
      }
    },
    [user?.uid, userBadges]
  );

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return (
    <BadgeContext.Provider
      value={{
        userBadges,
        loading,
        pendingBadge,
        isModalOpen,
        closeModal,
        checkAndAwardBadges: checkBadges,
      }}
    >
      {children}
    </BadgeContext.Provider>
  );
}

export function useBadgeCheck() {
  const { checkAndAwardBadges, loading } = useBadgeContext();
  return { checkAndAwardBadges, loading };
}