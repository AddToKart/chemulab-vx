'use client';

import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Target, Trophy, Clock, Users, FlaskConical, BookOpen, MessageCircle, Compass, Check, Gamepad2, RefreshCw } from 'lucide-react';
import { useDailyMissions } from '@/lib/hooks/use-daily-missions';
import { useAuthStore } from '@/store/auth-store';
import { MissionType, SimpleActivityId } from '@/lib/firebase/daily-missions';

const MISSION_ICONS = {
  [MissionType.SINGLE_PLAYER_GAME]: Gamepad2,
  [MissionType.MULTIPLAYER_GAME]: Users,
  [MissionType.PERFORM_REACTION]: FlaskConical,
  [MissionType.SIMPLE_ACTIVITY]: BookOpen,
};

const ACTIVITY_LABELS: Record<string, string> = {
  [SimpleActivityId.STUDY]: 'Study element table',
  [SimpleActivityId.CHAT]: 'Chat with friends',
  [SimpleActivityId.NOTEBOOK]: 'View lab notebook',
  [SimpleActivityId.EXPLORE]: 'Explore elements',
};

const ACTIVITY_DESCRIPTIONS: Record<string, string> = {
  [SimpleActivityId.STUDY]: 'Spend 5 minutes studying the element table',
  [SimpleActivityId.CHAT]: 'Send a message in a group chat',
  [SimpleActivityId.NOTEBOOK]: 'Open your lab notebook',
  [SimpleActivityId.EXPLORE]: 'Browse the elements explorer',
};

interface DailyMissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DailyMissionsDialog({ open, onOpenChange }: DailyMissionsDialogProps) {
  const { user } = useAuthStore();
  const { missions, completedCount, totalCount } = useDailyMissions(user?.uid);

  if (!missions) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Daily Missions</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center text-muted-foreground">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  const isAllCompleted = completedCount === totalCount && totalCount > 0;
  const streak = missions.streak || 0;

  const getMissionHref = (mission: typeof missions.missions[0]) => {
    if (mission.type === MissionType.SINGLE_PLAYER_GAME || mission.type === MissionType.MULTIPLAYER_GAME) {
      return `/games${mission.gameId ? `/${mission.gameId}` : ''}`;
    }
    if (mission.type === MissionType.PERFORM_REACTION) {
      return '/lab';
    }
    if (mission.type === MissionType.SIMPLE_ACTIVITY) {
      switch (mission.activityId) {
        case SimpleActivityId.STUDY:
          return '/elements';
        case SimpleActivityId.CHAT:
          return '/groups';
        case SimpleActivityId.NOTEBOOK:
          return '/lab?notebook=true';
        case SimpleActivityId.EXPLORE:
          return '/elements';
        default:
          return '/';
      }
    }
    return '/';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {isAllCompleted ? (
                <Trophy className="h-5 w-5 text-yellow-500" />
              ) : (
                <Target className="h-5 w-5 text-primary" />
              )}
              Daily Missions
            </DialogTitle>
            {streak > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-orange-500/10 px-3 py-1 text-sm font-medium text-orange-600 dark:text-orange-400">
                <Flame className="h-4 w-4" /> {streak} day streak
              </span>
            )}
          </div>
          <DialogDescription>
            {isAllCompleted
              ? 'Great job! You\'ve completed all missions for today.'
              : `Complete ${totalCount - completedCount} more mission${totalCount - completedCount > 1 ? 's' : ''} to earn rewards.`}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          {missions.missions.map((mission) => {
            const Icon = MISSION_ICONS[mission.type] || Target;
            const isCompleted = mission.completed;
            const href = getMissionHref(mission);

            return (
              <Link
                key={mission.id}
                href={href}
                onClick={() => !isCompleted && onOpenChange(false)}
                className={`flex items-center gap-3 rounded-xl border p-3 transition-all duration-200 ${
                  isCompleted
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-border bg-card hover:border-primary hover:shadow-md'
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  isCompleted ? 'bg-green-500/20' : 'bg-primary/20'
                }`}>
                  {isCompleted ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <Icon className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
                      {mission.description}
                    </span>
                    {isCompleted && (
                      <span className="rounded-full bg-green-500/20 px-1.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                        Done
                      </span>
                    )}
                  </div>
                  {mission.type === MissionType.PERFORM_REACTION && !isCompleted && (
                    <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${(mission.progress / mission.target) * 100}%` }}
                      />
                    </div>
                  )}
                  {mission.type === MissionType.SIMPLE_ACTIVITY && mission.activityId && !isCompleted && (
                    <div className="text-xs text-muted-foreground">
                      {mission.target - mission.progress} min remaining
                    </div>
                  )}
                </div>
                {!isCompleted && (
                  <div className="text-primary">→</div>
                )}
              </Link>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/50 p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Resets at 4am</span>
          </div>
          <div className="text-sm font-medium text-foreground">
            {completedCount}/{totalCount} complete
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Flame({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}