import { create } from 'zustand';
import type { UserBadges, BadgeType } from '@/lib/types/badge';

interface BadgeState {
  userBadges: UserBadges;
  pendingBadge: BadgeType | null;
  isModalOpen: boolean;

  setUserBadges: (badges: UserBadges) => void;
  setPendingBadge: (badgeType: BadgeType | null) => void;
  openModal: (badgeType: BadgeType) => void;
  closeModal: () => void;
  claimBadge: (badgeType: BadgeType) => void;
}

export const useBadgeStore = create<BadgeState>((set) => ({
  userBadges: {
    beginner: false,
    intermediate: false,
    advanced: false,
    master: false,
  },
  pendingBadge: null,
  isModalOpen: false,

  setUserBadges: (userBadges) => set({ userBadges }),
  setPendingBadge: (pendingBadge) => set({ pendingBadge }),

  openModal: (badgeType) =>
    set({ pendingBadge: badgeType, isModalOpen: true }),

  closeModal: () =>
    set({ isModalOpen: false }),

  claimBadge: (badgeType) =>
    set((state) => ({
      userBadges: {
        ...state.userBadges,
        [badgeType]: true,
      },
      pendingBadge: null,
      isModalOpen: false,
    })),
}));