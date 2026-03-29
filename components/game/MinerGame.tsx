'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Magnet } from 'lucide-react';
import styles from './MinerGame.module.css';
import { ShareGameScore } from '@/components/game/ShareGameScore';
import GameRating from '@/components/game/GameRating';
import { MinerQuestion, generateMinerQuestions } from '@/lib/data/miner-game-data';
import { db } from '@/lib/firebase/config';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  serverTimestamp,
  FieldValue 
} from 'firebase/firestore';

interface MinerSession {
  sessionId: string;
  questions: Omit<MinerQuestion, 'correctAnswerId'>[];
}

interface MinerGameDocument {
  userId: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  questions: MinerQuestion[]; // includes correctAnswerId
  currentQuestionIndex: number;
  score: number;
  correctCount: number;
  status: 'active' | 'completed';
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

type MinerGameUpdate = Partial<Pick<MinerGameDocument, 'score' | 'correctCount' | 'currentQuestionIndex' | 'status'>> & {
  updatedAt: FieldValue;
  [key: string]: any;
};

export default function MinerGame({ userId }: { userId?: string }) {
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert'>('intermediate');
  const [session, setSession] = useState<MinerSession | null>(null);

  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const [pullingItemId, setPullingItemId] = useState<string | null>(null);
  const [flashingItemId, setFlashingItemId] = useState<string | null>(null);
  const [disabledItems, setDisabledItems] = useState<Set<string>>(new Set());
  const [shakeScreen, setShakeScreen] = useState(false);
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, delay: number}>>([]);
  const [ropeHeight, setRopeHeight] = useState<number>(0);
  const [ropeAngle, setRopeAngle] = useState<number>(0);
  const [ropePhase, setRopePhase] = useState<'idle' | 'extending' | 'attached' | 'retracting'>('idle');
  const [showClank, setShowClank] = useState(false);

  const [gameOver, setGameOver] = useState(false);
  const [finalStats, setFinalStats] = useState<{accuracy: number, achievements: string[], correctCount: number} | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Animation coordinates mapped per item to avoid React updates breaking CSS transitions
  const [itemCoords, setItemCoords] = useState<Record<string, {x: number, y: number, animClass: string}>>({});

  const boardRef = useRef<HTMLDivElement>(null);
  const questionStartTime = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalTime = difficulty === 'expert' ? 8000 : difficulty === 'advanced' ? 10000 : difficulty === 'intermediate' ? 15000 : null;

  // Initialize random item positions for a new question
  const initPositions = useCallback((q: Omit<MinerQuestion, 'correctAnswerId'>) => {
    const coords: Record<string, {x: number, y: number, animClass: string}> = {};
    const anims = ['float1', 'float2', 'float3'];

    q.items.forEach((item, i) => {
      // Keep within 10% to 90% width, and 20% to 70% height to stay above the question text
      coords[item.id] = {
        x: 10 + Math.random() * 80,
        y: 15 + Math.random() * 55,
        animClass: anims[i % 3]
      };
    });
    setItemCoords(coords);
    setDisabledItems(new Set());
    setPullingItemId(null);
    setFlashingItemId(null);
    setRopeHeight(0);
    setRopeAngle(0);
    setRopePhase('idle');
    questionStartTime.current = Date.now();
  }, []);

