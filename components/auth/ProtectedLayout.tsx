'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

/**
 * Wraps all (app) pages.
 * - While Firebase is resolving auth state (loading / user === undefined), shows a full-screen spinner.
 * - Once resolved, if user is null (signed out) → redirects to /sign-in.
 * - Otherwise renders children.
 */
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const router = useRouter();

  useEffect(() => {
    if (!loading && user === null) {
      router.replace('/sign-in');
    }
  }, [user, loading, router]);

  // Auth state not yet resolved — show a centered spinner
  if (loading || user === undefined) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          background: 'var(--bg-primary, #0f172a)',
          color: 'var(--text-primary, #f8fafc)',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '4px solid var(--border-color, rgba(255,255,255,0.1))',
            borderTopColor: 'var(--accent-color, #6366f1)',
            animation: 'chemulab-spin 0.75s linear infinite',
          }}
        />
        <style>{`@keyframes chemulab-spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontSize: '0.9rem', opacity: 0.6 }}>Loading CheMuLab…</span>
      </div>
    );
  }

  // Signed out — redirect in progress, render nothing
  if (user === null) return null;

  return <>{children}</>;
}
