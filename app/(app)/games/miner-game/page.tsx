'use client';

import React from 'react';
import MinerGame from '@/components/game/MinerGame';
import { useAuthStore } from '@/store/auth-store';

export default function MinerGamePage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="min-h-screen py-8 pb-32">
       <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <MinerGame userId={user?.uid} />
       </div>
    </div>
  );
}
