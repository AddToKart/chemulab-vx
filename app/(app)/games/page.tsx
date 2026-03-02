import Link from 'next/link';
import styles from './page.module.css';

const singlePlayerGames = [
  {
    href: '/games/element-match',
    emoji: '\uD83E\uDDEA',
    title: 'Element Match',
    description: 'Match symbols to element names',
    cta: 'Play Now',
    color: '#0ea5e9',
  },
  {
    href: '/games/reaction-quiz',
    emoji: '\u2697\uFE0F',
    title: 'Reaction Quiz',
    description: 'Predict the products of reactions',
    cta: 'Start Quiz',
    color: '#8b5cf6',
  },
  {
    href: '/games/whack-a-mole',
    emoji: '\u2696\uFE0F',
    title: 'Whack-a-Mole',
    description: 'Catch the heavy metals!',
    cta: 'Enter Arena',
    color: '#22c55e',
  },
  {
    href: '/games/periodic-puzzle',
    emoji: '\uD83E\uDDE9',
    title: 'Periodic Puzzle',
    description: 'Assemble the table',
    cta: 'Solve Puzzle',
    color: '#f59e0b',
  },
];

const multiplayerGames = [
  {
    href: '/games/volcano',
    emoji: '\uD83C\uDF0B',
    title: 'Volcano Race',
    description: '2-player ingredient race!',
    cta: 'Duel Start',
    color: '#ef4444',
  },
  {
    href: '/games/foam-race',
    emoji: '\uD83D\uDC18',
    title: 'Elephant Toothpaste',
    description: 'Fast-paced foam race!',
    cta: 'Race Now',
    color: '#10b981',
  },
  {
    href: '/games/balloon-race',
    emoji: '\uD83C\uDF88',
    title: 'Balloon Race',
    description: 'Inflate balloons with CO\u2082!',
    cta: 'Inflate',
    color: '#f59e0b',
  },
  {
    href: '/games/ph-challenge',
    emoji: '\uD83C\uDF08',
    title: 'pH Challenge',
    description: 'Color-changing reaction!',
    cta: 'Challenge',
    color: '#6366f1',
  },
];

export default function GamesPage() {
  return (
    <div className={styles.gamesPage}>
      {/* Background shapes */}
      <div className={styles.bgShapeRight} />
      <div className={styles.bgShapeLeft} />

      {/* Hero Banner */}
      <section className={styles.hero}>
        <div className={styles.heroDecor1} />
        <div className={styles.heroDecor2} />

        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span>\uD83C\uDFAE Interactive Learning</span>
          </div>
          <h2>Games Arena</h2>
          <p>
            Challenge yourself with chemistry puzzles and quizzes to sharpen
            your skills and unlock new achievements!
          </p>
        </div>

        <div className={styles.heroEmojis}>
          <div className={styles.floatingEmoji} style={{ top: '15%', left: '75%' }}>
            <span style={{ animationDuration: '3s' }}>\uD83E\uDDEA</span>
          </div>
          <div className={styles.floatingEmoji} style={{ top: '50%', left: '85%' }}>
            <span style={{ animationDuration: '4s', animationDirection: 'reverse', animationDelay: '1s' }}>\uD83E\uDDE9</span>
          </div>
          <div className={styles.floatingEmoji} style={{ top: '30%', left: '65%' }}>
            <span style={{ animationDuration: '5s', animationDelay: '0.5s' }}>\u2697\uFE0F</span>
          </div>
          <div className={styles.floatingEmoji} style={{ top: '65%', left: '72%' }}>
            <span style={{ animationDuration: '6s', animationDirection: 'reverse', animationDelay: '1.5s' }}>\u269B\uFE0F</span>
          </div>
        </div>
      </section>

      {/* Single Player Section */}
      <div className={styles.sectionHeader}>
        <h2>Single Player</h2>
        <div className={styles.badge}>4 Modules Active</div>
      </div>

      <div className={styles.gamesGrid}>
        {singlePlayerGames.map((game) => (
          <Link
            key={game.href}
            href={game.href}
            className={styles.gameCard}
            style={{
              background: `linear-gradient(135deg, ${game.color}15 0%, var(--bg-card) 100%)`,
              borderLeft: `4px solid ${game.color}`,
            }}
          >
            <div className={styles.gameEmoji}>{game.emoji}</div>
            <strong>{game.title}</strong>
            <div className={styles.gameDesc}>{game.description}</div>
            <span className={styles.gameCta} style={{ color: game.color }}>
              {game.cta} &rarr;
            </span>
          </Link>
        ))}
      </div>

      {/* Multiplayer Section */}
      <div className={styles.sectionHeader} style={{ marginTop: '3rem' }}>
        <h2>Multiplayer</h2>
        <div className={`${styles.badge} ${styles.badgeMultiplayer}`}>4 Modules Active</div>
      </div>

      <div className={styles.gamesGrid}>
        {multiplayerGames.map((game) => (
          <Link
            key={game.href}
            href={game.href}
            className={styles.gameCard}
            style={{
              background: `linear-gradient(135deg, ${game.color}15 0%, var(--bg-card) 100%)`,
              borderLeft: `4px solid ${game.color}`,
            }}
          >
            <div className={styles.gameEmoji}>{game.emoji}</div>
            <strong>{game.title}</strong>
            <div className={styles.gameDesc}>{game.description}</div>
            <span className={styles.gameCta} style={{ color: game.color }}>
              {game.cta} &rarr;
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
