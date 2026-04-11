'use client';

import { BadgeDisplay } from './badge-display';
import { BADGE_ORDER, type BadgeType, type UserBadges, BADGES } from '@/lib/types/badge';

interface BadgeListProps {
  userBadges: UserBadges;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function BadgeList({
  userBadges,
  showLabels = true,
  size = 'md',
}: BadgeListProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {BADGE_ORDER.map((badgeType) => (
        <BadgeDisplay
          key={badgeType}
          badgeType={badgeType}
          earned={userBadges[badgeType]}
          size={size}
          showLabel={showLabels}
        />
      ))}
    </div>
  );
}

interface BadgeListCompactProps {
  userBadges: UserBadges;
}

export function BadgeListCompact({ userBadges }: BadgeListCompactProps) {
  const earnedCount = Object.values(userBadges).filter(Boolean).length;

  return (
    <div className="flex items-center gap-2">
      {BADGE_ORDER.map((badgeType) => (
        <div
          key={badgeType}
          className="transition-opacity duration-300"
        >
          <BadgeDisplay
            badgeType={badgeType}
            earned={userBadges[badgeType]}
            size="sm"
          />
        </div>
      ))}
    </div>
  );
}