  const startGame = async () => {
    try {
      setLoading(true);
      setError('');

      if (!userId) {
        throw new Error('You must be logged in to play the Miner Game');
      }

      // Generate questions locally
      const questions = generateMinerQuestions(difficulty, 10);
      const sessionId = `mg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Create Firestore document
      const sessionData: MinerGameDocument = {
        userId,
        difficulty,
        questions,
        currentQuestionIndex: 0,
        score: 0,
        correctCount: 0,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Store in Firestore under users/{userId}/minerGameSessions/{sessionId}
      const docPath = `users/${userId}/minerGameSessions/${sessionId}`;

      await setDoc(doc(db, docPath), sessionData);

      // Strip correct answers for client
      const clientQuestions = questions.map(q => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { correctAnswerId, ...rest } = q;
        return rest;
      });

      setSession({
        sessionId,
        questions: clientQuestions
      });
      setQuestionIndex(0);
      setScore(0);
      setGameOver(false);
      setFinalStats(null);
      initPositions(clientQuestions[0]);
      if (totalTime) setTimeLeft(totalTime);
      
    } catch (err: any) {
      setError(err.message || 'Failed to start game');
    } finally {
      setLoading(false);
    }
  };

  const endGame = useCallback(async (sid: string) => {
    try {
      if (!userId) throw new Error('User not authenticated');
      const docPath = `users/${userId}/minerGameSessions/${sid}`;
      const docRef = doc(db, docPath);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Session not found');
      }
      
      const data = docSnap.data() as MinerGameDocument;
      const accuracy = Math.round((data.correctCount / 10) * 100);
      
      // Update status to completed
      await updateDoc(docRef, {
        status: 'completed',
        updatedAt: serverTimestamp(),
      });
      
      // Achievements
      const achievements = [];
      if (data.score > 200) achievements.push('Golden Pickaxe');
      if (data.correctCount === 10) achievements.push('Flawless Miner');
      
      setFinalStats({
        accuracy,
        achievements,
        correctCount: data.correctCount
      });
      setGameOver(true);
    } catch (err) {
      console.error(err);
    }
  }, [userId]);

  const handleTimeUp = useCallback(async () => {
    if (!session || gameOver) return;
    
    // Auto-fail the current question
    setDisabledItems(_prev => new Set([...session.questions[questionIndex].items.map(i => i.id)]));
    
    try {
      if (!userId) throw new Error('User not authenticated');
      const docPath = `users/${userId}/minerGameSessions/${session.sessionId}`;
      const docRef = doc(db, docPath);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Session not found');
      }
      
      const data = docSnap.data() as MinerGameDocument;
      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error('Questions missing or invalid');
      }
      if (data.status !== 'active') {
        throw new Error('Session is no longer active');
      }
      
      const qIndex = data.currentQuestionIndex;
      
      // Handle out-of-bounds index (game should have ended)
      if (qIndex >= data.questions.length) {
        // Update status to completed if not already
        await updateDoc(docRef, {
          status: 'completed',
          updatedAt: serverTimestamp(),
        });
        // Trigger end game UI
        endGame(session.sessionId);
        return;
      }
      
      if (qIndex < 0) {
        throw new Error('Invalid question index');
      }
      
      // Timeout counts as wrong answer
      let pointsAdded = 0;
      if (data.difficulty === 'intermediate' || data.difficulty === 'advanced' || data.difficulty === 'expert') {
        pointsAdded = -5;
      }
      
      const newScore = Math.max(0, data.score + pointsAdded);
      const newCorrectCount = data.correctCount; // no change
      const newIndex = qIndex + 1;
      
      // Update Firestore
      const updateData: MinerGameUpdate = {
        score: newScore,
        correctCount: newCorrectCount,
        currentQuestionIndex: newIndex,
        updatedAt: serverTimestamp(),
      };
      
      // If this timeout completes the game, mark as completed
      if (newIndex >= data.questions.length) {
        updateData.status = 'completed';
      }
      
      await updateDoc(docRef, updateData);
      
      setScore(newScore);
      
      setTimeout(() => {
        if (newIndex < session.questions.length) {
          setQuestionIndex(newIndex);
          initPositions(session.questions[newIndex]);
          if (totalTime) setTimeLeft(totalTime);
        } else {
          // Game should already be marked completed in Firestore, but ensure UI updates
          endGame(session.sessionId);
        }
      }, 1000);
    } catch (err) {
      console.error(err);
    }
  }, [session, questionIndex, gameOver, initPositions, totalTime, userId, endGame]);

  // Timer loop
  useEffect(() => {
    if (session && !gameOver && totalTime && !pullingItemId && !flashingItemId) {
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - questionStartTime.current;
        const remaining = Math.max(0, totalTime - elapsed);
        setTimeLeft(remaining);
        if (remaining <= 0) {
          clearInterval(timerRef.current!);
          handleTimeUp();
        }
      }, 50);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session, gameOver, totalTime, pullingItemId, flashingItemId, handleTimeUp]);

  const renderItemToken = (item: any) => {
    if (!item) return null;
    return (
      <div className={`
        ${styles.mineralToken} 
        ${item.type === 'metal' ? styles.typeMetal : item.type === 'nonmetal' ? styles.typeNonmetal : item.type === 'metalloid' ? styles.typeMetalloid : styles.typeAlloy}
      `}>
        <span className={styles.itemSymbol}>{item.id}</span>
        <span className={styles.itemName}>{item.name}</span>
      </div>
    );
  };

  const onAnswerClick = async (itemId: string) => {
    if (!session || disabledItems.has(itemId) || pullingItemId || flashingItemId) return;
    
    const timeTakenMs = Date.now() - questionStartTime.current;
    
    // Pause timer
    if (timerRef.current) clearInterval(timerRef.current);
    
    try {
      if (!userId) throw new Error('User not authenticated');
      const docPath = `users/${userId}/minerGameSessions/${session.sessionId}`;
      const docRef = doc(db, docPath);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Session not found');
      }
      
      const data = docSnap.data() as MinerGameDocument;
      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error('Questions missing or invalid');
      }
      if (data.status !== 'active') {
        throw new Error('Session is no longer active');
      }
      
      const qIndex = data.currentQuestionIndex;
      
      // Handle out-of-bounds index (game should have ended)
      if (qIndex >= data.questions.length) {
        // Update status to completed if not already
        await updateDoc(docRef, {
          status: 'completed',
          updatedAt: serverTimestamp(),
        });
        // Trigger end game UI
        endGame(session.sessionId);
        return;
      }
      
      if (qIndex < 0) {
        throw new Error('Invalid question index');
      }
      
      const question = data.questions[qIndex];
      const clientQuestion = session.questions[qIndex];
      
      if (!question || !clientQuestion) {
        throw new Error('Question not found');
      }
      
      if (question.id !== clientQuestion.id) {
        throw new Error('Question mismatch');
      }
      
      const isCorrect = itemId === question.correctAnswerId;
      
      // Calculate points
      let pointsAdded = 0;
      if (isCorrect) {
        pointsAdded = 15;
        if (timeTakenMs && timeTakenMs < 5000) pointsAdded += 5;
        if (data.difficulty === 'intermediate') pointsAdded = Math.round(pointsAdded * 1.5);
        if (data.difficulty === 'advanced') pointsAdded = pointsAdded * 2;
        if (data.difficulty === 'expert') pointsAdded = Math.round(pointsAdded * 3);
      } else {
        if (data.difficulty === 'intermediate' || data.difficulty === 'advanced' || data.difficulty === 'expert') {
          pointsAdded = -5;
        }
      }
      
      const newScore = Math.max(0, data.score + pointsAdded);
      const newCorrectCount = isCorrect ? data.correctCount + 1 : data.correctCount;
      
      // Advance to next question on correct answers, or on wrong answers for advanced/expert
      const shouldAdvance = isCorrect || data.difficulty === 'advanced' || data.difficulty === 'expert';
      const newIndex = shouldAdvance ? qIndex + 1 : qIndex;
      
      // Update Firestore
      const updateData: MinerGameUpdate = {
        score: newScore,
        correctCount: newCorrectCount,
        currentQuestionIndex: newIndex,
        updatedAt: serverTimestamp(),
      };
      
      // If this answer completes the game, mark as completed
      if (newIndex >= data.questions.length) {
        updateData.status = 'completed';
      }
      
      await updateDoc(docRef, updateData);
      
      setScore(newScore);
      
      if (isCorrect) {
        // Animation for correct - TWO-PHASE ROPE EXTENSION
        setPullingItemId(itemId);
        setShakeScreen(true);
        setRopePhase('extending');
        
        // Get dimensions of the canvas for pixel-perfect calculation
        const canvas = boardRef.current;
        const width = canvas?.clientWidth || 1000;
        const height = canvas?.clientHeight || 600;

        // Get the clicked item's position
        const itemX_pct = itemCoords[itemId]?.x || 50;
        const itemY_pct = itemCoords[itemId]?.y || 50;
        
        // Convert percentages to pixels for precise geometry
        const targetX = (itemX_pct / 100) * width;
        const targetY = (itemY_pct / 100) * height;
        const centerX = width / 2;
        const centerY = 0; // Rope starts at top

        const dx = targetX - centerX;
        const dy = targetY - centerY;
        
        // Calculate distance and angle in pixels to account for canvas aspect ratio
        const targetDistancePx = Math.sqrt(dx * dx + dy * dy);
        const targetAngle = -(Math.atan2(dx, dy) * (180 / Math.PI));

        // Phase 1: Extend rope down (600ms)
        setTimeout(() => {
          setRopeHeight(targetDistancePx);
          setRopeAngle(targetAngle);
        }, 50);
        
        // Phase 2: Magnet attaches - show CLANK and particles (at 600ms)
        setTimeout(() => {
          setRopePhase('attached');
          setShowClank(true);
          
          // Generate gold sparkle particles at contact point
          const newParticles = Array.from({ length: 15 }, (_, i) => ({
            id: Date.now() + i,
            x: itemX_pct,
            y: itemY_pct,
            delay: i * 0.05
          }));
          setParticles(newParticles);
          
          // Hide CLANK after brief moment
          setTimeout(() => setShowClank(false), 400);
        }, 600);
        
        // Phase 3: Begin retracting and pulling element (after 800ms total = 600ms extend + 200ms pause)
        setTimeout(() => {
          setRopePhase('retracting');
          setRopeHeight(0); // Retract all the way back up
          setRopeAngle(0);  // Rotate back to center
        }, 800);
        
        // Clear shake after animation starts
        setTimeout(() => setShakeScreen(false), 300);
        
        // Clear particles after animation
        setTimeout(() => setParticles([]), 2000);
        
        // Reset rope phase after animation completes (1700ms total)
        setTimeout(() => {
          setRopePhase('idle');
          setRopeHeight(0);
          setRopeAngle(0);
          setPullingItemId(null);
        }, 1700);
        
        // Wait for complete animation (1.7s) before next question
        setTimeout(() => {
          if (newIndex < session.questions.length) {
            setQuestionIndex(newIndex);
            initPositions(session.questions[newIndex]);
            if (totalTime) setTimeLeft(totalTime);
          } else {
            // Game should already be marked completed in Firestore, but ensure UI updates
            endGame(session.sessionId);
          }
        }, 1700);

      } else {
        // Animation for wrong
        setFlashingItemId(itemId);
        
        // For advanced/expert, advance to next question after brief delay
        if (data.difficulty === 'advanced' || data.difficulty === 'expert') {
          setTimeout(() => {
            setFlashingItemId(null);
            if (newIndex < session.questions.length) {
              setQuestionIndex(newIndex);
              initPositions(session.questions[newIndex]);
              if (totalTime) setTimeLeft(totalTime);
            } else {
              endGame(session.sessionId);
            }
          }, 800);
        } else {
          // For beginner/intermediate, stay on same question and disable the wrong item
          setDisabledItems(prev => new Set([...prev, itemId]));
          
          setTimeout(() => {
            setFlashingItemId(null);
            // Resume timer but keep item disabled
            questionStartTime.current += 500; // compensate for animation pause
          }, 500);
        }
      }
      
    } catch (err) {
      console.error(err);
    }
  };

  const getTimerColor = () => {
    if (!totalTime || !timeLeft) return '';
    const ratio = timeLeft / totalTime;
    return ratio < 0.25 ? styles.timerWarning : '';
  };

  return (
    <div className={styles.container}>
      <Link href="/games" className={styles.backLink}>
        &larr; Back to Games
      </Link>

      <div className={styles.gameArea}>
        
        {!session && !gameOver && (
           userId ? (
             <div className={styles.startScreen}>
                <h1 className={styles.title}>Miner Game</h1>
                <p className={styles.subtitle}>
                  Extract the correct elements using your reliable scientific magnet crane. 
                  Beware of radioactive red flashes (wrong answers)!
                </p>
                
                <div className="mb-6">
                  <label className="mr-3 font-semibold text-[var(--text-main)]">Difficulty:</label>
                  <select 
                    value={difficulty} 
                    onChange={(e) => setDifficulty(e.target.value as 'beginner' | 'intermediate' | 'advanced' | 'expert')}
                    className="bg-black/30 text-white border border-gray-600 rounded px-3 py-1 outline-none"
                  >
                    <option value="beginner">🌱 Beginner</option>
                    <option value="intermediate">📘 Intermediate</option>
                    <option value="advanced">📕 Advanced</option>
                    <option value="expert">🔥 Expert</option>
                  </select>
                </div>
                
                {error && <p className="text-red-400 mt-4">{error}</p>}
                
                <button 
                  className={styles.startBtn} 
                  onClick={startGame} 
                  disabled={loading}
                >
                  {loading ? 'Initializing Crane...' : 'Start Mining'}
                </button>
             </div>
           ) : (
             <div className={styles.startScreen}>
                <h1 className={styles.title}>Miner Game</h1>
                <p className={styles.subtitle}>
                  You need to be logged in to play the Miner Game.
                </p>
                <Link href="/sign-in">
                  <button className={styles.startBtn}>Login</button>
                </Link>
             </div>
           )
        )}

        {session && !gameOver && (
          <>
            <div className={styles.uiLayer}>
              <div className={styles.uiBox}>Score: {score}</div>
              <div className={styles.uiBox}>Question: {questionIndex + 1} / 10</div>
            </div>

            <div 
              ref={boardRef}
              className={`${styles.canvas} ${shakeScreen ? styles.shakeScreen : ''}`}
            >
              {/* Crane / Magnet - Fixed at top-center, rotates to reach elements */}
              <div 
                className={styles.craneRoot}
                style={{ 
                  left: '50%',
                  transition: 'none'
                }}
              >
                <div 
                  className={`${styles.rope} ${ropePhase === 'extending' ? styles.ropeExtending : ropePhase === 'retracting' ? styles.ropeRetracting : ''}`} 
                  style={{ 
                    height: pullingItemId ? `${ropeHeight}px` : '0px', 
                    opacity: pullingItemId ? 1 : 0,
                    transform: `rotate(${ropeAngle}deg)`
                  }} 
                >
                  <Magnet size={40} className={`${styles.magnet} ${ropePhase === 'attached' ? styles.magnetAttaching : ''}`} />
                  
                  {/* Attached Item - Shown inside the rope div so it follows its transform perfectly */}
                  {pullingItemId && (ropePhase === 'attached' || ropePhase === 'retracting') && (
                    <div 
                      className={`${styles.itemWrapper} ${styles.itemAttached} ${ropePhase === 'retracting' ? styles.itemBeingPulled : ''}`}
                      style={{ 
                        position: 'absolute',
                        bottom: '0',
                        left: '50%',
                        transform: `translate(-50%, 50%) rotate(${-ropeAngle}deg)`,
                        zIndex: 25
                      }}
                    >
                      {renderItemToken(session.questions[questionIndex].items.find(i => i.id === pullingItemId))}
                    </div>
                  )}

                  {/* CLANK text effect - nested inside rope to move with magnet. Un-rotated to stay upright. */}
                  {showClank && (
                    <div 
                      className={styles.clankText}
                      style={{ transform: `translateX(-50%) rotate(${-ropeAngle}deg)` }}
                    >
                      CLANK!
                    </div>
                  )}
                </div>
              </div>

              {session.questions[questionIndex].items.map((item) => {
                const c = itemCoords[item.id];
                if (!c) return null;
                const isFlashing = flashingItemId === item.id;
                const isPulling = pullingItemId === item.id;
                const isDisabled = disabledItems.has(item.id);

                // Hide the item if it's currently attached to the crane (it's being rendered inside the crane div)
                if (isPulling && (ropePhase === 'attached' || ropePhase === 'retracting')) {
                  return null;
                }

                return (
                  <div 
                    key={item.id}
                    onClick={() => onAnswerClick(item.id)}
                    className={`
                      ${styles.itemWrapper} 
                      ${c.animClass ? styles[c.animClass] : ''} 
                      ${isFlashing ? styles.wrongShake : ''}
                      ${isDisabled ? styles.itemDisabled : ''}
                      ${isPulling ? styles.itemTargeted : ''}
                    `}
                    style={{ 
                      left: `${c.x}%`, 
                      top: `${c.y}%`,
                      opacity: (isDisabled && !isFlashing) ? 0.4 : 1
                    }}
                  >
                    {renderItemToken(item)}
                  </div>
                );
              })}
              
              {/* Gold sparkle particles trail */}
              {particles.map((particle) => (
                <div
                  key={particle.id}
                  className={styles.goldParticle}
                  style={{
                    left: `${particle.x}%`,
                    top: `${particle.y}%`,
                    animationDelay: `${particle.delay}s`
                  }}
                />
              ))}
              
              {pullingItemId && (
                <div 
                  className={styles.sparkle} 
                  style={{ 
                    left: `${itemCoords[pullingItemId]?.x}%`, 
                    top: `${itemCoords[pullingItemId]?.y}%` 
                  }} 
                />
              )}
            </div>

            <div className={styles.bottomPanel}>
              <p className={styles.questionText}>{session.questions[questionIndex].text}</p>
              
              {totalTime && (
                 <div className={styles.timerBarContainer}>
                   <div 
                     className={`${styles.timerBarFill} ${getTimerColor()}`} 
                     style={{ width: `${Math.max(0, (timeLeft! / totalTime) * 100)}%` }} 
                   />
                 </div>
              )}
            </div>
          </>
        )}

        {gameOver && finalStats && (
          <div className={styles.gameOverScreen}>
            <h2 className={styles.title}>Mining Complete!</h2>

            <div className={styles.statsRow}>
              <div className={styles.statItem}>
                Score<br/><span style={{color: 'var(--accent-color)'}}>{score}</span>
              </div>
              <div className={styles.statItem}>
                Accuracy<br/><span style={{color: '#3b82f6'}}>{finalStats.accuracy}%</span>
              </div>
              <div className={styles.statItem}>
                Found<br/><span style={{color: '#f59e0b'}}>{finalStats.correctCount}/10</span>
              </div>
            </div>

            {finalStats.achievements.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-3 text-emerald-400">Achievements Unlocked!</h3>
                <div className="flex gap-4 justify-center">
                  {finalStats.achievements.map(ach => (
                    <div key={ach} className="bg-emerald-500/20 border border-emerald-500/50 px-4 py-2 rounded-full text-emerald-200 text-sm font-semibold">
                      🏆 {ach}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button className={styles.startBtn} onClick={startGame}>Play Again</button>
              <ShareGameScore 
                gameName="Miner Game" 
                score={score} 
                customMessage={`I just scored ${score} points in Miner Game! Accuracy: ${finalStats?.accuracy}% | Elements: ${finalStats?.correctCount}/10 🎮`}
              />
            </div>

            <div className="mt-8 w-full max-w-md">
              <GameRating gameId="miner-game" gameName="Miner Game" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
