'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  subscribeDailyMissions,
  completeGameMission,
  completeReactionMission,
  updateSimpleActivityTime,
  claimReward,
  type DailyMissionsDoc,
  type Mission,
  MissionType,
  SimpleActivityId,
} from '@/lib/firebase/daily-missions';
import { useDailyMissionsStore } from '@/store/daily-missions-store';

export type DailyMissionsSyncState = 'idle' | 'syncing' | 'synced' | 'error';

interface UseDailyMissionsResult {
  missions: DailyMissionsDoc | null;
  loading: boolean;
  syncState: DailyMissionsSyncState;
  getMissionByType: (type: MissionType) => Mission | undefined;
  completedCount: number;
  totalCount: number;
  claimReward: () => Promise<boolean>;
  completeGame: (gameId: string, isMultiplayer: boolean) => Promise<void>;
  completeReaction: () => Promise<void>;
  trackSimpleActivity: (activityId: SimpleActivityId) => Promise<void>;
}

const studyTimerRef = { current: null } as { current: ReturnType<typeof setTimeout> | null };
const studyStartTimeRef = { current: null } as { current: number | null };

export function useDailyMissions(uid?: string): UseDailyMissionsResult {
  const { missions, setMissions } = useDailyMissionsStore();
  const [syncState, setSyncState] = useState<DailyMissionsSyncState>('idle');
  const [loading, setLoadingState] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoadingState(false);
      return;
    }

    let cancelled = false;
    setSyncState('syncing');

    const unsubscribe = subscribeDailyMissions(uid, (doc) => {
      if (cancelled) return;
      setMissions(doc);
      setSyncState(doc ? 'synced' : 'error');
      setLoadingState(false);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [uid, setMissions]);

  const getMissionByType = useCallback(
    (type: MissionType): Mission | undefined => {
      return missions?.missions.find((m) => m.type === type);
    },
    [missions]
  );

  const completedCount = missions?.missions.filter((m) => m.completed).length ?? 0;
  const totalCount = missions?.missions.length ?? 0;

  const handleCompleteGame = useCallback(
    async (gameId: string, isMultiplayer: boolean) => {
      if (!uid) return;
      await completeGameMission(uid, gameId, isMultiplayer);
    },
    [uid]
  );

  const handleCompleteReaction = useCallback(async () => {
    if (!uid) return;
    await completeReactionMission(uid);
  }, [uid]);

  const handleClaimReward = useCallback(async (): Promise<boolean> => {
    if (!uid) return false;
    return claimReward(uid);
  }, [uid]);

  const handleTrackSimpleActivity = useCallback(
    async (activityId: SimpleActivityId) => {
      if (!uid) return;

      const mission = getMissionByType(MissionType.SIMPLE_ACTIVITY);
      if (!mission || mission.completed) return;
      if (mission.activityId === activityId) {
        await updateSimpleActivityTime(uid, 1);
      }
    },
    [uid, getMissionByType]
  );

  return {
    missions,
    loading,
    syncState,
    getMissionByType,
    completedCount,
    totalCount,
    completeGame: handleCompleteGame,
    completeReaction: handleCompleteReaction,
    trackSimpleActivity: handleTrackSimpleActivity,
    claimReward: handleClaimReward,
  };
}

let lastActivity: SimpleActivityId | null = null;

export function trackStudyTime(uid: string | undefined, isActive: boolean) {
  if (!uid) return;

  if (isActive) {
    if (!studyTimerRef.current) {
      studyStartTimeRef.current = Date.now();
      studyTimerRef.current = setInterval(async () => {
        if (studyStartTimeRef.current) {
          const elapsed = (Date.now() - studyStartTimeRef.current) / 60000;
          if (elapsed >= 1) {
            await updateSimpleActivityTime(uid, 1);
            studyStartTimeRef.current = Date.now();
          }
        }
      }, 60000);
    }
  } else {
    if (studyTimerRef.current) {
      clearInterval(studyTimerRef.current);
      studyTimerRef.current = null;
    }
    studyStartTimeRef.current = null;
  }
}

export async function markActivityComplete(
  uid: string | undefined,
  activityId: SimpleActivityId
) {
  if (!uid) return;
  lastActivity = activityId;
  await updateSimpleActivityTime(uid, 5);
}