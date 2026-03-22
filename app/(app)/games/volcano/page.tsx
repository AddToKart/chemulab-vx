'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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

// --------------- Types ---------------

interface Ingredient {
  id: string;
  name: string;
  emoji: string;
}

interface GridItem {
  id: string;
  name: string;
  emoji: string;
  collected: boolean;
  collectedBy: string | null;
}

interface SharedInventory {
  soda: number;
  vinegar: number;
  soap: number;
  color: number;
}

interface GameData {
  roomCode: string;
  status: 'waiting' | 'playing' | 'completed';
  player1: { uid: string; name: string };
  player2: { uid: string; name: string } | null;
  grid: GridItem[];
  sharedInventory: SharedInventory;
  currentTurn: 'player1' | 'player2';
  createdAt: ReturnType<typeof serverTimestamp>;
}

// --------------- Constants ---------------

const INGREDIENTS: Ingredient[] = [
  { id: 'soda', name: 'Baking Soda', emoji: '🧂' },
  { id: 'vinegar', name: 'Vinegar', emoji: '🫗' },
  { id: 'soap', name: 'Dish Soap', emoji: '🧴' },
  { id: 'color', name: 'Food Color', emoji: '🔴' },
];

// --------------- Utilities ---------------

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function createInitialGrid(): GridItem[] {
  const allIngredients: GridItem[] = INGREDIENTS.map((ing) => ({
    ...ing,
    collected: false,
    collectedBy: null,
  }));
  return shuffleArray(allIngredients);
}

async function getUserDisplayName(uid: string): Promise<string> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return data.username || data.displayName || 'Player';
    }
    return 'Player';
  } catch {
    return 'Player';
  }
}

// --------------- Component ---------------

