import { Suspense } from 'react';
import { DailyMissionsWidget } from '@/components/daily-missions/daily-missions-widget';

export default function DailyMissionsPage() {
  return (
    <div className="mainContent space-y-6">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
          Daily Missions
        </h1>
        <p className="text-lg text-muted-foreground">
          Complete missions to earn rewards and build your streak!
        </p>
      </div>

      <Suspense
        fallback={
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-48 rounded bg-muted" />
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-20 w-full rounded bg-muted" />
            </div>
          </div>
        }
      >
        <DailyMissionsWidget />
      </Suspense>
    </div>
  );
}