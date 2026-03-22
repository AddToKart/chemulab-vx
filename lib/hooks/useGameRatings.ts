'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import {
  collection,
  doc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type FieldValue,
} from 'firebase/firestore';

export interface GameRating {
  id: string;
  gameId: string;
  rating: number;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  } | null;
  updatedAt: {
    seconds: number;
    nanoseconds: number;
  } | null;
}

export interface GameRatingStats {
  averageRating: number;
  totalRatings: number;
  ratingCounts: { rating: number; count: number; percentage: number }[];
}

const GAME_RATING_SCALE = [1, 2, 3, 4, 5];
const GAME_IDS = [
  'element-match',
  'reaction-quiz',
  'whack-a-mole',
  'periodic-puzzle',
  'volcano',
  'foam-race',
  'balloon-race',
  'ph-challenge',
];

function buildRatingStats(ratings: GameRating[]): GameRatingStats {
  return {
    averageRating:
      ratings.length > 0
        ? ratings.reduce((acc, item) => acc + item.rating, 0) / ratings.length
        : 0,
    totalRatings: ratings.length,
    ratingCounts: GAME_RATING_SCALE.map((rating) => {
      const count = ratings.filter((item) => item.rating === rating).length;

      return {
        rating,
        count,
        percentage: ratings.length > 0 ? (count / ratings.length) * 100 : 0,
      };
    }),
  };
}

export function useGameRatings(gameId: string) {
  const [ratings, setRatings] = useState<GameRating[]>([]);
  const [loading, setLoading] = useState(Boolean(gameId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) {
      return;
    }

    const ratingsQuery = query(
      collection(db, 'gameRatings', gameId, 'ratings'),
      orderBy('updatedAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      ratingsQuery,
      (snapshot) => {
        const ratingsData = snapshot.docs.map((ratingDoc) => ({
          id: ratingDoc.id,
          gameId,
          ...ratingDoc.data(),
        })) as GameRating[];

        setRatings(ratingsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching game ratings:', err);
        setError('Failed to load ratings');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [gameId]);

  return { ratings, stats: buildRatingStats(ratings), loading, error };
}

export function useAllGameRatings() {
  const [gameRatings, setGameRatings] = useState<Record<string, GameRatingStats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribes: Array<() => void> = [];

    GAME_IDS.forEach((gameId) => {
      const ratingsQuery = query(
        collection(db, 'gameRatings', gameId, 'ratings'),
        orderBy('updatedAt', 'desc'),
      );

      const unsubscribe = onSnapshot(ratingsQuery, (snapshot) => {
        const ratings = snapshot.docs.map((ratingDoc) => ({
          id: ratingDoc.id,
          gameId,
          ...ratingDoc.data(),
        })) as GameRating[];

        setGameRatings((prev) => ({
          ...prev,
          [gameId]: buildRatingStats(ratings),
        }));
        setLoading(false);
      });

      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  return { gameRatings, loading };
}

function isGameRating(value: unknown): value is GameRating {
  return typeof value === 'object' && value !== null && 'rating' in value;
}

export async function submitGameRating(
  gameId: string,
  userId: string,
  rating: number,
  existingRatingOrLegacyComment?: GameRating | string,
) {
  const ratingRef = doc(db, 'gameRatings', gameId, 'ratings', userId);
  const existingRating = isGameRating(existingRatingOrLegacyComment)
    ? existingRatingOrLegacyComment
    : undefined;

  const ratingData: {
    gameId: string;
    rating: number;
    createdAt: FieldValue | GameRating['createdAt'];
    updatedAt: FieldValue;
  } = {
    gameId,
    rating,
    createdAt: existingRating?.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ratingRef, ratingData);
}

export async function deleteGameRating(gameId: string, userId: string) {
  const ratingRef = doc(db, 'gameRatings', gameId, 'ratings', userId);
  await deleteDoc(ratingRef);
}
