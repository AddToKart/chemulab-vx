'use client';

import { useCallback, useEffect, useRef, type MouseEvent } from 'react';
import Link from 'next/link';
import { StarRating } from '@/components/ui/star-rating';
import { useAllGameRatings } from '@/lib/hooks/useGameRatings';

interface Game {
  id: string;
  href: string;
  emoji: string;
  title: string;
  description: string;
  cta: string;
  color: string;
}

const GAMES_SCROLL_STORAGE_KEY = 'chemulab:games:scrollY';
const GAMES_SCROLL_PENDING_KEY = 'chemulab:games:restorePending';
const SCROLL_RESTORE_RETRY_DELAY_MS = 100;
const SCROLL_RESTORE_MAX_ATTEMPTS = 60;

const singlePlayerGames: Game[] = [
  { id: 'element-match', href: '/games/element-match', emoji: '🧪', title: 'Element Match', description: 'Match symbols to element names', cta: 'Play Now', color: '#0ea5e9' },
  { id: 'reaction-quiz', href: '/games/reaction-quiz', emoji: '⚗️', title: 'Reaction Quiz', description: 'Predict the products of reactions', cta: 'Start Quiz', color: '#8b5cf6' },
  { id: 'element-sort', href: '/games/element-sort', emoji: '🧪', title: 'Element Sort', description: 'Sort elements by category into test tubes', cta: 'Sort Now', color: '#a855f7' },
  { id: 'periodic-puzzle', href: '/games/periodic-puzzle', emoji: '🧩', title: 'Periodic Puzzle', description: 'Assemble the table', cta: 'Solve Puzzle', color: '#f59e0b' },
  { id: 'miner-game', href: '/games/miner-game', emoji: '🧲', title: 'Miner Game', description: 'Extract the right elements!', cta: 'Start Mining', color: '#22c55e' },
];

const multiplayerGames: Game[] = [
  { id: 'volcano', href: '/games/volcano', emoji: '🌋', title: 'Volcano Race', description: '2-player ingredient race!', cta: 'Duel Start', color: '#ef4444' },
  { id: 'foam-race', href: '/games/foam-race', emoji: '🐘', title: 'Elephant Toothpaste', description: 'Fast-paced foam race!', cta: 'Race Now', color: '#10b981' },
  { id: 'balloon-race', href: '/games/balloon-race', emoji: '🎈', title: 'Balloon Race', description: 'Inflate balloons with CO₂!', cta: 'Inflate', color: '#f59e0b' },
  { id: 'ph-challenge', href: '/games/ph-challenge', emoji: '🌈', title: 'pH Challenge', description: 'Color-changing reaction!', cta: 'Challenge', color: '#6366f1' },
  { id: 'chemical-formula-race', href: '/games/chemical-formula-race', emoji: '💨', title: 'Chemical Formula Race', description: 'Type formulas faster than opponent!', cta: 'Race Now', color: '#06b6d4' },
];

