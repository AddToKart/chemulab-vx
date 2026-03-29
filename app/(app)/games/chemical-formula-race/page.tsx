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

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

interface Compound {
  id: string;
  name: string;
  emoji: string;
  formula: string;
}

const COMPOUNDS: Compound[] = [
  { id: 'water', name: 'Water', emoji: '💧', formula: 'H₂O' },
  { id: 'carbon_dioxide', name: 'Carbon Dioxide', emoji: '🌍', formula: 'CO₂' },
  { id: 'salt', name: 'Common Salt', emoji: '🧂', formula: 'NaCl' },
  { id: 'methane', name: 'Methane', emoji: '⛽', formula: 'CH₄' },
  { id: 'sulfuric_acid', name: 'Sulfuric Acid', emoji: '⚗️', formula: 'H₂SO₄' },
  { id: 'glucose', name: 'Glucose', emoji: '🍬', formula: 'C₆H₁₂O₆' },
  { id: 'ammonia', name: 'Ammonia', emoji: '💨', formula: 'NH₃' },
  { id: 'hydrogen_peroxide', name: 'Hydrogen Peroxide', emoji: '🧪', formula: 'H₂O₂' },
  { id: 'calcium_carbonate', name: 'Calcium Carbonate', emoji: '⛰️', formula: 'CaCO₃' },
  { id: 'sodium_hydroxide', name: 'Sodium Hydroxide', emoji: '🔞', formula: 'NaOH' },
  { id: 'ethanol', name: 'Ethanol', emoji: '🍷', formula: 'C₂H₆O' },
  { id: 'acetic_acid', name: 'Acetic Acid', emoji: '🍶', formula: 'CH₃COOH' },
  { id: 'nitrogen', name: 'Nitrogen Gas', emoji: '💨', formula: 'N₂' },
  { id: 'oxygen', name: 'Oxygen Gas', emoji: '🫁', formula: 'O₂' },
  { id: 'chlorine', name: 'Chlorine Gas', emoji: '☢️', formula: 'Cl₂' },
  { id: 'magnesium_oxide', name: 'Magnesium Oxide', emoji: '🔥', formula: 'MgO' },
  { id: 'potassium_nitrate', name: 'Potassium Nitrate', emoji: '💥', formula: 'KNO₃' },
  { id: 'zinc_sulfate', name: 'Zinc Sulfate', emoji: '⚡', formula: 'ZnSO₄' },
  { id: 'iron_oxide', name: 'Iron Oxide', emoji: '🦴', formula: 'Fe₂O₃' },
  { id: 'aluminum_oxide', name: 'Aluminum Oxide', emoji: '✨', formula: 'Al₂O₃' },
];

const WINNING_ROUNDS = 3;
const ROUND_TIME = 30; // seconds

interface RoundSubmission {
  playerNum: number;
  formula: string;
  timestamp: number; // when they submitted relative to round start
  correct: boolean;
}

interface GameData {
  id: string;
  player1: string;
  player2: string | null;
  p1Name: string;
  p2Name: string;
  status: 'waiting' | 'playing' | 'completed';
  currentRound: number;
  currentCompoundId: string;
  p1Score: number; // number of rounds won
  p2Score: number;
  p1Submissions: RoundSubmission[];
  p2Submissions: RoundSubmission[];
  roundStartTime: number; // timestamp
  roundEnded: boolean;
  winner: number | null; // 1, 2, or 0 for tie
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

function getCompound(id: string): Compound {
  return COMPOUNDS.find((c) => c.id === id)!;
}

function normalizeFormula(formula: string): string {
  // Remove spaces and convert to lowercase for comparison
  // Handle subscripts: ₂ -> 2, ₃ -> 3, etc.
  return formula
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/₀/g, '0')
    .replace(/₁/g, '1')
    .replace(/₂/g, '2')
    .replace(/₃/g, '3')
    .replace(/₄/g, '4')
    .replace(/₅/g, '5')
    .replace(/₆/g, '6')
    .replace(/₇/g, '7')
    .replace(/₈/g, '8')
    .replace(/₉/g, '9');
}

