'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { elementsData } from '@/lib/data/elements-data';
import styles from './page.module.css';

const HEAVY_METALS = ['Pb', 'Hg', 'Cd', 'As', 'Tl', 'Cr', 'U', 'Pu', 'Ra', 'Po'];
const TOTAL_HOLES = 16;
const GAME_DURATION = 30;
const MOLE_INTERVAL = 1200;
const MIN_MOLES = 3;
const MAX_MOLES = 5;
const CLICK_FEEDBACK_MS = 200;

interface Hole {
  symbol: string | null;
  isHeavyMetal: boolean;
  clickState: 'none' | 'correct' | 'wrong';
}

function createEmptyHoles(): Hole[] {
  return Array.from({ length: TOTAL_HOLES }, () => ({
    symbol: null,
    isHeavyMetal: false,
    clickState: 'none',
  }));
}

export default function WhackAMolePage() {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [holes, setHoles] = useState<Hole[]>(createEmptyHoles);

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
    const newHoles = createEmptyHoles();
    const moleCount = Math.floor(Math.random() * (MAX_MOLES - MIN_MOLES + 1)) + MIN_MOLES;

    const availableIndices = Array.from({ length: TOTAL_HOLES }, (_, i) => i);
    for (let i = availableIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableIndices[i], availableIndices[j]] = [availableIndices[j], availableIndices[i]];
    }

    const selectedIndices = availableIndices.slice(0, moleCount);

    for (const idx of selectedIndices) {
      const symbol = allSymbols[Math.floor(Math.random() * allSymbols.length)];
      newHoles[idx] = {
        symbol,
        isHeavyMetal: HEAVY_METALS.includes(symbol),
        clickState: 'none',
      };
    }

    setHoles(newHoles);
  }, [allSymbols]);

  const endGame = useCallback(() => {
    clearAllIntervals();
    setIsGameRunning(false);
    setGameOver(true);
    setHoles(createEmptyHoles());
  }, [clearAllIntervals]);

  const startGame = useCallback(() => {
    clearAllIntervals();
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setGameOver(false);
    setIsGameRunning(true);
    setHoles(createEmptyHoles());

    // Start mole popping
    // Small delay so state is settled before first pop
    setTimeout(() => {
      popMoles();
    }, 100);

    moleIntervalRef.current = setInterval(() => {
      popMoles();
    }, MOLE_INTERVAL);

    // Start countdown timer
    gameIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearAllIntervals, popMoles]);

  // Watch for time running out
  useEffect(() => {
    if (isGameRunning && timeLeft <= 0) {
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

      if (isCorrect) {
        setScore((prev) => prev + 10);
      } else {
        setScore((prev) => prev - 5);
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
      }, CLICK_FEEDBACK_MS);

      // Track timeout for cleanup
      const existing = clickTimeoutRefs.current.get(index);
      if (existing) clearTimeout(existing);
      clickTimeoutRefs.current.set(index, timeout);
    },
    [isGameRunning, holes],
  );

  const timerPercent = (timeLeft / GAME_DURATION) * 100;

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

        {isGameRunning && (
          <>
            <div className={styles.scoreBoard}>
              <span>Score: {score}</span>
              <span>Time: {timeLeft}s</span>
            </div>

            <div className={styles.timerBar}>
              <div
                className={styles.timerFill}
                style={{ width: `${timerPercent}%` }}
              />
            </div>
          </>
        )}

        {!isGameRunning && !gameOver && (
          <div className={styles.instructions}>
            <p>
              <strong>Click on the heavy metals</strong> (Pb, Hg, Cd, As, Tl,
              Cr, U, Pu, Ra, Po) to score points!
            </p>
            <p>
              +10 points for each heavy metal caught. -5 points for clicking a
              safe element.
            </p>
          </div>
        )}

        {isGameRunning && (
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
        )}

        {!isGameRunning && !gameOver && (
          <button className={styles.startBtn} onClick={startGame}>
            Start Game
          </button>
        )}

        {gameOver && (
          <div>
            <div className={styles.gameOver}>Game Over!</div>
            <div className={styles.finalScore}>{score}</div>
            <p>points</p>
            <button className={styles.restartBtn} onClick={startGame}>
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
