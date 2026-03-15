'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase/config';
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  deleteDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useAuthStore } from '@/store/auth-store';
import styles from './page.module.css';

import { ShareGameScore } from '@/components/game/ShareGameScore';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

interface Ingredient {
  id: string;
  name: string;
  emoji: string;
  gas?: number;
  speed?: number;
  type: 'base' | 'acid' | 'filler';
}

const INGREDIENTS: Ingredient[] = [
  { id: 'soda_high', name: 'High-Grade Soda', emoji: '🧂', gas: 30, type: 'base' },
  { id: 'soda_std', name: 'Standard Soda', emoji: '🍚', gas: 15, type: 'base' },
  { id: 'vinegar_20', name: '20% Vinegar', emoji: '🧴', speed: 3.0, type: 'acid' },
  { id: 'vinegar_5', name: '5% Vinegar', emoji: '🫗', speed: 1.0, type: 'acid' },
  { id: 'lemon', name: 'Lemon Juice', emoji: '🍋', speed: 1.5, type: 'acid' },
  { id: 'water', name: 'Water', emoji: '💧', gas: 0, speed: 0.1, type: 'filler' },
];

interface GridCard {
  ingredientId: string;
  selectedBy: number | null; // 1 or 2
}

interface GameData {
  id: string;
  player1: string;
  player2: string | null;
  p1Name: string;
  p2Name: string;
  p1Inv: Ingredient[];
  p2Inv: Ingredient[];
  grid: GridCard[];
  currentTurn: number; // 1 or 2
  status: 'waiting' | 'playing' | 'completed';
  winner: number | null; // 1, 2, or 0 for tie
  p1Score: number;
  p2Score: number;
  createdAt: ReturnType<typeof serverTimestamp> | null;
}

type Screen = 'lobby' | 'waiting' | 'game' | 'victory';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function createInitialGrid(): GridCard[] {
  // 2 soda_high, 2 soda_std, 2 vinegar_20, 2 vinegar_5, 2 lemon, 6 water = 16
  const ids = [
    'soda_high', 'soda_high',
    'soda_std', 'soda_std',
    'vinegar_20', 'vinegar_20',
    'vinegar_5', 'vinegar_5',
    'lemon', 'lemon',
    'water', 'water', 'water', 'water', 'water', 'water',
  ];
  // Shuffle
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.map((id) => ({ ingredientId: id, selectedBy: null }));
}

function getIngredient(id: string): Ingredient {
  return INGREDIENTS.find((i) => i.id === id)!;
}

function calculateScore(inv: Ingredient[]): number {
  let gasTotal = 0;
  let speedMult = 1;
  inv.forEach((i) => {
    if (i.gas) gasTotal += i.gas;
    if (i.speed) speedMult *= i.speed;
  });
  return Math.round(gasTotal * speedMult * 100) / 100;
}

