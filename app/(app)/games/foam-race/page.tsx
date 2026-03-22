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
import { GameTutorial } from '@/components/game/GameTutorial';
import GameRating from '@/components/game/GameRating';
import { gameTutorials } from '@/lib/data/game-tutorials';

/* ─── Ingredient data ─── */

interface Ingredient {
  id: string;
  name: string;
  emoji: string;
  type: 'reactant' | 'catalyst' | 'stabilizer' | 'dye' | 'filler';
  power?: number;
  speed?: number;
  volume?: number;
  color?: string;
}

const INGREDIENTS: Ingredient[] = [
  { id: 'h2o2_30', name: '30% H₂O₂', emoji: '🧪', power: 30, type: 'reactant' },
  { id: 'h2o2_20', name: '20% H₂O₂', emoji: '🧪', power: 20, type: 'reactant' },
  { id: 'h2o2_10', name: '10% H₂O₂', emoji: '🧪', power: 10, type: 'reactant' },
  { id: 'yeast', name: 'Yeast', emoji: '🍞', speed: 1.5, type: 'catalyst' },
  { id: 'ki', name: 'Potassium Iodide', emoji: '🧂', speed: 3.0, type: 'catalyst' },
  { id: 'soap', name: 'Dish Soap', emoji: '🧼', volume: 2.0, type: 'stabilizer' },
  { id: 'color_r', name: 'Red Dye', emoji: '🔴', color: '#ff4e50', type: 'dye' },
  { id: 'color_b', name: 'Blue Dye', emoji: '🔵', color: '#4facfe', type: 'dye' },
  { id: 'water', name: 'Water', emoji: '🫗', power: 0, speed: 0.5, type: 'filler' },
];

/* ─── Grid item ─── */

interface GridItem extends Ingredient {
  collectedBy: string | null;
}

/* ─── Firestore game document shape ─── */

interface GameData {
  roomCode: string;
  player1: string;
  player1Name: string;
  player2: string | null;
  player2Name: string | null;
  p1Inventory: Ingredient[];
  p2Inventory: Ingredient[];
  grid: GridItem[];
  currentTurn: 1 | 2;
  status: 'waiting' | 'playing' | 'completed';
  p1FoamHeight: number;
  p2FoamHeight: number;
  createdAt: ReturnType<typeof serverTimestamp>;
}

interface WinnerInfo {
  text: string;
  p1Score: number;
  p2Score: number;
}

/* ─── Helpers ─── */

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createInitialGrid(): GridItem[] {
  const pool: Ingredient[] = [
    // 3 h2o2 variants
    INGREDIENTS[0], INGREDIENTS[1], INGREDIENTS[2],
    // 2 catalysts
    INGREDIENTS[3], INGREDIENTS[4],
    // 2 soaps
    INGREDIENTS[5], INGREDIENTS[5],
    // 2 dyes
    INGREDIENTS[6], INGREDIENTS[7],
    // 7 water to fill to 16
    INGREDIENTS[8], INGREDIENTS[8], INGREDIENTS[8], INGREDIENTS[8],
    INGREDIENTS[8], INGREDIENTS[8], INGREDIENTS[8],
  ];
  return shuffle(pool).map((item) => ({ ...item, collectedBy: null }));
}

