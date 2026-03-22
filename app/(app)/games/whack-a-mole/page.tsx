'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { elementsData } from '@/lib/data/elements-data';
import styles from './page.module.css';

import { ShareGameScore } from '@/components/game/ShareGameScore';
import { GameTutorial } from '@/components/game/GameTutorial';
import DifficultySelector from '@/components/game/DifficultySelector';
import TimerProgress from '@/components/game/TimerProgress';
import GameRating from '@/components/game/GameRating';
import { gameTutorials } from '@/lib/data/game-tutorials';
import {
  DifficultyLevel,
  whackAMoleDifficulty,
  WhackAMoleSettings,
} from '@/lib/types/game-difficulty';

interface Hole {
  symbol: string | null;
  isHeavyMetal: boolean;
  clickState: 'none' | 'correct' | 'wrong';
}

function createEmptyHoles(totalHoles: number): Hole[] {
  return Array.from({ length: totalHoles }, () => ({
    symbol: null,
    isHeavyMetal: false,
    clickState: 'none',
  }));
}

export default function WhackAMolePage() {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('intermediate');

  // Get difficulty settings
  const difficultySettings: WhackAMoleSettings = whackAMoleDifficulty[difficulty];

  const gameIntervalRef = useRef<NodeJS.Timeout>(undefined);
  const moleIntervalRef = useRef<NodeJS.Timeout>(undefined);
  const clickTimeoutRefs = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const allSymbols = elementsData.map((el) => el.symbol);

  const clearAllIntervals = useCallback(() => {
    if (gameIntervalRef.current) {
      clearInterval(gameIntervalRef.current);
      gameIntervalRef.current = undefined;
    }
    if (moleIntervalRef.current) {
      clearInterval(moleIntervalRef.current);
      moleIntervalRef.current = undefined;
    }
    clickTimeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
    clickTimeoutRefs.current.clear();
  }, []);

  const popMoles = useCallback(() => {
    const settings = whackAMoleDifficulty[difficulty];
    const newHoles = createEmptyHoles(settings.holeCount);
    const [minMoles, maxMoles] = settings.molesPerPop;
    const moleCount = Math.floor(Math.random() * (maxMoles - minMoles + 1)) + minMoles;

    const availableIndices = Array.from({ length: settings.holeCount }, (_, i) => i);
    for (let i = availableIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableIndices[i], availableIndices[j]] = [availableIndices[j], availableIndices[i]];
    }

    const selectedIndices = availableIndices.slice(0, moleCount);

    for (const idx of selectedIndices) {
      const symbol = allSymbols[Math.floor(Math.random() * allSymbols.length)];
      newHoles[idx] = {
        symbol,
        isHeavyMetal: settings.heavyMetals.includes(symbol),
        clickState: 'none',
      };
    }

    setHoles(newHoles);
  }, [allSymbols, difficulty]);

  const endGame = useCallback(() => {
    const settings = whackAMoleDifficulty[difficulty];
    clearAllIntervals();
    setIsGameRunning(false);
    setGameOver(true);
    setHoles(createEmptyHoles(settings.holeCount));
  }, [clearAllIntervals, difficulty]);

  const startGame = useCallback(() => {
    const settings = whackAMoleDifficulty[difficulty];
    clearAllIntervals();
    setScore(0);
    setTimeLeft(settings.duration);
    setGameOver(false);
    setIsGameRunning(true);
    setHoles(createEmptyHoles(settings.holeCount));

    // Start mole popping
    // Small delay so state is settled before first pop
    setTimeout(() => {
      popMoles();
    }, 100);

    moleIntervalRef.current = setInterval(() => {
      popMoles();
    }, settings.moleInterval);

    // Start countdown timer
    gameIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearAllIntervals, popMoles, difficulty]);

  // Watch for time running out
  useEffect(() => {
    if (isGameRunning && timeLeft <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      endGame();
    }
  }, [timeLeft, isGameRunning, endGame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllIntervals();
    };
  }, [clearAllIntervals]);

  const handleClick = useCallback(
    (index: number) => {
      if (!isGameRunning) return;

      const hole = holes[index];
      if (!hole.symbol || hole.clickState !== 'none') return;

      const isCorrect = hole.isHeavyMetal;

      // Apply scoring multiplier
      const settings = whackAMoleDifficulty[difficulty];
      const basePoints = isCorrect ? settings.heavyMetalPoints : settings.safeElementPoints;
      const points = Math.round(basePoints * settings.scoringMultiplier);

      if (isCorrect) {
        setScore((prev) => prev + points);
      } else {
        setScore((prev) => prev + points); // Points can be negative
      }

      // Show visual feedback
      setHoles((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          clickState: isCorrect ? 'correct' : 'wrong',
        };
        return updated;
      });

      // Clear the hole after feedback delay
      const timeout = setTimeout(() => {
        setHoles((prev) => {
          const updated = [...prev];
          updated[index] = {
            symbol: null,
            isHeavyMetal: false,
            clickState: 'none',
          };
          return updated;
        });
        clickTimeoutRefs.current.delete(index);
      }, settings.moleInterval / 2); // Use half of mole interval for feedback

      // Track timeout for cleanup
      const existing = clickTimeoutRefs.current.get(index);
      if (existing) clearTimeout(existing);
      clickTimeoutRefs.current.set(index, timeout);
    },
    [isGameRunning, holes, difficulty]
  );

  const getHoleClassName = (hole: Hole): string => {
    const classes = [styles.moleHole];

    if (hole.clickState === 'correct') {
      classes.push(styles.moleHoleClickedCorrect);
    } else if (hole.clickState === 'wrong') {
      classes.push(styles.moleHoleClickedWrong);
    } else if (hole.symbol && hole.isHeavyMetal) {
      classes.push(styles.moleHoleHeavyMetal);
    } else if (hole.symbol) {
      classes.push(styles.moleHoleActive);
    }

    return classes.join(' ');
  };

  return (
    <div>
      <Link href="/games" className={styles.backLink}>
        &larr; Back to Games
      </Link>

      <div className={styles.gameArea}>
        <h1 className={styles.title}>Whack-a-Mole: Heavy Metals</h1>

        {!isGameRunning && !gameOver && (
          <div className={styles.startScreen}>
            <GameTutorial tutorial={gameTutorials.whackAMole} accentColor="#22c55e" />
            <div className={styles.instructions}>
              <p>
                <strong>Click on the heavy metals</strong> ({whackAMoleDifficulty[difficulty].heavyMetals.join(', ')}) to score points!
              </p>
              <p>
                +{whackAMoleDifficulty[difficulty].heavyMetalPoints} points for each heavy metal caught. {whackAMoleDifficulty[difficulty].safeElementPoints > 0 ? '+' : ''}{whackAMoleDifficulty[difficulty].safeElementPoints} points for clicking a safe element.
              </p>
            </div>
            <DifficultySelector
              onSelect={setDifficulty}
              selected={difficulty}
            />
            <button className={styles.startBtn} onClick={startGame}>
              Start Game
            </button>
          </div>
        )}

        {isGameRunning && (
          <>
            <TimerProgress
              timeLeft={timeLeft}
              totalTime={whackAMoleDifficulty[difficulty].duration}
              isGameActive={isGameRunning}
            />

            <div className={styles.scoreBoard}>
              <span>Score: {score}</span>
            </div>

            <div className={styles.moleGrid}>
              {holes.map((hole, index) => (
                <div
                  key={index}
                  className={getHoleClassName(hole)}
                  onClick={() => handleClick(index)}
                >
                  {hole.symbol ?? ''}
                </div>
              ))}
            </div>
          </>
        )}

        {gameOver && (
          <div>
            <div className={styles.gameOver}>Game Over!</div>
            <div className={styles.finalScore}>{score}</div>
            <p>points</p>
            <div style={{ margin: '1rem 0', display: 'flex', justifyContent: 'center' }}>
              <ShareGameScore score={score} gameName="Whack-a-Mole" />
            </div>
            <button className={styles.restartBtn} onClick={startGame}>
              Play Again
            </button>
            <GameRating gameId="whack-a-mole" gameName="Whack-a-Mole" />
          </div>
        )}
      </div>
    </div>
  );
}
