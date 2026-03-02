'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const router = useRouter();

  useEffect(() => {
    if (!loading && user === null) {
      router.replace('/sign-in');
    }
  }, [user, loading, router]);

  if (loading || user === undefined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0f172a] text-slate-100">
        <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-emerald-500 animate-spin" />
        <span className="text-sm opacity-60">Loading CheMuLab…</span>
      </div>
    );
  }

  if (user === null) return null;

  return <>{children}</>;
}