export default function VolcanoPage() {
  const { user } = useAuthStore();

  // Screen state
  const [activeScreen, setActiveScreen] = useState<'lobby' | 'waiting' | 'game'>('lobby');

  // Game data from Firestore
  const [currentGame, setCurrentGame] = useState<GameData | null>(null);

  // Host flag
  const [isHost, setIsHost] = useState(false);

  // Room code input
  const [roomCodeInput, setRoomCodeInput] = useState('');

  // Animation states
  const [shaking, setShaking] = useState(false);
  const [erupting, setErupting] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);

  // UI states
  const [errorMessage, setErrorMessage] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');
  const [dropZoneActive, setDropZoneActive] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  // Refs
  const unsubscribeRef = useRef<(() => void) | undefined>(undefined);
  const currentRoomCodeRef = useRef<string | undefined>(undefined);
  const eruptionTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const hasTriggeredEruption = useRef(false);

  // --------------- Firestore helpers ---------------

  const subscribeToGame = useCallback(
    (roomCode: string) => {
      // Unsubscribe from previous listener
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }

      const gameRef = doc(db, 'volcanoGames', roomCode);
      const unsub = onSnapshot(gameRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as GameData;
          setCurrentGame(data);

          // Transition screens based on status
          if (data.status === 'waiting') {
            setActiveScreen('waiting');
          } else if (data.status === 'playing' || data.status === 'completed') {
            setActiveScreen('game');
          }
        } else {
          // Game was deleted (host left)
          setCurrentGame(null);
          setActiveScreen('lobby');
          setIsHost(false);
          currentRoomCodeRef.current = undefined;
          hasTriggeredEruption.current = false;
        }
      });

      unsubscribeRef.current = unsub;
    },
    []
  );

  const createGame = useCallback(async () => {
    if (!user) return;

    const roomCode = generateRoomCode();
    const playerName = await getUserDisplayName(user.uid);
    const grid = createInitialGrid();

    const gameData: GameData = {
      roomCode,
      status: 'waiting',
      player1: { uid: user.uid, name: playerName },
      player2: null,
      grid,
      sharedInventory: { soda: 0, vinegar: 0, soap: 0, color: 0 },
      currentTurn: 'player1',
      createdAt: serverTimestamp() as ReturnType<typeof serverTimestamp>,
    };

    await setDoc(doc(db, 'volcanoGames', roomCode), gameData);
    currentRoomCodeRef.current = roomCode;
    setIsHost(true);
    hasTriggeredEruption.current = false;
    subscribeToGame(roomCode);
  }, [user, subscribeToGame]);

  const joinGame = useCallback(async () => {
    if (!user) return;

    const code = roomCodeInput.trim().toUpperCase();
    if (!code) {
      setErrorMessage('Please enter a room code');
      return;
    }

    try {
      const gameRef = doc(db, 'volcanoGames', code);
      const gameSnap = await getDoc(gameRef);

      if (!gameSnap.exists()) {
        setErrorMessage('Room not found');
        return;
      }

      const gameData = gameSnap.data() as GameData;

      if (gameData.status !== 'waiting') {
        setErrorMessage('Game already in progress');
        return;
      }

      if (gameData.player1.uid === user.uid) {
        setErrorMessage('You cannot join your own game');
        return;
      }

      const playerName = await getUserDisplayName(user.uid);

      await updateDoc(gameRef, {
        player2: { uid: user.uid, name: playerName },
        status: 'playing',
      });

      currentRoomCodeRef.current = code;
      setIsHost(false);
      setErrorMessage('');
      hasTriggeredEruption.current = false;
      subscribeToGame(code);
    } catch {
      setErrorMessage('Failed to join game');
    }
  }, [user, roomCodeInput, subscribeToGame]);

  const collectIngredient = useCallback(
    async (index: number) => {
      if (!currentGame || !user || !currentRoomCodeRef.current) return;
      if (currentGame.status !== 'playing') return;

      // Check turn
      const isPlayer1 = currentGame.player1.uid === user.uid;
      const isPlayer2 = currentGame.player2?.uid === user.uid;
      const myRole = isPlayer1 ? 'player1' : isPlayer2 ? 'player2' : null;
      if (!myRole || currentGame.currentTurn !== myRole) return;

      const item = currentGame.grid[index];
      if (!item || item.collected) return;

      // Update grid
      const newGrid = [...currentGame.grid];
      newGrid[index] = {
        ...newGrid[index],
        collected: true,
        collectedBy: myRole,
      };

      // Update shared inventory
      const newInventory = { ...currentGame.sharedInventory };
      const ingredientKey = item.id as keyof SharedInventory;
      newInventory[ingredientKey] = (newInventory[ingredientKey] || 0) + 1;

      // Count total collected
      const total = Object.values(newInventory).reduce((sum, v) => sum + v, 0);

      // Determine next turn
      const nextTurn = myRole === 'player1' ? 'player2' : 'player1';

      // Check if complete
      const newStatus = total >= 4 ? 'completed' : 'playing';

      const gameRef = doc(db, 'volcanoGames', currentRoomCodeRef.current);
      await updateDoc(gameRef, {
        grid: newGrid,
        sharedInventory: newInventory,
        currentTurn: nextTurn,
        status: newStatus,
      });
    },
    [currentGame, user]
  );

  const leaveGame = useCallback(async () => {
    // Cleanup eruption timeout
    if (eruptionTimeoutRef.current) {
      clearTimeout(eruptionTimeoutRef.current);
      eruptionTimeoutRef.current = undefined;
    }

    // Unsubscribe
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = undefined;
    }

    // Delete game doc if host
    if (currentRoomCodeRef.current) {
      try {
        await deleteDoc(doc(db, 'volcanoGames', currentRoomCodeRef.current));
      } catch {
        // Ignore errors on delete
      }
    }

    currentRoomCodeRef.current = undefined;
    setCurrentGame(null);
    setActiveScreen('lobby');
    setIsHost(false);
    setShaking(false);
    setErupting(false);
    setShowGameOver(false);
    setErrorMessage('');
    hasTriggeredEruption.current = false;
  }, []);

  const cancelWaiting = useCallback(async () => {
    await leaveGame();
  }, [leaveGame]);

  const copyRoomCode = useCallback(() => {
    if (!currentGame) return;
    navigator.clipboard.writeText(currentGame.roomCode).then(() => {
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(''), 2000);
    });
  }, [currentGame]);

  // --------------- Eruption effect ---------------

  useEffect(() => {
    if (currentGame?.status === 'completed' && !hasTriggeredEruption.current) {
      hasTriggeredEruption.current = true;
      setShaking(true);
      setErupting(true);

      eruptionTimeoutRef.current = setTimeout(() => {
        setShaking(false);
        setShowGameOver(true);
      }, 4000);
    }
  }, [currentGame?.status]);

  // --------------- Cleanup on unmount ---------------

  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (eruptionTimeoutRef.current) {
        clearTimeout(eruptionTimeoutRef.current);
      }
    };
  }, []);

  // --------------- Drag and drop handlers ---------------

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      e.dataTransfer.setData('text/plain', index.toString());
      setDraggingIndex(index);
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDropZoneActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropZoneActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDropZoneActive(false);
      setDraggingIndex(null);
      const indexStr = e.dataTransfer.getData('text/plain');
      const index = parseInt(indexStr, 10);
      if (!isNaN(index)) {
        collectIngredient(index);
      }
    },
    [collectIngredient]
  );

  // --------------- Derived state ---------------

  const isMyTurn = (() => {
    if (!currentGame || !user) return false;
    if (currentGame.status !== 'playing') return false;
    const isPlayer1 = currentGame.player1.uid === user.uid;
    const isPlayer2 = currentGame.player2?.uid === user.uid;
    if (isPlayer1 && currentGame.currentTurn === 'player1') return true;
    if (isPlayer2 && currentGame.currentTurn === 'player2') return true;
    return false;
  })();

  const myRole = (() => {
    if (!currentGame || !user) return null;
    if (currentGame.player1.uid === user.uid) return 'player1';
    if (currentGame.player2?.uid === user.uid) return 'player2';
    return null;
  })();

  const totalCollected = currentGame
    ? Object.values(currentGame.sharedInventory).reduce((sum, v) => sum + v, 0)
    : 0;

  const progressPercent = (totalCollected / 4) * 100;

  // --------------- Render helpers ---------------

  const getPlayerPanelClasses = (role: 'player1' | 'player2') => {
    const classes = [styles.playerPanel];
    if (role === 'player1') classes.push(styles.playerPanelP1);
    if (role === 'player2') classes.push(styles.playerPanelP2);
    if (myRole === role) classes.push(styles.playerPanelYou);
    if (currentGame?.currentTurn === role && currentGame.status === 'playing') {
      classes.push(styles.playerPanelActive);
    }
    return classes.join(' ');
  };

  const getCardClasses = (item: GridItem, index: number) => {
    const classes = [styles.ingredientCard];
    if (item.collected) {
      classes.push(styles.collected);
      if (item.collectedBy === 'player1') classes.push(styles.p1Collected);
      if (item.collectedBy === 'player2') classes.push(styles.p2Collected);
    } else if (isMyTurn) {
      classes.push(styles.ingredientCardDraggable);
    }
    if (draggingIndex === index) classes.push(styles.ingredientCardDragging);
    return classes.join(' ');
  };

  // --------------- Render ---------------

  if (!user) {
    return (
      <div className={styles.container}>
        <Link href="/games" className={styles.backLink}>
          &larr; Back to Games
        </Link>
        <div className={styles.gameArea}>
          <h1 className={styles.title}>🌋 Volcano Experiment</h1>
          <p className={styles.subtitle}>Please sign in to play.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Link href="/games" className={styles.backLink}>
        &larr; Back to Games
      </Link>

      <div
        className={`${styles.gameArea} ${shaking ? styles.shake : ''}`}
      >
        {/* ======================== Lobby Screen ======================== */}
        {activeScreen === 'lobby' && (
          <div className={styles.screen}>
            <h1 className={styles.title}>🌋 Volcano Experiment</h1>
            <p className={styles.subtitle}>
              A cooperative multiplayer chemistry game! Collect all ingredients to make the volcano erupt!
            </p>
            <GameTutorial tutorial={gameTutorials.volcano} accentColor="#ef4444" className="mb-6" />

            <div className={styles.lobbyOptions}>
              {/* Create Room */}
              <div className={styles.lobbyCard}>
                <div className={styles.lobbyCardIcon}>🏠</div>
                <div className={styles.lobbyCardTitle}>Create Room</div>
                <p className={styles.lobbyCardDesc}>
                  Start a new game and invite a friend
                </p>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={createGame}
                >
                  Create Room
                </button>
              </div>

              {/* Join Room */}
              <div className={styles.lobbyCard}>
                <div className={styles.lobbyCardIcon}>🔗</div>
                <div className={styles.lobbyCardTitle}>Join Room</div>
                <p className={styles.lobbyCardDesc}>
                  Enter a room code to join a game
                </p>
                <div className={styles.lobbyInputGroup}>
                  <input
                    type="text"
                    className={styles.lobbyInput}
                    placeholder="ROOM CODE"
                    maxLength={6}
                    value={roomCodeInput}
                    onChange={(e) => {
                      setRoomCodeInput(e.target.value.toUpperCase());
                      setErrorMessage('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') joinGame();
                    }}
                  />
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={joinGame}
                  >
                    Join Game
                  </button>
                </div>
                {errorMessage && (
                  <p className={styles.errorMessage}>{errorMessage}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================== Waiting Screen ======================== */}
        {activeScreen === 'waiting' && currentGame && (
          <div className={`${styles.screen} ${styles.waitingScreen}`}>
            <h1 className={styles.title}>🌋 Waiting for Player 2</h1>
            <p className={styles.waitingTitle}>Share this room code with your friend:</p>
            <GameTutorial tutorial={gameTutorials.volcano} accentColor="#ef4444" className="mb-6" />

            <div className={styles.roomCodeTag}>{currentGame.roomCode}</div>

            <div className={styles.copyFeedback}>{copyFeedback}</div>

            <p className={styles.waitingInfo}>
              Waiting for another player to join...
            </p>

            <div className={styles.spinner} />

            <div className={styles.waitingActions}>
              <button
                className={`${styles.btn} ${styles.btnOutline} ${styles.btnSmall}`}
                onClick={copyRoomCode}
              >
                📋 Copy Code
              </button>
              <button
                className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                onClick={cancelWaiting}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ======================== Game Screen ======================== */}
        {activeScreen === 'game' && currentGame && (
          <div className={styles.screen}>
            <h1 className={styles.title}>🌋 Volcano Experiment</h1>

            {/* Players */}
            <div className={styles.playersContainer}>
              {/* Player 1 */}
              <div className={getPlayerPanelClasses('player1')}>
                <div className={styles.playerEmoji}>🔴</div>
                <div className={styles.playerName}>
                  {currentGame.player1.name}
                </div>
                <div className={styles.playerRole}>Player 1</div>
              </div>

              {/* Player 2 */}
              {currentGame.player2 && (
                <div className={getPlayerPanelClasses('player2')}>
                  <div className={styles.playerEmoji}>🔵</div>
                  <div className={styles.playerName}>
                    {currentGame.player2.name}
                  </div>
                  <div className={styles.playerRole}>Player 2</div>
                </div>
              )}
            </div>

            {/* Turn indicator */}
            {currentGame.status === 'playing' && (
              <div
                className={`${styles.turnIndicator} ${
                  isMyTurn ? styles.turnIndicatorYou : styles.turnIndicatorOpponent
                }`}
              >
                {isMyTurn
                  ? "🎯 Your Turn! Pick an ingredient!"
                  : "⏳ Opponent's Turn..."}
              </div>
            )}

            {/* Progress bar */}
            <div className={styles.sharedProgressContainer}>
              <div
                className={styles.progressFill}
                style={{ width: `${progressPercent}%` }}
              />
              <div className={styles.progressText}>
                {totalCollected} / 4 Ingredients
              </div>
            </div>

            {/* Game layout: cards + volcano */}
            <div className={styles.gameLayout}>
              {/* Left: ingredient cards */}
              <div className={styles.gameLeft}>
                <div className={styles.ingredientGridTitle}>
                  🧪 Ingredients
                </div>
                <div className={styles.ingredientGrid}>
                  {currentGame.grid.map((item, index) => (
                    <div
                      key={`${item.id}-${index}`}
                      className={getCardClasses(item, index)}
                      draggable={isMyTurn && !item.collected}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        if (isMyTurn && !item.collected) {
                          collectIngredient(index);
                        }
                      }}
                    >
                      <span>{item.emoji}</span>
                      <span className={styles.ingredientName}>{item.name}</span>
                    </div>
                  ))}
                </div>

                {/* Shared inventory */}
                <div className={styles.sectionTitle}>📦 Shared Inventory</div>
                <div className={styles.ingredientCollectedShared}>
                  {INGREDIENTS.map((ing) => (
                    <div key={ing.id} className={styles.sharedSlot}>
                      <span className={styles.sharedSlotEmoji}>{ing.emoji}</span>
                      <span className={styles.sharedSlotName}>{ing.name}</span>
                      <span className={styles.sharedSlotCount}>
                        {currentGame.sharedInventory[
                          ing.id as keyof SharedInventory
                        ] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: volcano */}
              <div className={styles.gameRight}>
                <div
                  className={`${styles.volcanoContainer} ${
                    dropZoneActive ? styles.dropZoneActive : ''
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {/* Lava particles */}
                  <div
                    className={`${styles.lavaParticles} ${
                      erupting ? styles.lavaParticlesErupting : ''
                    }`}
                  >
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`${styles.particle} ${
                          erupting ? styles.particleErupting : ''
                        }`}
                      />
                    ))}
                  </div>

                  {/* Lava */}
                  <div
                    className={`${styles.lava} ${
                      erupting ? styles.lavaErupting : ''
                    }`}
                  />

                  {/* Volcano */}
                  <div className={styles.volcano} />
                </div>
              </div>
            </div>

            {/* Leave button */}
            <div className={styles.leaveButtonContainer}>
              <button
                className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
                onClick={leaveGame}
              >
                🚪 Leave Game
              </button>
            </div>

            {/* Game over panel */}
            {showGameOver && (
              <div className={styles.gameOverPanel}>
                <div className={styles.gameOverEmoji}>🌋🎉</div>
                <h2 className={styles.gameOverTitle}>VOLCANO ERUPTED!</h2>
                <p className={styles.gameOverSubtitle}>
                  Amazing teamwork! You and your partner collected all the
                  ingredients and triggered the eruption!
                </p>
                <div className={styles.gameOverActions}>
                  <div style={{ marginBottom: '1rem' }}>
                    <ShareGameScore 
                        gameName="Volcano Experiment" 
                        customMessage="I just successfully triggered the volcano eruption in Volcano Experiment! 🌋" 
                    />
                  </div>
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={leaveGame}
                  >
                    🏠 Back to Lobby
                  </button>
                </div>
                <GameRating gameId="volcano" gameName="Volcano Race" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
