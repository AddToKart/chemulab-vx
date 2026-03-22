'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { StarRating } from '@/components/ui/star-rating';
import { cn } from '@/lib/utils';
import { useGameRatings, submitGameRating } from '@/lib/hooks/useGameRatings';

interface GameRatingSectionProps {
  gameId: string;
  gameName: string;
}

export default function GameRatingSection({ gameId, gameName }: GameRatingSectionProps) {
  const { user } = useAuthStore();
  const { ratings, loading } = useGameRatings(gameId);

  const [selectedRating, setSelectedRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const userRating = ratings.find((rating) => rating.id === user?.uid);

  useEffect(() => {
    setSelectedRating(userRating?.rating ?? 0);
  }, [userRating]);

  const handleRatingChange = async (nextRating: number) => {
    if (!user) {
      setSubmitStatus({
        type: 'error',
        message: 'Sign in to rate this game.',
      });
      return;
    }

    if (!user.emailVerified) {
      setSubmitStatus({
        type: 'error',
        message: 'Verify your email to submit a rating.',
      });
      return;
    }

    const previousRating = selectedRating;
    setSelectedRating(nextRating);
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      await submitGameRating(gameId, user.uid, nextRating, userRating);
      setSubmitStatus({
        type: 'success',
        message: `You rated ${gameName} ${nextRating} star${nextRating === 1 ? '' : 's'}.`,
      });
    } catch (error) {
      console.error('Error submitting rating:', error);
      setSelectedRating(previousRating);
      setSubmitStatus({
        type: 'error',
        message: 'Failed to save your rating. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="mt-6 rounded-[24px] border border-[var(--glass-border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-md)]">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-28 rounded bg-[var(--bg-sidebar)]" />
          <div className="h-9 w-48 rounded bg-[var(--bg-sidebar)]" />
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-[24px] border border-[var(--glass-border)] bg-[var(--bg-card)] p-5 text-center shadow-[var(--shadow-md)]">
      <h3 className="text-lg font-bold text-[var(--text-main)]">Rate the game</h3>
      <p className="mt-1 text-sm text-[var(--text-light)]">
        Tap a star to save your rating.
      </p>

      <div className="mt-4 flex justify-center">
        <StarRating
          rating={selectedRating}
          onRatingChange={handleRatingChange}
          readonly={isSubmitting}
          size="lg"
        />
      </div>

      {selectedRating > 0 && !submitStatus.message && (
        <p className="mt-3 text-sm text-[var(--text-light)]">
          Your rating: {selectedRating}/5
        </p>
      )}

      {submitStatus.message && (
        <p
          className={cn(
            'mt-3 text-sm',
            submitStatus.type === 'success' ? 'text-emerald-400' : 'text-red-400',
          )}
        >
          {submitStatus.message}
        </p>
      )}
    </section>
  );
}
