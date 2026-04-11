'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { BadgeType } from '@/lib/types/badge';
import { BADGES } from '@/lib/types/badge';

interface BadgeDisplayProps {
  badgeType: BadgeType;
  earned: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const SIZES = {
  sm: 48,
  md: 80,
  lg: 128,
};

export function BadgeDisplay({
  badgeType,
  earned,
  size = 'md',
  showLabel = false,
  className,
}: BadgeDisplayProps) {
  const badge = BADGES[badgeType];
  const dimension = SIZES[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2',
        className
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-full',
          earned
            ? 'ring-2 ring-primary shadow-lg'
            : 'ring-2 ring-muted opacity-40'
        )}
        style={{ width: dimension, height: dimension }}
      >
        <Image
          src={badge.imagePath}
          alt={badge.name}
          width={dimension}
          height={dimension}
          className={cn(
            'h-full w-full object-contain transition-all duration-300',
            !earned && 'grayscale'
          )}
        />
        {!earned && (
          <div className="absolute inset-0 bg-background/50" />
        )}
      </div>
      {showLabel && (
        <span
          className={cn(
            'text-center text-xs font-medium',
            earned ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {badge.name}
        </span>
      )}
    </div>
  );
}