'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { BADGES, type BadgeType } from '@/lib/types/badge';
import { useBadgeModalStore } from '@/store/badge-modal';
import { X } from 'lucide-react';

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  scale: number;
}

const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];

function Confetti({ count = 50 }: { count?: number }) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    const newParticles: ConfettiParticle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 0.5,
    }));
    setParticles(newParticles);
  }, [count]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-[9998]">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute h-2 w-2 rounded-sm animate-confetti"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg) scale(${particle.scale})`,
            animationDelay: `${Math.random() * 0.5}s`,
            animationDuration: `${2 + Math.random()}s`,
          }}
        />
      ))}
    </div>
  );
}

function ShimmerBadge({ badgeType }: { badgeType: keyof typeof BADGES }) {
  const badge = BADGES[badgeType as keyof typeof BADGES];

  return (
    <div className="relative" style={{ transform: 'scale(1.2)' }}>
      <div className="absolute inset-0 animate-ping rounded-full bg-yellow-400/50 z-[9997]" />
      <div className="absolute inset-0 animate-pulse rounded-full bg-yellow-300/30 z-[9997]" />
      <Image
        src={badge.imagePath}
        alt={badge.name}
        width={216}
        height={216}
        className="relative h-54 w-54 object-contain animate-[float_3s_ease-in-out_infinite] z-[9999]"
      />
    </div>
  );
}

export function BadgeUnlockModal() {
  const { badgeToShow, showBadgeModal, closeBadgeModal } = useBadgeModalStore();

  if (!badgeToShow) return null;

  const badge = BADGES[badgeToShow];

  return (
    <Dialog open={showBadgeModal} onOpenChange={(open) => {
      if (!open) {
        closeBadgeModal();
      }
    }}>
      <DialogContent 
        className="sm:max-w-xl z-[99999]"
        style={{ zIndex: 99999 }}
        showCloseButton={false}
      >
        <div className="relative overflow-hidden" style={{ zIndex: 99999 }}>
          <Confetti />

          <DialogHeader className="text-center relative z-[99999]" style={{ zIndex: 99999 }}>
            <div className="flex items-center justify-between w-full">
              <DialogTitle className="text-2xl font-bold text-yellow-500 flex-1 text-center">
                Badge Unlocked!
              </DialogTitle>
              <DialogClose asChild>
                <button
                  className="absolute right-4 top-4 h-8 w-8 flex items-center justify-center rounded-full border border-border bg-card hover:bg-muted transition-colors cursor-pointer z-[99999]"
                  style={{ zIndex: 99999 }}
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogClose>
            </div>
          </DialogHeader>

          <div className="flex flex-col items-center gap-6 py-6 relative z-[99999]" style={{ zIndex: 99999 }}>
            <ShimmerBadge badgeType={badgeToShow} />

            <div className="text-center">
              <h3 className="text-xl font-bold text-foreground">
                {badge.name}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {badge.description}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span className="animate-pulse">✨</span>
              <span>Keep discovering to earn more badges!</span>
              <span className="animate-pulse">✨</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}