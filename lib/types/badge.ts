export enum BadgeType {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  MASTER = 'master',
}

export interface Badge {
  type: BadgeType;
  name: string;
  description: string;
  threshold: number;
  imagePath: string;
}

export interface UserBadges {
  beginner: boolean;
  intermediate: boolean;
  advanced: boolean;
  master: boolean;
}

export const BADGES: Record<BadgeType, Badge> = {
  [BadgeType.BEGINNER]: {
    type: BadgeType.BEGINNER,
    name: 'Beginner',
    description: 'Discover 10% of elements',
    threshold: 10,
    imagePath: '/badges/badge-beginner.png',
  },
  [BadgeType.INTERMEDIATE]: {
    type: BadgeType.INTERMEDIATE,
    name: 'Intermediate',
    description: 'Discover 50% of elements',
    threshold: 50,
    imagePath: '/badges/badge-intermediate.png',
  },
  [BadgeType.ADVANCED]: {
    type: BadgeType.ADVANCED,
    name: 'Advanced',
    description: 'Discover 75% of elements',
    threshold: 75,
    imagePath: '/badges/badge-advanced.png',
  },
  [BadgeType.MASTER]: {
    type: BadgeType.MASTER,
    name: 'Master',
    description: 'Discover all elements',
    threshold: 100,
    imagePath: '/badges/badge-master.png',
  },
};

export const BADGE_ORDER = [
  BadgeType.BEGINNER,
  BadgeType.INTERMEDIATE,
  BadgeType.ADVANCED,
  BadgeType.MASTER,
];

export function getBadgeFromThreshold(percentage: number): BadgeType | null {
  if (percentage >= 100) return BadgeType.MASTER;
  if (percentage >= 75) return BadgeType.ADVANCED;
  if (percentage >= 50) return BadgeType.INTERMEDIATE;
  if (percentage >= 10) return BadgeType.BEGINNER;
  return null;
}

export function getNewBadges(
  currentBadges: UserBadges,
  percentage: number
): BadgeType[] {
  const newBadges: BadgeType[] = [];

  for (const badgeType of BADGE_ORDER) {
    if (!currentBadges[badgeType] && percentage >= BADGES[badgeType].threshold) {
      newBadges.push(badgeType);
    }
  }

  return newBadges;
}

export function getHighestUnlockedBadge(userBadges: UserBadges): BadgeType | null {
  for (let i = BADGE_ORDER.length - 1; i >= 0; i--) {
    const badgeType = BADGE_ORDER[i];
    if (userBadges[badgeType]) {
      return badgeType;
    }
  }
  return null;
}

export function getEarnedBadgeCount(userBadges: UserBadges): number {
  return Object.values(userBadges).filter(Boolean).length;
}