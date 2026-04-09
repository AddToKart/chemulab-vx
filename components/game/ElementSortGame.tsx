'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Vial,
  UndoSnapshot,
  ElementSortSettings,
  categoryColors,
  categoryMainSymbol,
} from '@/lib/types/element-sort';
import {
  generateLevel,
  isValidMove,
  executeMove,
  checkWinCondition,
  calculateScore,
} from '@/lib/data/element-sort-data';
import styles from './ElementSortGame.module.css';
import { RotateCcw, Timer, Hash } from 'lucide-react';

interface ElementSortGameProps {
  settings: ElementSortSettings;
  onGameComplete: (result: { totalScore: number; moves: number; timeBonus: number }) => void;
  resetKey: number;
  initialState?: {
    vials: Vial[];
    selectedVialId: string | null;
    moves: number;
    undoStack: UndoSnapshot[];
    completedVials: string[];
    isWon: boolean;
    timeLeft: number | undefined;
  };
  onStateChange?: (state: {
    vials: Vial[];
    selectedVialId: string | null;
    moves: number;
    undoStack: UndoSnapshot[];
    completedVials: string[];
    isWon: boolean;
    timeLeft: number | undefined;
  }) => void;
}

export default function ElementSortGame({
  settings,
  onGameComplete,
  resetKey,
  initialState,
  onStateChange,
}: ElementSortGameProps) {
  const [vials, setVials] = useState<Vial[]>(initialState ? () => initialState.vials : () => generateLevel(settings));
  const [selectedVialId, setSelectedVialId] = useState<string | null>(initialState?.selectedVialId || null);
  const [moves, setMoves] = useState(initialState?.moves || 0);
  const [undoStack, setUndoStack] = useState<UndoSnapshot[]>(initialState?.undoStack || []);
  const [completedVials, setCompletedVials] = useState<Set<string>>(new Set(initialState?.completedVials || []));
  const [isWon, setIsWon] = useState(initialState?.isWon || false);
  const [timeLeft, setTimeLeft] = useState<number | undefined>(initialState?.timeLeft ?? settings.timeLimit);
  const [animatingVial, setAnimatingVial] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const isGameActive = !isWon && (settings.mode !== 'timed' || (timeLeft !== undefined && timeLeft > 0));

  /* ---------- Notify parent of state changes ---------- */
  useEffect(() => {
    if (onStateChange && isGameActive) {
      onStateChange({
        vials,
        selectedVialId,
        moves,
        undoStack,
        completedVials: Array.from(completedVials),
        isWon,
        timeLeft,
      });
    }
  }, [vials, selectedVialId, moves, undoStack, completedVials, isWon, timeLeft, onStateChange, isGameActive]);

  useEffect(() => {
    if (settings.mode === 'timed' && timeLeft !== undefined && timeLeft > 0 && !isWon) {
      timerRef.current = setTimeout(() => {
        setTimeLeft((prev) => {
          if (prev !== undefined && prev <= 1) {
            const score = calculateScore(settings, moves, 0);
            onGameComplete({
              totalScore: score.totalScore,
              moves,
              timeBonus: score.timeBonus,
            });
            return 0;
          }
          return prev !== undefined ? prev - 1 : undefined;
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }
  }, [settings.mode, settings.timeLimit, settings, moves, timeLeft, isWon, onGameComplete]);

  const playSound = useCallback((type: 'select' | 'move' | 'complete' | 'win') => {
    if (typeof window === 'undefined') return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const frequencies: Record<string, number> = {
        select: 440,
        move: 523,
        complete: 659,
        win: 880,
      };

      oscillator.frequency.value = frequencies[type];
      oscillator.type = 'sine';
      gainNode.gain.value = 0.05;

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
    } catch {
      // Audio might be blocked by browser policy
    }
  }, []);

  const handleVialClick = useCallback(
    (vialId: string) => {
      if (isWon) return;

      const clickedVial = vials.find((v) => v.id === vialId);
      if (!clickedVial) return;

      if (selectedVialId === null) {
        if (clickedVial.elements.length > 0) {
          setSelectedVialId(vialId);
          playSound('select');
        }
      } else if (selectedVialId === vialId) {
        setSelectedVialId(null);
      } else {
        const sourceVial = vials.find((v) => v.id === selectedVialId);
        if (!sourceVial) return;

        if (isValidMove(sourceVial, clickedVial)) {
          const snapshot: UndoSnapshot = {
            vials: JSON.parse(JSON.stringify(vials)),
            selectedVialId: null,
            moves,
          };

          setUndoStack((prev) => [...prev, snapshot]);

          const newVials = executeMove(vials, selectedVialId, vialId);

          setVials(newVials);
          setMoves((prev) => prev + 1);
          setSelectedVialId(null);

          setAnimatingVial(vialId);
          playSound('move');
          setTimeout(() => setAnimatingVial(null), 300);

          const newCompletedVials = new Set<string>();
          newVials.forEach((v) => {
            if (v.elements.length === v.capacity && v.elements.every((el) => el === v.elements[0])) {
              newCompletedVials.add(v.id);
            }
          });
          
          newVials.forEach((v) => {
            if (v.elements.length === v.capacity && v.elements.every((el) => el === v.elements[0])) {
              if (!completedVials.has(v.id)) {
                playSound('complete');
              }
            }
          });
          setCompletedVials(newCompletedVials);

          if (checkWinCondition(newVials)) {
            setIsWon(true);
            playSound('win');
            const score = calculateScore(settings, moves + 1, timeLeft);
            onGameComplete({
              totalScore: score.totalScore,
              moves: moves + 1,
              timeBonus: score.timeBonus,
            });
          }
        }
      }
    },
    [vials, selectedVialId, isWon, moves, settings, timeLeft, completedVials, onGameComplete, playSound]
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    if (settings.undoLimit !== null && undoStack.length >= settings.undoLimit) return;

    const lastSnapshot = undoStack[undoStack.length - 1];
    
    setVials(lastSnapshot.vials);
    setSelectedVialId(lastSnapshot.selectedVialId);
    setMoves(lastSnapshot.moves);
    setUndoStack((prev) => prev.slice(0, -1));

    const newCompletedVials = new Set<string>();
    lastSnapshot.vials.forEach((v) => {
      if (v.elements.length === v.capacity && v.elements.every((el) => el === v.elements[0])) {
        newCompletedVials.add(v.id);
      }
    });
    setCompletedVials(newCompletedVials);
    setIsWon(false);
  }, [undoStack, settings.undoLimit]);

  const undoRemaining = settings.undoLimit !== null
    ? settings.undoLimit - undoStack.length
    : null;

  return (
    <div className={styles.gameContainer}>
      <div className={styles.statsBar}>
        <div className={styles.statsGroup}>
          <div className={styles.stat}>
            <span className={styles.statLabel}><Hash size={12} className="inline mr-1" /> Moves</span>
            <span className={styles.statValue}>{moves}</span>
          </div>
          {settings.mode === 'timed' && timeLeft !== undefined && (
            <div className={styles.stat}>
              <span className={styles.statLabel}><Timer size={12} className="inline mr-1" /> Time</span>
              <span className={`${styles.statValue} ${timeLeft <= 30 ? styles.timeWarning : ''}`}>
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}
        </div>
        <button
          className={styles.undoBtn}
          onClick={handleUndo}
          disabled={undoStack.length === 0 || (undoRemaining !== null && undoRemaining <= 0)}
        >
          <RotateCcw size={16} />
          Undo {undoRemaining !== null && `(${undoRemaining})`}
        </button>
      </div>

      <div className={styles.vialsContainer}>
        {vials.map((vial) => (
          <div key={vial.id} className={styles.vialWrapper}>
            <div
              className={`${styles.vial} ${
                selectedVialId === vial.id ? styles.vialSelected : ''
              } ${completedVials.has(vial.id) ? styles.vialCompleted : ''} ${
                animatingVial === vial.id ? styles.vialAnimating : ''
              }`}
              onClick={() => handleVialClick(vial.id)}
            >
              <div className={styles.vialGlass}>
                <div className={styles.vialContent}>
                  {vial.elements.map((element, idx) => (
                    <div
                      key={idx}
                      className={styles.elementBlock}
                      style={{
                        background: `linear-gradient(135deg, ${categoryColors[element].primary}, ${categoryColors[element].secondary})`,
                      }}
                    >
                      <span className={styles.elementSymbol}>
                        {categoryMainSymbol[element]}
                      </span>
                    </div>
                  ))}
                  {Array(Math.max(0, vial.capacity - vial.elements.length))
                    .fill(null)
                    .map((_, idx) => (
                      <div key={`empty-${idx}`} className={styles.emptySlot}></div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.legend}>
        {Object.entries(categoryColors).slice(0, settings.categories).map(([key, colors]) => (
          <div key={key} className={styles.legendItem}>
            <div
              className={styles.legendColor}
              style={{
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
              }}
            ></div>
            <span className={styles.legendLabel}>{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}