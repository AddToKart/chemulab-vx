'use client';

import { create } from 'zustand';
import { BadgeType } from '@/lib/types/badge';

interface BadgeModalState {
  badgeToShow: BadgeType | null;
  showBadgeModal: boolean;
  openBadgeModal: (badge: BadgeType) => void;
  closeBadgeModal: () => void;
  isBadgeModalOpen: () => boolean;
}

export const useBadgeModalStore = create<BadgeModalState>((set, get) => ({
  badgeToShow: null,
  showBadgeModal: false,
  openBadgeModal: (badge) => set({ badgeToShow: badge, showBadgeModal: true }),
  closeBadgeModal: () => set({ badgeToShow: null, showBadgeModal: false }),
  isBadgeModalOpen: () => get().showBadgeModal,
}));