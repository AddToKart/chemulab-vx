import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from './config';

export enum MissionType {
  SINGLE_PLAYER_GAME = 'single_player_game',
  MULTIPLAYER_GAME = 'multiplayer_game',
  PERFORM_REACTION = 'perform_reaction',
  SIMPLE_ACTIVITY = 'simple_activity',
}

export enum SimpleActivityId {
  STUDY = 'study',
  CHAT = 'chat',
  NOTEBOOK = 'notebook',
  EXPLORE = 'explore',
}

export const SINGLE_PLAYER_GAMES = [
  'element-match',
  'reaction-quiz',
  'element-sort',
  'periodic-puzzle',
  'miner-game',
] as const;

export const MULTIPLAYER_GAMES = [
  'volcano',
  'foam-race',
  'balloon-race',
  'ph-challenge',
  'chemical-formula-race',
] as const;

export const SIMPLE_ACTIVITIES = [
  SimpleActivityId.STUDY,
  SimpleActivityId.CHAT,
  SimpleActivityId.NOTEBOOK,
  SimpleActivityId.EXPLORE,
] as const;

export type SinglePlayerGame = (typeof SINGLE_PLAYER_GAMES)[number];
export type MultiplayerGame = (typeof MULTIPLAYER_GAMES)[number];
export type SimpleActivity = (typeof SIMPLE_ACTIVITIES)[number];

export interface Mission {
  id: string;
  type: MissionType;
  target: number;
  progress: number;
  completed: boolean;
  gameId?: SinglePlayerGame | MultiplayerGame;
  activityId?: SimpleActivity;
  description: string;
}

export interface DailyMissionsDoc {
  date: string;
  missions: Mission[];
  completedAt: number | null;
  claimedReward: string | null;
  streak: number;
}

const SINGLE_PLAYER_GAME_DESCRIPTIONS: Record<SinglePlayerGame, string> = {
  'element-match': 'Play Element Match',
  'reaction-quiz': 'Play Reaction Quiz',
  'element-sort': 'Play Element Sort',
  'periodic-puzzle': 'Play Periodic Puzzle',
  'miner-game': 'Play Miner Game',
};

const MULTIPLAYER_GAME_DESCRIPTIONS: Record<MultiplayerGame, string> = {
  volcano: 'Play Volcano Race',
  'foam-race': 'Play Foam Race',
  'balloon-race': 'Play Balloon Race',
  'ph-challenge': 'Play pH Challenge',
  'chemical-formula-race': 'Play Chemical Formula Race',
};

const SIMPLE_ACTIVITY_DESCRIPTIONS: Record<SimpleActivity, string> = {
  [SimpleActivityId.STUDY]: 'Study the element table for 5 minutes',
  [SimpleActivityId.CHAT]: 'Chat with friends',
  [SimpleActivityId.NOTEBOOK]: 'View the lab notebook',
  [SimpleActivityId.EXPLORE]: 'Explore the elements',
};

export function getMissionDate(): string {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setHours(4, 0, 0, 0);

  if (now.getTime() < cutoff.getTime()) {
    cutoff.setDate(cutoff.getDate() - 1);
  }

  return cutoff.toISOString().split('T')[0];
}

