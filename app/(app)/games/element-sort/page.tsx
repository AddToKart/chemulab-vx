'use client';

import { useState, useCallback, useEffect } from 'react';
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
import { ResumeModal } from '@/components/game/ResumeModal';
import type { Vial, UndoSnapshot } from '@/lib/types/element-sort';

interface SavedSession {
  score: number;
  moves: number;
  timeBonus: number;
  isGameActive: boolean;
  difficulty: DifficultyLevel;
  gameState: {
    vials: Vial[];
    selectedVialId: string | null;
    moves: number;
    undoStack: UndoSnapshot[];
    completedVials: string[];
    isWon: boolean;
    timeLeft: number | undefined;
  };
}

const SESSION_KEY = 'elementSortSession';

export default function ElementSortPage() {
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [timeBonus, setTimeBonus] = useState(0);
  const [isGameActive, setIsGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('beginner');
  const [gameKey, setGameKey] = useState(0);
  
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [savedSession, setSavedSession] = useState<SavedSession | null>(null);
  const [pendingRestoreState, setPendingRestoreState] = useState<{
    vials: Vial[];
    selectedVialId: string | null;
    moves: number;
    undoStack: UndoSnapshot[];
    completedVials: string[];
    isWon: boolean;
    timeLeft: number | undefined;
  } | null>(null);

  const difficultySettings: ElementSortSettings = elementSortDifficulty[difficulty];

  /* ---------- Session restoration on mount ---------- */
  useEffect(() => {
    const storedSession = sessionStorage.getItem(SESSION_KEY);
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession) as SavedSession;
        if (parsed.isGameActive && parsed.gameState) {
          setSavedSession(parsed);
          setShowResumeModal(true);
        }
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  /* ---------- Save session on state change ---------- */
  useEffect(() => {
    if (isGameActive && pendingRestoreState) {
      const session: SavedSession = {
        score,
        moves,
        timeBonus,
        isGameActive,
        difficulty,
        gameState: pendingRestoreState,
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  }, [score, moves, timeBonus, isGameActive, difficulty, pendingRestoreState]);

  /* ---------- Clear session on game over ---------- */
  useEffect(() => {
    if (gameOver) {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [gameOver]);

  /* ---------- Handle game state changes from child ---------- */
  const handleGameStateChange = useCallback((state: {
    vials: Vial[];
    selectedVialId: string | null;
    moves: number;
    undoStack: UndoSnapshot[];
    completedVials: string[];
    isWon: boolean;
    timeLeft: number | undefined;
  }) => {
    setPendingRestoreState(state);
  }, []);

  /* ---------- Handle resume ---------- */
  const handleResume = useCallback(() => {
    if (savedSession) {
      setScore(savedSession.score);
      setMoves(savedSession.moves);
      setTimeBonus(savedSession.timeBonus);
      setDifficulty(savedSession.difficulty);
      setPendingRestoreState(savedSession.gameState);
      setIsGameActive(true);
      setGameOver(false);
      setShowResumeModal(false);
      
      // Increment gameKey to signal child to use restored state
      setGameKey((prev) => prev + 1);
    }
  }, [savedSession]);

  /* ---------- Handle start new ---------- */
  const handleStartNew = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setShowResumeModal(false);
    setSavedSession(null);
    setPendingRestoreState(null);
    startGame();
  }, []);

  /* ---------- Clear session on back navigation ---------- */
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isGameActive && pendingRestoreState) {
        const session: SavedSession = {
          score,
          moves,
          timeBonus,
          isGameActive,
          difficulty,
          gameState: pendingRestoreState,
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [score, moves, timeBonus, isGameActive, difficulty, pendingRestoreState]);

  const startGame = useCallback(() => {
    setScore(0);
    setMoves(0);
    setTimeBonus(0);
    setIsGameActive(true);
    setGameOver(false);
    setPendingRestoreState(null);
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
      {showResumeModal && (
        <ResumeModal
          gameName="Element Sort"
          onResume={handleResume}
          onStartNew={handleStartNew}
          previousScore={savedSession?.score}
          previousProgress={`Moves: ${savedSession?.moves}`}
        />
      )}

      <Link href="/games" className={styles.backLink}>
        <ChevronLeft size={20} /> Leave Game
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
            initialState={pendingRestoreState || undefined}
            onStateChange={handleGameStateChange}
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