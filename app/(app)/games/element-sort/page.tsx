'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import styles from './page.module.css';

import { ShareGameScore } from '@/components/game/ShareGameScore';
import { GameTutorial } from '@/components/game/GameTutorial';
import DifficultySelector from '@/components/game/DifficultySelector';
import GameRating from '@/components/game/GameRating';
import ElementSortGame from '@/components/game/ElementSortGame';
import { gameTutorials } from '@/lib/data/game-tutorials';
import {
  DifficultyLevel,
  ElementSortSettings,
  elementSortDifficulty,
} from '@/lib/types/element-sort';

export default function ElementSortPage() {
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [timeBonus, setTimeBonus] = useState(0);
  const [isGameActive, setIsGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('beginner');
  const [gameKey, setGameKey] = useState(0);

  const difficultySettings: ElementSortSettings = elementSortDifficulty[difficulty];

  const startGame = useCallback(() => {
    setScore(0);
    setMoves(0);
    setTimeBonus(0);
    setIsGameActive(true);
    setGameOver(false);
    setGameKey((prev) => prev + 1);
  }, []);

  const handleGameComplete = useCallback(
    (result: { totalScore: number; moves: number; timeBonus: number }) => {
      setScore(result.totalScore);
      setMoves(result.moves);
      setTimeBonus(result.timeBonus);
      setIsGameActive(false);
      setGameOver(true);
    },
    []
  );

  return (
    <div className={styles.container}>
      <Link href="/games" className={styles.backLink}>
        <ChevronLeft size={20} /> Back to Games
      </Link>

      <div className={styles.gameArea}>
        {!isGameActive && !gameOver && (
          <div className={styles.startScreen}>
            <h1 className={styles.title}>Element Sort</h1>
            <p className={styles.subtitle}>
              Sort elements by chemical category into test tubes. Click a tube to select it,
              then click another tube to move matching elements.
            </p>
            <GameTutorial tutorial={gameTutorials.elementSort} accentColor="#8b5cf6" />
            <DifficultySelector
              onSelect={setDifficulty}
              selected={difficulty}
            />
            <div className={styles.modeInfo}>
              {difficultySettings.mode === 'relaxed' ? (
                <span className={styles.relaxedMode}>No time limit - Unlimited undos</span>
              ) : (
                <span className={styles.timedMode}>
                  Time limit: {Math.floor((difficultySettings.timeLimit || 0) / 60)}:{((difficultySettings.timeLimit || 0) % 60).toString().padStart(2, '0')} | Undos: {difficultySettings.undoLimit}
                </span>
              )}
            </div>
            <button className={styles.startBtn} onClick={startGame}>
              Start Game
            </button>
          </div>
        )}

        {isGameActive && (
          <ElementSortGame
            key={gameKey}
            settings={difficultySettings}
            onGameComplete={handleGameComplete}
            resetKey={gameKey}
          />
        )}

        {gameOver && (
          <div className={styles.gameOverScreen}>
            <h2 className={styles.gameOverTitle}>Congratulations!</h2>
            <div className={styles.scoreBreakdown}>
              <p className={styles.finalScore}>Total Score: {score}</p>
              <p className={styles.scoreDetail}>Moves: {moves}</p>
              {timeBonus > 0 && (
                <p className={styles.scoreDetail}>Time Bonus: +{timeBonus}</p>
              )}
            </div>
            <div style={{ margin: '1rem 0', display: 'flex', justifyContent: 'center' }}>
              <ShareGameScore score={score} gameName="Element Sort" />
            </div>
            <button className={styles.startBtn} onClick={startGame}>
              Play Again
            </button>
            <GameRating gameId="element-sort" gameName="Element Sort" />
          </div>
        )}
      </div>
    </div>
  );
}