'use client';

import Link from 'next/link';
import { Target, Trophy, Clock, Users, FlaskConical, BookOpen, MessageCircle, Compass } from 'lucide-react';
import { useDailyMissions } from '@/lib/hooks/use-daily-missions';
import { useAuthStore } from '@/store/auth-store';
import { MissionType, SimpleActivityId } from '@/lib/firebase/daily-missions';
import { DailyMissionsDialog } from './daily-missions-dialog';
import { useState } from 'react';

const MISSION_ICONS = {
  [MissionType.SINGLE_PLAYER_GAME]: Target,
  [MissionType.MULTIPLAYER_GAME]: Users,
  [MissionType.PERFORM_REACTION]: FlaskConical,
  [MissionType.SIMPLE_ACTIVITY]: BookOpen,
};

const ACTIVITY_LABELS: Record<string, string> = {
  [SimpleActivityId.STUDY]: 'Study',
  [SimpleActivityId.CHAT]: 'Chat',
  [SimpleActivityId.NOTEBOOK]: 'Notebook',
  [SimpleActivityId.EXPLORE]: 'Explore',
};

export function DailyMissionsWidget() {
  const { user } = useAuthStore();
  const { missions, completedCount, totalCount, loading } = useDailyMissions(user?.uid);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (loading || !missions) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="animate-pulse flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted" />
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-3 w-16 rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  const completedMissions = missions.missions.filter((m) => m.completed);
  const isAllCompleted = completedCount === totalCount && totalCount > 0;

  return (
    <>
      <button
        onClick={() => setIsDialogOpen(true)}
        className="group relative w-full text-left"
      >
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:border-primary hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isAllCompleted ? 'bg-yellow-500/20' : 'bg-primary/20'}`}>
                {isAllCompleted ? (
                  <Trophy className="h-5 w-5 text-yellow-500" />
                ) : (
                  <Target className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-foreground">Daily Missions</span>
                  {isAllCompleted && (
                    <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                      Done!
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {completedCount}/{totalCount} completed
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-primary opacity-0 transition-all duration-300 group-hover:opacity-100">
              <span className="text-lg">→</span>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            {missions.missions.map((mission, index) => {
              const Icon = MISSION_ICONS[mission.type] || Target;
              const isCompleted = mission.completed;
              const label = mission.activityId 
                ? ACTIVITY_LABELS[mission.activityId] || 'Activity'
                : mission.description.split(' ').slice(0, 2).join(' ');

              return (
                <div
                  key={mission.id}
                  className={`flex flex-1 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium ${
                    isCompleted
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isCompleted ? 'text-green-500' : ''}`} />
                  <span className="truncate">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </button>

      <DailyMissionsDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
}