function getRandomCompound(): Compound {
  return COMPOUNDS[Math.floor(Math.random() * COMPOUNDS.length)];
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

export default function ChemicalFormulaRacePage() {
  const { user } = useAuthStore();

  const [screen, setScreen] = useState<Screen>('lobby');
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [winnerText, setWinnerText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const gameIdRef = useRef<string>(undefined);
  const unsubRef = useRef<(() => void) | undefined>(undefined);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const roundStartRef = useRef<number>(0);

  /* ---------- derived ---------- */
  const myPlayerNum =
    gameData && user
      ? gameData.player1 === user.uid
        ? 1
        : gameData.player2 === user.uid
          ? 2
          : null
      : null;

  const currentCompound = gameData ? getCompound(gameData.currentCompoundId) : null;
  const isRoundActive = gameData && !gameData.roundEnded && timeLeft > 0;

  /* ---------- cleanup ---------- */
  const cleanup = useCallback(() => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = undefined;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    gameIdRef.current = undefined;
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  /* ---------- Timer ---------- */
  useEffect(() => {
    if (screen !== 'game' || !gameData || gameData.roundEnded) return;

    const elapsed = Math.floor((Date.now() - gameData.roundStartTime) / 1000);
    const remaining = Math.max(0, ROUND_TIME - elapsed);
    setTimeLeft(remaining);

    if (remaining === 0 && !gameData.roundEnded) {
      // Round time expired, move to next round
      handleRoundTimeout();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0 && gameData && !gameData.roundEnded) {
          handleRoundTimeout();
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [screen, gameData, gameData?.roundEnded]);

  /* ---------- Firestore listener ---------- */
  const listenToGame = useCallback(
    (gameId: string) => {
      cleanup();
      gameIdRef.current = gameId;

      const unsub = onSnapshot(doc(db, 'formulaRaceGames', gameId), (snap) => {
        if (!snap.exists()) {
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
          setHasSubmitted(false);
          setFeedback(null);
          setInputValue('');
          const elapsed = Math.floor((Date.now() - gd.roundStartTime) / 1000);
          const remaining = Math.max(0, ROUND_TIME - elapsed);
          setTimeLeft(remaining);
        } else if (gd.status === 'completed') {
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
      const compound = getRandomCompound();

      const gameDoc: Omit<GameData, 'id'> = {
        player1: user.uid,
        player2: null,
        p1Name: displayName,
        p2Name: '',
        status: 'waiting',
        currentRound: 1,
        currentCompoundId: compound.id,
        p1Score: 0,
        p2Score: 0,
        p1Submissions: [],
        p2Submissions: [],
        roundStartTime: Date.now(),
        roundEnded: false,
        winner: null,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'formulaRaceGames', code), gameDoc);
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
      const snap = await getDoc(doc(db, 'formulaRaceGames', code));
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

      await updateDoc(doc(db, 'formulaRaceGames', code), {
        player2: user.uid,
        p2Name: displayName,
        status: 'playing',
        roundStartTime: Date.now(),
      });

      listenToGame(code);
    } catch (err) {
      setError('Failed to join game. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Submit Formula ---------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameData || !user || !myPlayerNum || !isRoundActive || hasSubmitted) return;

    const userInput = normalizeFormula(inputValue);
    const correctFormula = normalizeFormula(currentCompound!.formula);
    const isCorrect = userInput === correctFormula;

    // Calculate score based on speed (earlier = better) and accuracy
    const elapsedTime = Math.floor((Date.now() - gameData.roundStartTime) / 1000);
    const speedPoints = Math.max(0, (ROUND_TIME - elapsedTime) / ROUND_TIME * 100);
    const accuracyMultiplier = isCorrect ? 1 : 0.25;
    const roundPoints = Math.round(speedPoints * accuracyMultiplier);

    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setHasSubmitted(true);

    try {
      const newSubmission: RoundSubmission = {
        playerNum: myPlayerNum,
        formula: inputValue,
        timestamp: elapsedTime,
        correct: isCorrect,
      };

      const updates: Record<string, unknown> = {};

      if (myPlayerNum === 1) {
        updates.p1Submissions = [...gameData.p1Submissions, newSubmission];
      } else {
        updates.p2Submissions = [...gameData.p2Submissions, newSubmission];
      }

      // Check if both players have submitted or time is up
      const allSubmitted =
        (myPlayerNum === 1 && gameData.p2Submissions.length > 0) ||
        (myPlayerNum === 2 && gameData.p1Submissions.length > 0);

      if (allSubmitted || timeLeft <= 0) {
        // End this round and determine winner
        const p1LastSubmission = myPlayerNum === 1 ? newSubmission : gameData.p1Submissions[gameData.p1Submissions.length - 1];
        const p2LastSubmission = myPlayerNum === 2 ? newSubmission : gameData.p2Submissions[gameData.p2Submissions.length - 1];

        let p1RoundWin = false,
          p2RoundWin = false;

        if (p1LastSubmission && p2LastSubmission) {
          if (p1LastSubmission.correct && !p2LastSubmission.correct) {
            p1RoundWin = true;
          } else if (!p1LastSubmission.correct && p2LastSubmission.correct) {
            p2RoundWin = true;
          } else if (p1LastSubmission.correct && p2LastSubmission.correct) {
            p1RoundWin = p1LastSubmission.timestamp < p2LastSubmission.timestamp;
            p2RoundWin = !p1RoundWin;
          }
        }

        const newP1Score = gameData.p1Score + (p1RoundWin ? 1 : 0);
        const newP2Score = gameData.p2Score + (p2RoundWin ? 1 : 0);

        updates.p1Score = newP1Score;
        updates.p2Score = newP2Score;
        updates.roundEnded = true;

        // Check if game is over
        if (newP1Score >= WINNING_ROUNDS || newP2Score >= WINNING_ROUNDS) {
          updates.status = 'completed';
          if (newP1Score > newP2Score) {
            updates.winner = 1;
          } else if (newP2Score > newP1Score) {
            updates.winner = 2;
          } else {
            updates.winner = 0;
          }
        }
      }

      await updateDoc(doc(db, 'formulaRaceGames', gameData.id), updates);
    } catch (err) {
      console.error('Failed to submit formula:', err);
      setHasSubmitted(false);
    }
  };

  /* ---------- Next Round ---------- */
  const handleNextRound = async () => {
    if (!gameData) return;

    try {
      const newCompound = getRandomCompound();
      await updateDoc(doc(db, 'formulaRaceGames', gameData.id), {
        currentCompoundId: newCompound.id,
        p1Submissions: [],
        p2Submissions: [],
        roundStartTime: Date.now(),
        roundEnded: false,
        currentRound: gameData.currentRound + 1,
      });

      setInputValue('');
      setFeedback(null);
      setHasSubmitted(false);
    } catch (err) {
      console.error('Failed to start next round:', err);
    }
  };

  /* ---------- Round Timeout ---------- */
  const handleRoundTimeout = async () => {
    if (!gameData || gameData.roundEnded) return;

    try {
      const p1Sub = gameData.p1Submissions[gameData.p1Submissions.length - 1];
      const p2Sub = gameData.p2Submissions[gameData.p2Submissions.length - 1];

      let p1RoundWin = false,
        p2RoundWin = false;

      if (p1Sub && p2Sub) {
        if (p1Sub.correct && !p2Sub.correct) {
          p1RoundWin = true;
        } else if (!p1Sub.correct && p2Sub.correct) {
          p2RoundWin = true;
        } else if (p1Sub.correct && p2Sub.correct) {
          p1RoundWin = p1Sub.timestamp < p2Sub.timestamp;
          p2RoundWin = !p1RoundWin;
        }
      }

      const newP1Score = gameData.p1Score + (p1RoundWin ? 1 : 0);
      const newP2Score = gameData.p2Score + (p2RoundWin ? 1 : 0);

      const updates: Record<string, unknown> = {
        p1Score: newP1Score,
        p2Score: newP2Score,
        roundEnded: true,
      };

      if (newP1Score >= WINNING_ROUNDS || newP2Score >= WINNING_ROUNDS) {
        updates.status = 'completed';
        if (newP1Score > newP2Score) {
          updates.winner = 1;
        } else if (newP2Score > newP1Score) {
          updates.winner = 2;
        } else {
          updates.winner = 0;
        }
      }

      await updateDoc(doc(db, 'formulaRaceGames', gameData.id), updates);
    } catch (err) {
      console.error('Failed to handle round timeout:', err);
    }
  };

  /* ---------- Leave / Cancel ---------- */
  const handleLeave = async () => {
    if (!gameData) return;
    try {
      await deleteDoc(doc(db, 'formulaRaceGames', gameData.id));
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
    setInputValue('');
    setFeedback(null);
    setHasSubmitted(false);
    setScreen('lobby');
  };

  /* ================================================================== */
  /*  Render                                                             */
  /* ================================================================== */

  if (!user) {
    return (
      <div className={styles.container}>
        <p>You must be logged in to play.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Link href="/games" className={styles.backLink}>
        &larr; Back to Games
      </Link>

      <div className={styles.gameArea}>
        <h1 className={styles.title}>Chemical Formula Race</h1>
        <p className={styles.subtitle}>Type formulas faster than your opponent!</p>

        {error && <p className={styles.errorMsg}>{error}</p>}

        {/* ---- LOBBY ---- */}
        {screen === 'lobby' && (
          <div className={styles.lobbyContainer}>
            <GameTutorial
              tutorial={gameTutorials.chemFormulaRace}
              accentColor="#06b6d4"
              className="mb-6"
            />

            <div className={styles.lobbyButtons}>
              <button
                className={styles.createBtn}
                onClick={handleCreate}
                disabled={loading}
              >
                {loading ? 'Creating...' : '➕ Create Room'}
              </button>
              <div className={styles.divider}>or</div>
              <div className={styles.joinSection}>
                <input
                  type="text"
                  placeholder="Enter room code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className={styles.joinInput}
                  maxLength={5}
                />
                <button
                  className={styles.joinBtn}
                  onClick={handleJoin}
                  disabled={loading}
                >
                  {loading ? 'Joining...' : '🚪 Join Room'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---- WAITING ---- */}
        {screen === 'waiting' && gameData && (
          <div className={styles.waitingContainer}>
            <div className={styles.roomCode}>
              <p>Room Code:</p>
              <h2>{gameData.id}</h2>
              <p className={styles.shareText}>Share this code with your friend!</p>
            </div>

            <div className={styles.playerWaiting}>
              <p>Waiting for opponent...</p>
              <div className={styles.spinner}></div>
            </div>

            <button className={styles.cancelBtn} onClick={handleLeave}>
              Cancel
            </button>
          </div>
        )}

        {/* ---- GAME ---- */}
        {screen === 'game' && gameData && currentCompound && (
          <div className={styles.gameContainer}>
            <div className={styles.score}>
              <div>
                <strong>{gameData.p1Name}</strong>
                <div className={styles.scoreValue}>{gameData.p1Score}</div>
              </div>
              <div className={styles.vs}>vs</div>
              <div>
                <div className={styles.scoreValue}>{gameData.p2Score}</div>
                <strong>{gameData.p2Name}</strong>
              </div>
            </div>

            <div className={styles.roundInfo}>
              <p>Round {gameData.currentRound} of {WINNING_ROUNDS}</p>
              <div className={styles.timer}>{timeLeft}s</div>
            </div>

            <div className={styles.compoundDisplay}>
              <div className={styles.compoundEmoji}>{currentCompound.emoji}</div>
              <h2>What is the formula for...</h2>
              <h3>{currentCompound.name}</h3>
            </div>

            {!gameData.roundEnded ? (
              <form onSubmit={handleSubmit} className={styles.formulaForm}>
                <input
                  type="text"
                  placeholder="Type the chemical formula..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={hasSubmitted || !isRoundActive}
                  className={styles.formulaInput}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={hasSubmitted || !isRoundActive || !inputValue.trim()}
                  className={styles.submitBtn}
                >
                  Submit
                </button>
              </form>
            ) : (
              <div className={styles.roundEnd}>
                {feedback === 'correct' && (
                  <p className={styles.correct}>✓ Correct!</p>
                )}
                {feedback === 'incorrect' && (
                  <p className={styles.incorrect}>✗ Incorrect</p>
                )}
                <p>The formula is: <strong>{currentCompound.formula}</strong></p>
              </div>
            )}

            {gameData.roundEnded && (
              <button className={styles.nextRoundBtn} onClick={handleNextRound}>
                Next Round
              </button>
            )}
          </div>
        )}

        {/* ---- VICTORY ---- */}
        {screen === 'victory' && gameData && (
          <div className={styles.victoryContainer}>
            <h2 className={styles.victoryText}>{winnerText}</h2>

            <div className={styles.finalScore}>
              <div>
                <p>{gameData.p1Name}</p>
                <p className={styles.finalScoreValue}>{gameData.p1Score}</p>
              </div>
              <span className={styles.finalVs}>—</span>
              <div>
                <p className={styles.finalScoreValue}>{gameData.p2Score}</p>
                <p>{gameData.p2Name}</p>
              </div>
            </div>

            <ShareGameScore
              customMessage={`I scored ${myPlayerNum === 1 ? gameData.p1Score : gameData.p2Score} rounds in Chemical Formula Race! 🧪`}
              gameName="Chemical Formula Race"
            />

            <GameRating gameId="chemical-formula-race" gameName="Chemical Formula Race" />

            <div className={styles.victoryButtons}>
              <button className={styles.playAgainBtn} onClick={handlePlayAgain}>
                ↻ Play Again
              </button>
              <Link href="/games" className={styles.backToGamesBtn}>
                Back to Games
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