function generateMissions(date: string): Mission[] {
  const dayNum = date.split('-').reduce((a, b) => a + parseInt(b), 0);

  const singlePlayerIndex = dayNum % SINGLE_PLAYER_GAMES.length;
  const multiplayerIndex = (dayNum + 3) % MULTIPLAYER_GAMES.length;
  const simpleActivityIndex = (dayNum + 7) % SIMPLE_ACTIVITIES.length;

  const singleGameId = SINGLE_PLAYER_GAMES[singlePlayerIndex];
  const multiGameId = MULTIPLAYER_GAMES[multiplayerIndex];
  const simpleActivityId = SIMPLE_ACTIVITIES[simpleActivityIndex];

  return [
    {
      id: `mission_${date}_sp`,
      type: MissionType.SINGLE_PLAYER_GAME,
      target: 1,
      progress: 0,
      completed: false,
      gameId: singleGameId,
      description: SINGLE_PLAYER_GAME_DESCRIPTIONS[singleGameId],
    },
    {
      id: `mission_${date}_mp`,
      type: MissionType.MULTIPLAYER_GAME,
      target: 1,
      progress: 0,
      completed: false,
      gameId: multiGameId,
      description: MULTIPLAYER_GAME_DESCRIPTIONS[multiGameId],
    },
    {
      id: `mission_${date}_reaction`,
      type: MissionType.PERFORM_REACTION,
      target: 2,
      progress: 0,
      completed: false,
      description: 'Perform 2 reactions',
    },
    {
      id: `mission_${date}_activity`,
      type: MissionType.SIMPLE_ACTIVITY,
      target: 5,
      progress: 0,
      completed: false,
      activityId: simpleActivityId,
      description: SIMPLE_ACTIVITY_DESCRIPTIONS[simpleActivityId],
    },
  ];
}

export async function loadDailyMissions(
  uid: string
): Promise<DailyMissionsDoc | null> {
  const docRef = doc(db, 'users', uid, 'daily-missions', getMissionDate());
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    const newDoc: DailyMissionsDoc = {
      date: getMissionDate(),
      missions: generateMissions(getMissionDate()),
      completedAt: null,
      claimedReward: null,
      streak: 0,
    };
    await setDoc(docRef, newDoc);
    return newDoc;
  }

  return snap.data() as DailyMissionsDoc;
}

export function subscribeDailyMissions(
  uid: string,
  callback: (doc: DailyMissionsDoc | null) => void
): () => void {
  const docRef = doc(db, 'users', uid, 'daily-missions', getMissionDate());

  return onSnapshot(docRef, async (snap) => {
    if (!snap.exists()) {
      const newDoc: DailyMissionsDoc = {
        date: getMissionDate(),
        missions: generateMissions(getMissionDate()),
        completedAt: null,
        claimedReward: null,
        streak: 0,
      };
      await setDoc(docRef, newDoc);
      callback(newDoc);
      return;
    }

    callback(snap.data() as DailyMissionsDoc);
  });
}

export async function updateMissionProgress(
  uid: string,
  missionType: MissionType,
  amount: number
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'daily-missions', getMissionDate());
  const snap = await getDoc(docRef);

  if (!snap.exists()) return;

  const data = snap.data() as DailyMissionsDoc;
  const missions = data.missions.map((m) => {
    if (m.type !== missionType || m.completed) return m;

    const newProgress = Math.min(m.progress + amount, m.target);
    const completed = newProgress >= m.target;

    return {
      ...m,
      progress: newProgress,
      completed,
    };
  });

  const allCompleted = missions.every((m) => m.completed);
  const completedAt = allCompleted && !data.completedAt ? Date.now() : data.completedAt;

  await updateDoc(docRef, {
    missions,
    completedAt,
    streak: allCompleted ? data.streak + 1 : data.streak,
  });
}

export async function completeGameMission(
  uid: string,
  gameId: string,
  isMultiplayer: boolean
): Promise<void> {
  const missionType = isMultiplayer
    ? MissionType.MULTIPLAYER_GAME
    : MissionType.SINGLE_PLAYER_GAME;

  await updateMissionProgress(uid, missionType, 1);
}

export async function completeReactionMission(uid: string): Promise<void> {
  await updateMissionProgress(uid, MissionType.PERFORM_REACTION, 1);
}

export async function updateSimpleActivityTime(
  uid: string,
  minutes: number
): Promise<void> {
  await updateMissionProgress(uid, MissionType.SIMPLE_ACTIVITY, minutes);
}

export async function claimReward(uid: string): Promise<boolean> {
  const docRef = doc(db, 'users', uid, 'daily-missions', getMissionDate());
  const snap = await getDoc(docRef);

  if (!snap.exists()) return false;

  const data = snap.data() as DailyMissionsDoc;
  if (data.completedAt || data.claimedReward) return false;

  await updateDoc(docRef, {
    claimedReward: `reward_${data.date}`,
    completedAt: Date.now(),
  });

  return true;
}