function calculateScore(inv: Ingredient[]): number {
  let power = 0;
  let speed = 1;
  let volume = 1;
  inv.forEach((i) => {
    if (i.power) power += i.power;
    if (i.speed) speed = Math.max(speed, i.speed);
    if (i.volume) volume *= i.volume;
  });
  return power * speed * volume;
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

/* ─── Component ─── */

type Screen = 'lobby' | 'waiting' | 'game' | 'victory';

export default function FoamRacePage() {
  const { user } = useAuthStore();

  const [screen, setScreen] = useState<Screen>('lobby');
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [winnerInfo, setWinnerInfo] = useState<WinnerInfo | null>(null);
  const [error, setError] = useState('');

  const gameIdRef = useRef<string>(undefined);
  const unsubRef = useRef<(() => void)>(undefined);

  /* ─── Subscribe to game doc ─── */

  const subscribeToGame = useCallback((gameId: string) => {
    if (unsubRef.current) unsubRef.current();

    gameIdRef.current = gameId;
    const unsub = onSnapshot(doc(db, 'foamGames', gameId), (snap) => {
      if (snap.exists()) {
        setGameData(snap.data() as GameData);
      } else {
        // Game was deleted
        setGameData(null);
        setScreen('lobby');
      }
    });
    unsubRef.current = unsub;
  }, []);

  /* ─── React to gameData changes ─── */

  useEffect(() => {
    if (!gameData) return;

    if (gameData.status === 'waiting') {
      setScreen('waiting');
    } else if (gameData.status === 'playing') {
      setScreen('game');
    } else if (gameData.status === 'completed') {
      const p1Score = calculateScore(gameData.p1Inventory);
      const p2Score = calculateScore(gameData.p2Inventory);

      let text: string;
      if (p1Score > p2Score) {
        text = `${gameData.player1Name} wins!`;
      } else if (p2Score > p1Score) {
        text = `${gameData.player2Name} wins!`;
      } else {
        text = "It's a tie!";
      }

      setWinnerInfo({ text, p1Score, p2Score });
      setScreen('victory');
    }
  }, [gameData]);

  /* ─── Cleanup on unmount ─── */

  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  /* ─── Create game ─── */

  const createGame = useCallback(async () => {
    if (!user) return;
    setError('');

    const roomCode = generateRoomCode();
    const displayName = await getUserDisplayName(user.uid);
    const grid = createInitialGrid();

    const newGame: GameData = {
      roomCode,
      player1: user.uid,
      player1Name: displayName,
      player2: null,
      player2Name: null,
      p1Inventory: [],
      p2Inventory: [],
      grid,
      currentTurn: 1,
      status: 'waiting',
      p1FoamHeight: 0,
      p2FoamHeight: 0,
      createdAt: serverTimestamp() as GameData['createdAt'],
    };

    await setDoc(doc(db, 'foamGames', roomCode), newGame);
    setIsHost(true);
    subscribeToGame(roomCode);
  }, [user, subscribeToGame]);

  /* ─── Join game ─── */

  const joinGame = useCallback(async () => {
    if (!user) return;
    setError('');

    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setError('Please enter a room code.');
      return;
    }

    const gameRef = doc(db, 'foamGames', code);
    const snap = await getDoc(gameRef);

    if (!snap.exists()) {
      setError('Game not found.');
      return;
    }

    const data = snap.data() as GameData;

    if (data.status !== 'waiting') {
      setError('Game already started or finished.');
      return;
    }

    if (data.player1 === user.uid) {
      setError('You cannot join your own game.');
      return;
    }

    const displayName = await getUserDisplayName(user.uid);

    await updateDoc(gameRef, {
      player2: user.uid,
      player2Name: displayName,
      status: 'playing',
    });

    setIsHost(false);
    subscribeToGame(code);
  }, [user, joinCode, subscribeToGame]);

  /* ─── Collect ingredient ─── */

  const collectIngredient = useCallback(
    async (index: number) => {
      if (!user || !gameData || !gameIdRef.current) return;
      if (gameData.status !== 'playing') return;

      const item = gameData.grid[index];
      if (item.collectedBy) return;

      // Check if it's this player's turn
      const isP1 = gameData.player1 === user.uid;
      const isP2 = gameData.player2 === user.uid;
      if (!isP1 && !isP2) return;

      const playerNumber = isP1 ? 1 : 2;
      if (gameData.currentTurn !== playerNumber) return;

      // Check if this player already collected 4
      const currentInv = isP1 ? gameData.p1Inventory : gameData.p2Inventory;
      if (currentInv.length >= 4) return;

      // Update grid
      const newGrid = gameData.grid.map((g, i) =>
        i === index ? { ...g, collectedBy: user.uid } : g
      );

      // Update inventory
      const ingredient: Ingredient = {
        id: item.id,
        name: item.name,
        emoji: item.emoji,
        type: item.type,
        ...(item.power !== undefined && { power: item.power }),
        ...(item.speed !== undefined && { speed: item.speed }),
        ...(item.volume !== undefined && { volume: item.volume }),
        ...(item.color !== undefined && { color: item.color }),
      };

      const newInv = [...currentInv, ingredient];

      // Count total collected
      const totalCollected =
        (isP1 ? newInv.length : gameData.p1Inventory.length) +
        (isP2 ? newInv.length : gameData.p2Inventory.length);

      const isCompleted = totalCollected >= 8;
      const nextTurn: 1 | 2 = gameData.currentTurn === 1 ? 2 : 1;

      const updates: Record<string, unknown> = {
        grid: newGrid,
        currentTurn: isCompleted ? gameData.currentTurn : nextTurn,
        ...(isP1 && { p1Inventory: newInv }),
        ...(isP2 && { p2Inventory: newInv }),
      };

      if (isCompleted) {
        const p1Inv = isP1 ? newInv : gameData.p1Inventory;
        const p2Inv = isP2 ? newInv : gameData.p2Inventory;
        const p1Score = calculateScore(p1Inv);
        const p2Score = calculateScore(p2Inv);
        updates.status = 'completed';
        updates.p1FoamHeight = p1Score;
        updates.p2FoamHeight = p2Score;
      }

      await updateDoc(doc(db, 'foamGames', gameIdRef.current), updates);
    },
    [user, gameData]
  );

  /* ─── Leave game ─── */

  const leaveGame = useCallback(async () => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = undefined;
    }
    if (gameIdRef.current) {
      try {
        await deleteDoc(doc(db, 'foamGames', gameIdRef.current));
      } catch {
        // ignore
      }
      gameIdRef.current = undefined;
    }
    setGameData(null);
    setIsHost(false);
    setJoinCode('');
    setWinnerInfo(null);
    setError('');
    setScreen('lobby');
  }, []);

  /* ─── Play again ─── */

  const playAgain = useCallback(() => {
    leaveGame();
  }, [leaveGame]);

  /* ─── Determine whose turn it is ─── */

  const getPlayerNumber = (): 1 | 2 | null => {
    if (!user || !gameData) return null;
    if (gameData.player1 === user.uid) return 1;
    if (gameData.player2 === user.uid) return 2;
    return null;
  };

  const isMyTurn = (): boolean => {
    const pn = getPlayerNumber();
    if (!pn || !gameData) return false;
    return gameData.currentTurn === pn;
  };

  /* ─── Render helpers ─── */

  const renderLobby = () => (
    <div className={styles.screen}>
      <h1 className={styles.title}>Foam Race</h1>
      <p className={styles.subtitle}>
        Elephant Toothpaste Race — collect ingredients and build the tallest foam!
      </p>

      {!user && (
        <p className={styles.errorText}>Please sign in to play.</p>
      )}

      {user && (
        <>
          <GameTutorial tutorial={gameTutorials.foamRace} accentColor="#10b981" className="mb-6" />
          <div className={styles.lobbyOptions}>
            <div className={styles.lobbyCard}>
              <h2>Create Game</h2>
              <p>Start a new room and invite a friend.</p>
              <button className={styles.btnPrimary} onClick={createGame}>
                Create Room
              </button>
            </div>

            <div className={styles.lobbyCard}>
              <h2>Join Game</h2>
              <p>Enter a room code to join an existing game.</p>
              <div className={styles.lobbyInputGroup}>
                <input
                  type="text"
                  placeholder="ROOM CODE"
                  maxLength={5}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className={styles.codeInput}
                />
                <button className={styles.btnPrimary} onClick={joinGame}>
                  Join Room
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );

  const renderWaiting = () => (
    <div className={styles.screen}>
      <h1 className={styles.title}>Waiting for Opponent...</h1>
      <p className={styles.subtitle}>Share this room code with a friend:</p>
      <GameTutorial tutorial={gameTutorials.foamRace} accentColor="#10b981" className="mb-6" />
      <div className={styles.roomCodeDisplay}>{gameData?.roomCode}</div>
      <p className={styles.subtitle}>Waiting for Player 2 to join...</p>
      <button className={styles.btnOutline} onClick={leaveGame}>
        Leave Room
      </button>
    </div>
  );

  const renderGame = () => {
    if (!gameData) return null;
    const pn = getPlayerNumber();

    return (
      <div className={styles.screen}>
        {/* Player status */}
        <div className={styles.playerStatus}>
          <div
            className={`${styles.playerCard} ${styles.p1} ${
              gameData.currentTurn === 1 ? styles.active : ''
            }`}
          >
            <div className={styles.playerName}>{gameData.player1Name}</div>
            <div className={styles.inventory}>
              {gameData.p1Inventory.map((item, i) => (
                <span key={i}>{item.emoji}</span>
              ))}
            </div>
          </div>
          <div
            className={`${styles.playerCard} ${styles.p2} ${
              gameData.currentTurn === 2 ? styles.active : ''
            }`}
          >
            <div className={styles.playerName}>{gameData.player2Name}</div>
            <div className={styles.inventory}>
              {gameData.p2Inventory.map((item, i) => (
                <span key={i}>{item.emoji}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Turn indicator */}
        <div className={styles.turnIndicator}>
          {isMyTurn() ? 'Your turn! Pick an ingredient.' : "Opponent's turn..."}
        </div>

        {/* Flask visualization */}
        <div className={styles.flaskContainer}>
          <div className={styles.flaskWrapper}>
            <div className={styles.playerLabel}>{gameData.player1Name}</div>
            <div className={styles.flask}>
              <div
                className={`${styles.foam} ${styles.p1Foam}`}
                style={{
                  height: `${Math.min(
                    calculateScore(gameData.p1Inventory),
                    180
                  )}px`,
                }}
              />
            </div>
          </div>
          <div className={styles.flaskWrapper}>
            <div className={styles.playerLabel}>{gameData.player2Name}</div>
            <div className={styles.flask}>
              <div
                className={`${styles.foam} ${styles.p2Foam}`}
                style={{
                  height: `${Math.min(
                    calculateScore(gameData.p2Inventory),
                    180
                  )}px`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Ingredient grid */}
        <div className={styles.ingredientGrid}>
          {gameData.grid.map((item, index) => {
            const isCollected = item.collectedBy !== null;
            const isP1Selected = item.collectedBy === gameData.player1;
            const isP2Selected = item.collectedBy === gameData.player2;

            let cardClass = styles.ingredientCard;
            if (isCollected) cardClass += ` ${styles.disabled}`;
            if (isP1Selected) cardClass += ` ${styles.p1Selected}`;
            if (isP2Selected) cardClass += ` ${styles.p2Selected}`;

            return (
              <button
                key={index}
                className={cardClass}
                disabled={isCollected || !isMyTurn() || (pn !== null && (pn === 1 ? gameData.p1Inventory : gameData.p2Inventory).length >= 4)}
                onClick={() => collectIngredient(index)}
              >
                <div className={styles.ingredientEmoji}>{item.emoji}</div>
                <div className={styles.ingredientName}>{item.name}</div>
              </button>
            );
          })}
        </div>

        <button className={styles.btnOutline} onClick={leaveGame}>
          Leave Game
        </button>
      </div>
    );
  };

  const renderVictory = () => {
    if (!winnerInfo || !gameData) return null;

    const myScore = getPlayerNumber() === 1 ? winnerInfo.p1Score : winnerInfo.p2Score;

    return (
      <div className={styles.screen}>
        <h1 className={styles.victoryTitle}>{winnerInfo.text}</h1>

        <div className={styles.scoreDetails}>
          <div className={styles.scoreCard}>
            <h3>{gameData.player1Name}</h3>
            <p className={styles.scoreValue}>{winnerInfo.p1Score} cm</p>
            <p className={styles.scoreLabel}>Foam Height</p>
          </div>
          <div className={styles.scoreCard}>
            <h3>{gameData.player2Name}</h3>
            <p className={styles.scoreValue}>{winnerInfo.p2Score} cm</p>
            <p className={styles.scoreLabel}>Foam Height</p>
          </div>
        </div>

        {/* Victory flask visualization */}
        <div className={styles.flaskContainer}>
          <div className={styles.flaskWrapper}>
            <div className={styles.playerLabel}>{gameData.player1Name}</div>
            <div className={styles.flask}>
              <div
                className={`${styles.foam} ${styles.p1Foam}`}
                style={{
                  height: `${Math.min(winnerInfo.p1Score, 180)}px`,
                }}
              />
            </div>
          </div>
          <div className={styles.flaskWrapper}>
            <div className={styles.playerLabel}>{gameData.player2Name}</div>
            <div className={styles.flask}>
              <div
                className={`${styles.foam} ${styles.p2Foam}`}
                style={{
                  height: `${Math.min(winnerInfo.p2Score, 180)}px`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 mt-8">
            <ShareGameScore 
                customMessage={`I built a ${myScore}cm foam tower in Foam Race! 🐘`}
                gameName="Foam Race" 
            />
            <button className={styles.btnPrimary} onClick={playAgain}>
            Play Again
            </button>
            <div className="w-full">
              <GameRating gameId="foam-race" gameName="Elephant Toothpaste" />
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <Link href="/games" className={styles.backLink}>
        &larr; Back to Games
      </Link>

      <div className={styles.gameArea}>
        {screen === 'lobby' && renderLobby()}
        {screen === 'waiting' && renderWaiting()}
        {screen === 'game' && renderGame()}
        {screen === 'victory' && renderVictory()}
      </div>
    </div>
  );
}
