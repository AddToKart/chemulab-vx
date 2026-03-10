'use client';

import { useAuthStore } from '@/store/auth-store';
import { TOTAL_ELEMENTS, type ProgressData } from '@/lib/firebase/discoveries';
import { useUserProgress } from '@/lib/hooks/use-user-progress';

export default function ProgressPage() {
  const { user, loading: authLoading } = useAuthStore();
  const { discoveries, progress, syncState } = useUserProgress(user?.uid);

  const milestoneLabels: { key: keyof ProgressData['milestones']; label: string }[] = [
    { key: 'beginner', label: 'Beginner (10%)' },
    { key: 'intermediate', label: 'Intermediate (50%)' },
    { key: 'advanced', label: 'Advanced (75%)' },
    { key: 'master', label: 'Master (100%)' },
  ];

  const syncLabel: Record<typeof syncState, string> = {
    idle: '',
    syncing: 'Syncing...',
    synced: 'Synced',
    error: 'Sync error; showing cached data',
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center p-16 text-[var(--text-light)]">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center p-16 text-[var(--text-light)]">
        <p>Sign in to track your progress.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[2rem] font-extrabold text-[var(--text-main)] tracking-tight">Progress Tracker</h1>
        {syncLabel[syncState] && (
          <span className="text-xs text-[var(--text-light)] italic">{syncLabel[syncState]}</span>
        )}
      </div>

      <section className="bg-[var(--bg-card)] backdrop-blur-[40px] border border-[var(--glass-border)] rounded-[28px] p-8 space-y-5">
        <h2 className="text-lg font-bold text-[var(--text-main)]">Overall Progress</h2>

        <div className="relative h-4 bg-[var(--bg-sidebar)] rounded-full overflow-hidden border border-[var(--border-color)]">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--accent-color)] to-[#0ea5e9] rounded-full transition-[width] duration-700"
            style={{ width: `${Math.min(progress.progressPercentage, 100)}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[0.65rem] font-bold text-white mix-blend-plus-lighter">
            {Math.round(progress.progressPercentage)}%
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
          <div className="bg-[var(--bg-sidebar)] rounded-[16px] p-5 border border-[var(--border-color)]">
            <h3 className="text-xs font-semibold text-[var(--text-light)] uppercase tracking-wide mb-2">Discovered</h3>
            <div className="text-3xl font-extrabold text-[var(--text-main)]">
              {progress.completedDiscoveries} <span className="text-lg text-[var(--text-light)]">/ {TOTAL_ELEMENTS}</span>
            </div>
          </div>

          <div className="bg-[var(--bg-sidebar)] rounded-[16px] p-5 border border-[var(--border-color)]">
            <h3 className="text-xs font-semibold text-[var(--text-light)] uppercase tracking-wide mb-3">Milestones</h3>
            <div className="flex flex-wrap gap-2">
              {milestoneLabels.map(({ key, label }) => (
                <span
                  key={key}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    progress.milestones[key]
                      ? 'bg-[rgba(16,185,129,0.15)] text-emerald-400 border-[rgba(16,185,129,0.3)]'
                      : 'bg-[var(--bg-card)] text-[var(--text-light)] border-[var(--border-color)] opacity-50'
                  }`}
                >
                  {progress.milestones[key] ? '✓ ' : ''}
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--bg-card)] backdrop-blur-[40px] border border-[var(--glass-border)] rounded-[28px] p-8 space-y-4">
        <h2 className="text-lg font-bold text-[var(--text-main)]">Discovered Elements</h2>

        {discoveries.length === 0 ? (
          <p className="text-[var(--text-light)] text-sm text-center py-10">
            No discoveries yet. Head to the lab and start experimenting!
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-[600px]:grid-cols-1">
            {discoveries.map((d) => (
              <div key={d.symbol} className="flex items-center gap-3 p-3 bg-[var(--bg-sidebar)] rounded-[12px] border border-[var(--border-color)] hover:border-[var(--accent-color)] transition-colors">
                <div className="w-10 h-10 flex items-center justify-center bg-[var(--bg-item-active)] rounded-[8px] font-bold text-[var(--text-main)] text-sm flex-shrink-0">
                  {d.symbol}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--text-main)] text-sm truncate">{d.name}</div>
                  <div className="text-[var(--text-light)] text-xs">
                    {new Date(d.dateDiscovered).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
