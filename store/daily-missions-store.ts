import { create } from 'zustand';
import type {
  Mission,
  DailyMissionsDoc,
} from '@/lib/firebase/daily-missions';

interface DailyMissionsState {
  missions: DailyMissionsDoc | null;
  loading: boolean;
  error: string | null;

  setMissions: (missions: DailyMissionsDoc | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateMissionProgress: (
    missionId: string,
    progress: number,
    completed: boolean
  ) => void;
  getMissionByType: (type: string) => Mission | undefined;
  getCompletedCount: () => number;
  getTotalCount: () => number;
  reset: () => void;
}

export const useDailyMissionsStore = create<DailyMissionsState>((set, get) => ({
  missions: null,
  loading: false,
  error: null,

  setMissions: (missions) => set({ missions }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  updateMissionProgress: (missionId, progress, completed) =>
    set((state) => {
      if (!state.missions) return state;

      const missions = state.missions.missions.map((m) =>
        m.id === missionId ? { ...m, progress, completed } : m
      );

      return {
        missions: {
          ...state.missions,
          missions,
        },
      };
    }),

  getMissionByType: (type) => {
    const state = get();
    return state.missions?.missions.find((m) => m.type === type);
  },

  getCompletedCount: () => {
    const state = get();
    return state.missions?.missions.filter((m) => m.completed).length ?? 0;
  },

  getTotalCount: () => {
    const state = get();
    return state.missions?.missions.length ?? 0;
  },

  reset: () => set({ missions: null, loading: false, error: null }),
}));