async function getUserDisplayName(uid: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const data = snap.data();
      return data.username || data.displayName || 'Player';
    }
  } catch {
    // ignore
  }
  return 'Player';
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function BalloonRacePage() {
  const { user } = useAuthStore();

  const [screen, setScreen] = useState<Screen>('lobby');
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [winnerText, setWinnerText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const gameIdRef = useRef<string>(undefined);
  const unsubRef = useRef<(() => void) | undefined>(undefined);

  /* ---------- derived ---------- */
  const myPlayerNum =
    gameData && user
      ? gameData.player1 === user.uid
        ? 1
        : gameData.player2 === user.uid
          ? 2
          : null
      : null;

  const isMyTurn = gameData?.currentTurn === myPlayerNum;

  const p1Score = gameData ? calculateScore(gameData.p1Inv) : 0;
  const p2Score = gameData ? calculateScore(gameData.p2Inv) : 0;

  const p1BalloonScale = 1 + p1Score / 100;
  const p2BalloonScale = 1 + p2Score / 100;

  /* ---------- cleanup ---------- */
  const cleanup = useCallback(() => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = undefined;
    }
    gameIdRef.current = undefined;
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  /* ---------- Firestore listener ---------- */
  const listenToGame = useCallback(
    (gameId: string) => {
      cleanup();
      gameIdRef.current = gameId;

      const unsub = onSnapshot(doc(db, 'balloonGames', gameId), (snap) => {
        if (!snap.exists()) {
          // Game was deleted
          setGameData(null);
          setScreen('lobby');
          setError('Game was cancelled.');
          cleanup();
          return;
        }

        const data = snap.data() as Omit<GameData, 'id'>;
        const gd: GameData = { ...data, id: gameId };
        setGameData(gd);

        if (gd.status === 'waiting') {
          setScreen('waiting');
        } else if (gd.status === 'playing') {
          setScreen('game');
        } else if (gd.status === 'completed') {
          // Determine winner text
          if (gd.winner === 0) {
            setWinnerText("It's a Tie!");
          } else if (gd.winner === 1) {
            setWinnerText(`${gd.p1Name} Wins!`);
          } else {
            setWinnerText(`${gd.p2Name} Wins!`);
          }
          setScreen('victory');
        }
      });

      unsubRef.current = unsub;
    },
    [cleanup],
  );

  /* ---------- Create Game ---------- */
  const handleCreate = async () => {
    if (!user) {
      setError('You must be logged in to create a game.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const code = generateRoomCode();
      const displayName = await getUserDisplayName(user.uid);
      const grid = createInitialGrid();

      const gameDoc: Omit<GameData, 'id'> = {
        player1: user.uid,
        player2: null,
        p1Name: displayName,
        p2Name: '',
        p1Inv: [],
        p2Inv: [],
        grid,
        currentTurn: 1,
        status: 'waiting',
        winner: null,
        p1Score: 0,
        p2Score: 0,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'balloonGames', code), gameDoc);
      listenToGame(code);
    } catch (err) {
      setError('Failed to create game. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Join Game ---------- */
  const handleJoin = async () => {
    if (!user) {
      setError('You must be logged in to join a game.');
      return;
    }
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setError('Please enter a room code.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const snap = await getDoc(doc(db, 'balloonGames', code));
      if (!snap.exists()) {
        setError('Game not found. Check the room code.');
        setLoading(false);
        return;
      }

      const data = snap.data() as Omit<GameData, 'id'>;
      if (data.status !== 'waiting') {
        setError('This game has already started or ended.');
        setLoading(false);
        return;
      }

      if (data.player1 === user.uid) {
        setError('You cannot join your own game.');
        setLoading(false);
        return;
      }

      const displayName = await getUserDisplayName(user.uid);

      await updateDoc(doc(db, 'balloonGames', code), {
        player2: user.uid,
        p2Name: displayName,
        status: 'playing',
      });

      listenToGame(code);
    } catch (err) {
      setError('Failed to join game. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Pick Ingredient ---------- */
  const handlePick = async (index: number) => {
    if (!gameData || !user || !myPlayerNum || !isMyTurn) return;

    const card = gameData.grid[index];
    if (card.selectedBy !== null) return;

    const ingredient = getIngredient(card.ingredientId);
    const newGrid = [...gameData.grid];
    newGrid[index] = { ...card, selectedBy: myPlayerNum };

    const newP1Inv = [...gameData.p1Inv];
    const newP2Inv = [...gameData.p2Inv];

    if (myPlayerNum === 1) {
      newP1Inv.push(ingredient);
    } else {
      newP2Inv.push(ingredient);
    }

    const totalPicked = newGrid.filter((c) => c.selectedBy !== null).length;

    const updates: Record<string, unknown> = {
      grid: newGrid,
      p1Inv: newP1Inv,
      p2Inv: newP2Inv,
      currentTurn: myPlayerNum === 1 ? 2 : 1,
    };

    // 6 total picks (3 per player) → game over
    if (totalPicked >= 6) {
      const s1 = calculateScore(newP1Inv);
      const s2 = calculateScore(newP2Inv);
      updates.status = 'completed';
      updates.p1Score = s1;
      updates.p2Score = s2;
      if (s1 > s2) {
        updates.winner = 1;
      } else if (s2 > s1) {
        updates.winner = 2;
      } else {
        updates.winner = 0;
      }
    }

    try {
      await updateDoc(doc(db, 'balloonGames', gameData.id), updates);
    } catch (err) {
      console.error('Failed to pick ingredient:', err);
    }
  };

  /* ---------- Leave / Cancel ---------- */
  const handleLeave = async () => {
    if (!gameData) return;
    try {
      await deleteDoc(doc(db, 'balloonGames', gameData.id));
    } catch {
      // ignore
    }
    cleanup();
    setGameData(null);
    setScreen('lobby');
  };

  /* ---------- Play Again ---------- */
  const handlePlayAgain = () => {
    cleanup();
    setGameData(null);
    setWinnerText('');
    setError('');
    setJoinCode('');
    setScreen('lobby');
  };

  /* ================================================================== */
  /*  Render                                                             */
  /* ================================================================== */

  return (
    <div>
      <Link href="/games" className={styles.backLink}>
        &larr; Back to Games
      </Link>

      <div className={styles.gameArea}>
        <h1 className={styles.title}>Balloon Race</h1>
        <p className={styles.subtitle}>Pick ingredients to inflate your balloon the most!</p>

        {error && <p className={styles.errorMsg}>{error}</p>}

        {/* ---- LOBBY ---- */}
        {screen === 'lobby' && (
          <div className={styles.gameScreen}>
            <div className={styles.lobbyOptions}>
              {/* Create */}
              <div className={styles.lobbyCard}>
                <span className={styles.lobbyCardEmoji}>🎈</span>
                <h3 className={styles.lobbyCardTitle}>Create Room</h3>
                <p className={styles.lobbyCardDesc}>
                  Start a new game and invite a friend with the room code.
                </p>
                <button
                  className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}
                  onClick={handleCreate}
                  disabled={loading}
                >
                  {loading && <span className={styles.spinner} />}
                  Create Game
                </button>
              </div>

              {/* Join */}
              <div className={styles.lobbyCard}>
                <span className={styles.lobbyCardEmoji}>🔗</span>
                <h3 className={styles.lobbyCardTitle}>Join Room</h3>
                <p className={styles.lobbyCardDesc}>
                  Enter a room code to join an existing game.
                </p>
                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    className={styles.codeInput}
                    placeholder="ENTER CODE"
                    maxLength={5}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleJoin();
                    }}
                  />
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={handleJoin}
                    disabled={loading}
                  >
                    {loading && <span className={styles.spinner} />}
                    Join Game
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---- WAITING ---- */}
        {screen === 'waiting' && gameData && (
          <div className={`${styles.gameScreen} ${styles.waitingScreen}`}>
            <h2 className={styles.waitingTitle}>Waiting for opponent&hellip;</h2>
            <div className={styles.roomCodeTag}>{gameData.id}</div>
            <p className={styles.waitingDots}>
              Share this code with a friend <span>.</span><span>.</span><span>.</span>
            </p>
            <button
              className={`${styles.btn} ${styles.btnDanger}`}
              onClick={handleLeave}
            >
              Cancel Game
            </button>
          </div>
        )}

        {/* ---- GAME ---- */}
        {screen === 'game' && gameData && (
          <div className={styles.gameScreen}>
            {/* Turn indicator */}
            <div
              className={`${styles.turnIndicator} ${
                gameData.currentTurn === 1 ? styles.turnP1 : styles.turnP2
              }`}
            >
              {isMyTurn
                ? 'Your Turn — Pick an ingredient!'
                : `${gameData.currentTurn === 1 ? gameData.p1Name : gameData.p2Name}'s Turn`}
            </div>

            {/* Player names */}
            <div className={styles.playerNames}>
              <span className={styles.p1Name}>
                {gameData.p1Name} {myPlayerNum === 1 && '(You)'}
              </span>
              <span className={styles.p2Name}>
                {gameData.p2Name} {myPlayerNum === 2 && '(You)'}
              </span>
            </div>

            {/* Flask visualization */}
            <div className={styles.flaskViz}>
              {/* Player 1 flask */}
              <div className={styles.flaskWrapper}>
                <span className={styles.flaskLabel}>{gameData.p1Name}</span>
                <div className={styles.flaskContainer}>
                  <div
                    className={styles.balloon}
                    style={{
                      transform: `translateX(-50%) scale(${p1BalloonScale})`,
                    }}
                  />
                  <div className={styles.flask} />
                </div>
                <span className={`${styles.flaskScore} ${styles.flaskScoreP1}`}>
                  {p1Score.toFixed(1)}
                </span>
              </div>

              {/* Player 2 flask */}
              <div className={styles.flaskWrapper}>
                <span className={styles.flaskLabel}>{gameData.p2Name}</span>
                <div className={styles.flaskContainer}>
                  <div
                    className={`${styles.balloon} ${styles.balloonP2}`}
                    style={{
                      transform: `translateX(-50%) scale(${p2BalloonScale})`,
                    }}
                  />
                  <div className={styles.flask} />
                </div>
                <span className={`${styles.flaskScore} ${styles.flaskScoreP2}`}>
                  {p2Score.toFixed(1)}
                </span>
              </div>
            </div>

            {/* Ingredient grid */}
            <div className={styles.gridSection}>
              <p className={styles.gridTitle}>
                Pick an ingredient ({3 - (myPlayerNum === 1 ? gameData.p1Inv.length : gameData.p2Inv.length)} remaining)
              </p>
              <div className={styles.ingredientGrid}>
                {gameData.grid.map((card, idx) => {
                  const ing = getIngredient(card.ingredientId);
                  const isSelected = card.selectedBy !== null;
                  const selClass =
                    card.selectedBy === 1
                      ? styles.p1Sel
                      : card.selectedBy === 2
                        ? styles.p2Sel
                        : '';
                  const disabledClass = isSelected || !isMyTurn ? styles.disabled : '';

                  return (
                    <div
                      key={idx}
                      className={`${styles.ingredientCard} ${selClass} ${disabledClass}`}
                      onClick={() => {
                        if (!isSelected && isMyTurn) handlePick(idx);
                      }}
                    >
                      <span className={styles.ingredientEmoji}>{ing.emoji}</span>
                      <span className={styles.ingredientName}>{ing.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inventories */}
            <div className={styles.inventories}>
              <div className={`${styles.inventory} ${styles.inventoryP1}`}>
                <p className={styles.inventoryTitle} style={{ color: '#ef4444' }}>
                  {gameData.p1Name}&apos;s Picks
                </p>
                <p className={styles.inventoryItems}>
                  {gameData.p1Inv.length > 0
                    ? gameData.p1Inv.map((i) => `${i.emoji} ${i.name}`).join(', ')
                    : 'None yet'}
                </p>
              </div>
              <div className={`${styles.inventory} ${styles.inventoryP2}`}>
                <p className={styles.inventoryTitle} style={{ color: '#3b82f6' }}>
                  {gameData.p2Name}&apos;s Picks
                </p>
                <p className={styles.inventoryItems}>
                  {gameData.p2Inv.length > 0
                    ? gameData.p2Inv.map((i) => `${i.emoji} ${i.name}`).join(', ')
                    : 'None yet'}
                </p>
              </div>
            </div>

            {/* Leave */}
            <div className={styles.leaveArea}>
              <button
                className={`${styles.btn} ${styles.btnDanger}`}
                onClick={handleLeave}
              >
                Leave Game
              </button>
            </div>
          </div>
        )}

        {/* ---- VICTORY ---- */}
        {screen === 'victory' && gameData && (
          <div className={`${styles.gameScreen} ${styles.victoryScreen}`}>
            <span className={styles.victoryEmoji}>
              {gameData.winner === 0 ? '🤝' : '🏆'}
            </span>
            <h2 className={styles.victoryTitle}>{winnerText}</h2>
            <p className={styles.victorySubtext}>
              {gameData.winner === 0
                ? 'Both balloons inflated equally!'
                : 'The bigger balloon wins the race!'}
            </p>

            <div className={styles.scoresRow}>
              <div className={`${styles.scoreCard} ${styles.scoreCardP1}`}>
                <p className={styles.scoreCardLabel}>{gameData.p1Name}</p>
                <p className={`${styles.scoreCardValue} ${styles.scoreCardValueP1}`}>
                  {gameData.p1Score.toFixed(1)}
                </p>
              </div>
              <div className={`${styles.scoreCard} ${styles.scoreCardP2}`}>
                <p className={styles.scoreCardLabel}>{gameData.p2Name}</p>
                <p className={`${styles.scoreCardValue} ${styles.scoreCardValueP2}`}>
                  {gameData.p2Score.toFixed(1)}
                </p>
              </div>
            </div>

            <div className={styles.victoryActions}>
              <div style={{ marginBottom: '1rem' }}>
                <ShareGameScore 
                  customMessage={`I inflated my balloon to a score of ${myPlayerNum === 1 ? gameData.p1Score : gameData.p2Score} in Balloon Race! 🎈`} 
                  gameName="Balloon Race" 
                />
              </div>
              <button
                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}
                onClick={handlePlayAgain}
              >
                Play Again
              </button>
              <Link href="/games" className={`${styles.btn} ${styles.btnOutline}`}>
                Back to Games
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