function GamesGrid({
  games,
  onGameClick,
}: {
  games: Game[];
  onGameClick: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const { gameRatings } = useAllGameRatings();

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {games.map((game) => {
        const rating = gameRatings[game.id];
        const hasRatings = rating && rating.totalRatings > 0;

        return (
          <Link
            key={game.href}
            href={game.href}
            onClick={onGameClick}
            className="group flex min-h-[15rem] flex-col gap-2 rounded-[20px] border border-[var(--glass-border)] border-l-4 p-6 backdrop-blur-[40px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]"
            style={{
              background: `linear-gradient(135deg, ${game.color}15 0%, var(--bg-card) 100%)`,
              borderLeftColor: game.color,
            }}
          >
            <div className="text-[2.5rem] leading-none">{game.emoji}</div>
            <strong className="text-base font-bold text-[var(--text-main)]">{game.title}</strong>
            <div className="flex-1 text-sm leading-snug text-[var(--text-light)]">{game.description}</div>

            {hasRatings ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <StarRating rating={rating.averageRating} readonly size="sm" />
                <span className="text-xs text-[var(--text-light)]">
                  {rating.averageRating.toFixed(1)} ({rating.totalRatings})
                </span>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs italic text-[var(--text-light)]">No ratings yet</span>
              </div>
            )}

            <span className="mt-1 inline-block text-sm font-semibold transition-transform group-hover:translate-x-1" style={{ color: game.color }}>
              {game.cta} →
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export default function GamesPage() {
  const restoreTimeoutRef = useRef<number | null>(null);

  const clearRestoreTimer = useCallback(() => {
    if (restoreTimeoutRef.current) {
      window.clearTimeout(restoreTimeoutRef.current);
      restoreTimeoutRef.current = null;
    }
  }, []);

  const handleGameClick = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    sessionStorage.setItem(GAMES_SCROLL_STORAGE_KEY, String(window.scrollY));
    sessionStorage.setItem(GAMES_SCROLL_PENDING_KEY, '1');
  }, []);

  const restoreScrollPosition = useCallback(() => {
    clearRestoreTimer();

    const shouldRestore = sessionStorage.getItem(GAMES_SCROLL_PENDING_KEY) === '1';
    const storedScrollY = Number(sessionStorage.getItem(GAMES_SCROLL_STORAGE_KEY));

    if (!shouldRestore || !Number.isFinite(storedScrollY) || storedScrollY < 0) {
      sessionStorage.removeItem(GAMES_SCROLL_PENDING_KEY);
      return;
    }

    let attempts = 0;

    const attemptRestore = () => {
      const scrollRoot = document.scrollingElement ?? document.documentElement;
      const maxScrollY = Math.max(0, scrollRoot.scrollHeight - window.innerHeight);
      const targetScrollY = Math.min(storedScrollY, maxScrollY);

      window.scrollTo({ top: targetScrollY, behavior: 'auto' });

      const pageCanReachStoredPosition = maxScrollY >= storedScrollY - 2;
      const reachedTarget = Math.abs(window.scrollY - targetScrollY) <= 2;

      if (
        (pageCanReachStoredPosition && reachedTarget) ||
        attempts >= SCROLL_RESTORE_MAX_ATTEMPTS
      ) {
        sessionStorage.removeItem(GAMES_SCROLL_PENDING_KEY);
        restoreTimeoutRef.current = null;
        return;
      }

      attempts += 1;
      restoreTimeoutRef.current = window.setTimeout(
        attemptRestore,
        SCROLL_RESTORE_RETRY_DELAY_MS,
      );
    };

    restoreTimeoutRef.current = window.setTimeout(attemptRestore, 0);
  }, [clearRestoreTimer]);

  useEffect(() => {
    restoreScrollPosition();

    const handlePageShow = () => {
      restoreScrollPosition();
    };

    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      clearRestoreTimer();
    };
  }, [clearRestoreTimer, restoreScrollPosition]);

  return (
    <div className="relative space-y-8 overflow-hidden">
      <div className="pointer-events-none absolute right-0 top-0 h-[18rem] w-[18rem] rounded-full opacity-20 blur-[80px] sm:h-[22rem] sm:w-[22rem]" style={{ background: 'radial-gradient(circle, var(--accent-color), transparent)' }} />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[16rem] w-[16rem] rounded-full opacity-15 blur-[80px] sm:h-[19rem] sm:w-[19rem]" style={{ background: 'radial-gradient(circle, #0ea5e9, transparent)' }} />

      <section className="relative overflow-hidden rounded-[28px] border border-[var(--glass-border)] bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-sidebar)] p-6 shadow-[var(--shadow-md)] sm:p-8 lg:p-10">
        <div className="absolute left-[-30px] top-[-30px] h-[200px] w-[200px] rounded-full opacity-20 blur-[40px]" style={{ background: 'var(--accent-color)' }} />
        <div className="absolute bottom-[-20px] right-[20%] h-[150px] w-[150px] rounded-full opacity-15 blur-[30px]" style={{ background: '#0ea5e9' }} />

        <div className="relative z-10 max-w-2xl">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.15)] px-4 py-1.5 text-sm font-semibold text-emerald-400">
            🎮 Interactive Learning
          </span>
          <h2 className="mb-3 text-3xl font-extrabold leading-tight tracking-tight text-[var(--text-main)] sm:text-[2.5rem]">Games Arena</h2>
          <p className="text-base leading-relaxed text-[var(--text-light)]">
            Challenge yourself with chemistry puzzles and quizzes to sharpen your skills and unlock new achievements.
          </p>
        </div>

        <div className="absolute right-[25%] top-[15%] hidden text-3xl animate-[authFloat_3s_ease-in-out_infinite] lg:block">🧪</div>
        <div className="absolute right-[15%] top-[50%] hidden text-2xl animate-[authFloat_4s_ease-in-out_infinite_reverse_1s] lg:block">🧩</div>
        <div className="absolute right-[35%] top-[30%] hidden text-2xl animate-[authFloat_5s_ease-in-out_infinite_0.5s] lg:block">⚗️</div>
        <div className="absolute right-[28%] top-[65%] hidden text-xl animate-[authFloat_6s_ease-in-out_infinite_reverse_1.5s] lg:block">⚛️</div>
      </section>

      <div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold text-[var(--text-main)]">Single Player</h2>
          <span className="rounded-full border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.15)] px-3 py-1 text-xs font-semibold text-emerald-400">{singlePlayerGames.length} Modules Active</span>
        </div>
        <GamesGrid games={singlePlayerGames} onGameClick={handleGameClick} />
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold text-[var(--text-main)]">Multiplayer</h2>
          <span className="rounded-full border border-[rgba(14,165,233,0.3)] bg-[rgba(14,165,233,0.15)] px-3 py-1 text-xs font-semibold text-sky-400">{multiplayerGames.length} Modules Active</span>
        </div>
        <GamesGrid games={multiplayerGames} onGameClick={handleGameClick} />
      </div>
    </div>
  );
}
