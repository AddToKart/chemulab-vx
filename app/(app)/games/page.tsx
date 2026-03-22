'use client';

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

const singlePlayerGames: Game[] = [
  { id: 'element-match', href: '/games/element-match', emoji: '🧪', title: 'Element Match', description: 'Match symbols to element names', cta: 'Play Now', color: '#0ea5e9' },
  { id: 'reaction-quiz', href: '/games/reaction-quiz', emoji: '⚗️', title: 'Reaction Quiz', description: 'Predict the products of reactions', cta: 'Start Quiz', color: '#8b5cf6' },
  { id: 'whack-a-mole', href: '/games/whack-a-mole', emoji: '⚖️', title: 'Whack-a-Mole', description: 'Catch the heavy metals!', cta: 'Enter Arena', color: '#22c55e' },
  { id: 'periodic-puzzle', href: '/games/periodic-puzzle', emoji: '🧩', title: 'Periodic Puzzle', description: 'Assemble the table', cta: 'Solve Puzzle', color: '#f59e0b' },
];

const multiplayerGames: Game[] = [
  { id: 'volcano', href: '/games/volcano', emoji: '🌋', title: 'Volcano Race', description: '2-player ingredient race!', cta: 'Duel Start', color: '#ef4444' },
  { id: 'foam-race', href: '/games/foam-race', emoji: '🐘', title: 'Elephant Toothpaste', description: 'Fast-paced foam race!', cta: 'Race Now', color: '#10b981' },
  { id: 'balloon-race', href: '/games/balloon-race', emoji: '🎈', title: 'Balloon Race', description: 'Inflate balloons with CO₂!', cta: 'Inflate', color: '#f59e0b' },
  { id: 'ph-challenge', href: '/games/ph-challenge', emoji: '🌈', title: 'pH Challenge', description: 'Color-changing reaction!', cta: 'Challenge', color: '#6366f1' },
];

function GamesGrid({ games }: { games: Game[] }) {
  const { gameRatings } = useAllGameRatings();

  return (
    <div className="grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 max-[600px]:grid-cols-1">
      {games.map((game) => {
        const rating = gameRatings[game.id];
        const hasRatings = rating && rating.totalRatings > 0;

        return (
          <Link
            key={game.href}
            href={game.href}
            className="flex flex-col gap-2 p-6 rounded-[20px] border-l-4 bg-[var(--bg-card)] backdrop-blur-[40px] border border-[var(--glass-border)] hover:translate-y-[-4px] hover:shadow-[var(--shadow-lg)] transition-all duration-300 group"
            style={{
              background: `linear-gradient(135deg, ${game.color}15 0%, var(--bg-card) 100%)`,
              borderLeftColor: game.color,
            }}
          >
            <div className="text-[2.5rem] leading-none">{game.emoji}</div>
            <strong className="text-[var(--text-main)] font-bold text-base">{game.title}</strong>
            <div className="text-[var(--text-light)] text-sm leading-snug flex-1">{game.description}</div>

            {/* Rating Display */}
            {hasRatings ? (
              <div className="flex items-center gap-2 mt-1">
                <StarRating rating={rating.averageRating} readonly size="sm" />
                <span className="text-xs text-[var(--text-light)]">
                  {rating.averageRating.toFixed(1)} ({rating.totalRatings})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-[var(--text-light)] italic">No ratings yet</span>
              </div>
            )}

            <span className="text-sm font-semibold mt-1 group-hover:translate-x-1 transition-transform inline-block" style={{ color: game.color }}>
              {game.cta} →
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export default function GamesPage() {
  return (
    <div className="space-y-8 relative">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-[350px] h-[350px] rounded-full pointer-events-none opacity-20 blur-[80px]" style={{ background: 'radial-gradient(circle, var(--accent-color), transparent)' }} />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full pointer-events-none opacity-15 blur-[80px]" style={{ background: 'radial-gradient(circle, #0ea5e9, transparent)' }} />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-sidebar)] border border-[var(--glass-border)] rounded-[28px] p-10 overflow-hidden shadow-[var(--shadow-md)]">
        <div className="absolute top-[-30px] left-[-30px] w-[200px] h-[200px] rounded-full opacity-20 blur-[40px]" style={{ background: 'var(--accent-color)' }} />
        <div className="absolute bottom-[-20px] right-[20%] w-[150px] h-[150px] rounded-full opacity-15 blur-[30px]" style={{ background: '#0ea5e9' }} />

        <div className="relative z-10 max-w-lg">
          <span className="inline-flex items-center gap-2 bg-[rgba(16,185,129,0.15)] border border-[rgba(16,185,129,0.3)] text-emerald-400 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            🎮 Interactive Learning
          </span>
          <h2 className="text-[2.5rem] font-extrabold text-[var(--text-main)] tracking-tight leading-tight mb-3">Games Arena</h2>
          <p className="text-[var(--text-light)] text-base leading-relaxed">
            Challenge yourself with chemistry puzzles and quizzes to sharpen your skills and unlock new achievements!
          </p>
        </div>

        {/* Floating emojis */}
        <div className="absolute top-[15%] right-[25%] text-3xl animate-[authFloat_3s_ease-in-out_infinite]">🧪</div>
        <div className="absolute top-[50%] right-[15%] text-2xl animate-[authFloat_4s_ease-in-out_infinite_reverse_1s]">🧩</div>
        <div className="absolute top-[30%] right-[35%] text-2xl animate-[authFloat_5s_ease-in-out_infinite_0.5s]">⚗️</div>
        <div className="absolute top-[65%] right-[28%] text-xl animate-[authFloat_6s_ease-in-out_infinite_reverse_1.5s]">⚛️</div>
      </section>

      {/* Single Player */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-bold text-[var(--text-main)]">Single Player</h2>
          <span className="bg-[rgba(16,185,129,0.15)] text-emerald-400 border border-[rgba(16,185,129,0.3)] text-xs font-semibold px-3 py-1 rounded-full">4 Modules Active</span>
        </div>
        <GamesGrid games={singlePlayerGames} />
      </div>

      {/* Multiplayer */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-bold text-[var(--text-main)]">Multiplayer</h2>
          <span className="bg-[rgba(14,165,233,0.15)] text-sky-400 border border-[rgba(14,165,233,0.3)] text-xs font-semibold px-3 py-1 rounded-full">4 Modules Active</span>
        </div>
        <GamesGrid games={multiplayerGames} />
      </div>
    </div>
  );
}

