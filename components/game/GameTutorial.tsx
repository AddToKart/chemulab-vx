import { type CSSProperties } from 'react';
import { type GameTutorial } from '@/lib/data/game-tutorials';

interface GameTutorialProps {
  tutorial: GameTutorial;
  accentColor?: string;
  className?: string;
}

export function GameTutorial({
  tutorial,
  accentColor = '#0ea5e9',
  className = '',
}: GameTutorialProps) {
  const cardStyle = {
    borderColor: `${accentColor}40`,
    background: `linear-gradient(135deg, ${accentColor}14 0%, rgba(255,255,255,0.02) 100%)`,
  } satisfies CSSProperties;

  const pillStyle = {
    backgroundColor: `${accentColor}22`,
    color: accentColor,
    borderColor: `${accentColor}40`,
  } satisfies CSSProperties;

  return (
    <section
      className={`w-full max-w-2xl rounded-3xl border p-5 text-left shadow-sm backdrop-blur-sm ${className}`.trim()}
      style={cardStyle}
      aria-label="How to play"
    >
      <div className="mb-4 flex items-center gap-3">
        <span
          className="inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]"
          style={pillStyle}
        >
          How to Play
        </span>
      </div>
      <p className="mb-4 text-sm leading-6 text-[var(--text-light)]">{tutorial.summary}</p>
      <ol className="space-y-2 text-sm leading-6 text-[var(--text-main)]">
        {tutorial.steps.map((step, index) => (
          <li key={step} className="flex items-start gap-3">
            <span
              className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{ backgroundColor: `${accentColor}22`, color: accentColor }}
            >
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      {tutorial.tip && (
        <p className="mt-4 text-sm font-medium text-[var(--text-light)]">
          Tip: <span className="font-normal">{tutorial.tip}</span>
        </p>
      )}
    </section>
  );
}
