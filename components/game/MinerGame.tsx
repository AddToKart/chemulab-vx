'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Magnet } from 'lucide-react';
import styles from './MinerGame.module.css';
import { ShareGameScore } from '@/components/game/ShareGameScore';
import GameRating from '@/components/game/GameRating';
import { MinerQuestion, generateMinerQuestions } from '@/lib/data/miner-game-data';
import { ResumeModal } from '@/components/game/ResumeModal';

interface MinerSession {
  sessionId: string;
  questions: MinerQuestion[];
}

interface SavedSession {
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  session: MinerSession | null;
  questionIndex: number;
  score: number;
  correctCount: number;
  timeLeft: number | null;
}

const SESSION_KEY = 'minerGameSession';

export default function MinerGame({ userId }: { userId?: string }) {
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert'>('intermediate');
  const [session, setSession] = useState<MinerSession | null>(null);

  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [savedSession, setSavedSession] = useState<SavedSession | null>(null);

  /* ---------- Session restoration on mount ---------- */
  useEffect(() => {
    const storedSession = sessionStorage.getItem(SESSION_KEY);
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession) as SavedSession;
        if (parsed.session && parsed.session.questions.length > 0) {
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
    if (session && !sessionStorage.getItem(SESSION_KEY + '_gameOver')) {
      const sessionData: SavedSession = {
        difficulty,
        session,
        questionIndex,
        score,
        correctCount,
        timeLeft,
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    }
  }, [difficulty, session, questionIndex, score, correctCount, timeLeft]);

  /* ---------- Clear session on game over ---------- */
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY + '_gameOver')) {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY + '_gameOver');
    }
  }, []);

  /* ---------- Handle resume ---------- */
  const handleResume = useCallback(() => {
    if (savedSession) {
      setDifficulty(savedSession.difficulty);
      setSession(savedSession.session);
      setQuestionIndex(savedSession.questionIndex);
      setScore(savedSession.score);
      setCorrectCount(savedSession.correctCount);
      setTimeLeft(savedSession.timeLeft);
      setShowResumeModal(false);
      
      if (savedSession.session) {
        initPositions(savedSession.session.questions[savedSession.questionIndex]);
      }
    }
  }, [savedSession]);

  /* ---------- Handle start new ---------- */
  const handleStartNew = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setShowResumeModal(false);
    setSavedSession(null);
    startGame();
  }, []);

  const [pullingItemId, setPullingItemId] = useState<string | null>(null);
  const [flashingItemId, setFlashingItemId] = useState<string | null>(null);
  const [disabledItems, setDisabledItems] = useState<Set<string>>(new Set());
  const [shakeScreen, setShakeScreen] = useState(false);
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, delay: number}>>([]);
  const [ropeHeight, setRopeHeight] = useState<number>(0);
  const [ropeAngle, setRopeAngle] = useState<number>(0);
  const [ropePhase, setRopePhase] = useState<'idle' | 'extending' | 'attached' | 'retracting'>('idle');
  const [showClank, setShowClank] = useState(false);
  const [popoyPulling, setPopoyPulling] = useState(false);

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

  const startGame = () => {
    try {
      setLoading(true);
      setError('');

      const questions = generateMinerQuestions(difficulty, 10);
      const sessionId = `mg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Keep correctAnswerId for local validation
      setSession({
        sessionId,
        questions
      });
      setQuestionIndex(0);
      setScore(0);
      setCorrectCount(0);
      setGameOver(false);
      setFinalStats(null);
      initPositions(questions[0]);
      if (totalTime) setTimeLeft(totalTime);
      
    } catch (err: any) {
      setError(err.message || 'Failed to start game');
    } finally {
      setLoading(false);
    }
  };

  const endGame = useCallback(() => {
    const accuracy = Math.round((correctCount / 10) * 100);
    
    const achievements = [];
    if (score > 200) achievements.push('Golden Pickaxe');
    if (correctCount === 10) achievements.push('Flawless Miner');
    
    setFinalStats({
      accuracy,
      achievements,
      correctCount
    });
    setGameOver(true);
    sessionStorage.setItem(SESSION_KEY + '_gameOver', 'true');
  }, [score, correctCount]);

  const handleTimeUp = useCallback(async () => {
    if (!session || gameOver) return;
    
    const currentQuestion = session.questions[questionIndex];
    if (!currentQuestion) return;
    
    setDisabledItems(new Set([...currentQuestion.items.map(i => i.id)]));
    
    let pointsAdded = 0;
    if (difficulty === 'intermediate' || difficulty === 'advanced' || difficulty === 'expert') {
      pointsAdded = -5;
    }
    
    const newScore = Math.max(0, score + pointsAdded);
    const newIndex = questionIndex + 1;
    
    setScore(newScore);
    
    setTimeout(() => {
      if (newIndex < session.questions.length) {
        setQuestionIndex(newIndex);
        initPositions(session.questions[newIndex]);
        if (totalTime) setTimeLeft(totalTime);
      } else {
        endGame();
      }
    }, 1000);
  }, [session, gameOver, difficulty, questionIndex, score, totalTime, endGame, initPositions]);

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

  const onAnswerClick = (itemId: string) => {
    if (!session || disabledItems.has(itemId) || pullingItemId || flashingItemId) return;
    
    const timeTakenMs = Date.now() - questionStartTime.current;
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    const currentQuestion = session.questions[questionIndex];
    if (!currentQuestion) return;
    
    const isCorrect = itemId === currentQuestion.correctAnswerId;
    
    let pointsAdded = 0;
    if (isCorrect) {
      pointsAdded = 15;
      if (timeTakenMs && timeTakenMs < 5000) pointsAdded += 5;
      if (difficulty === 'intermediate') pointsAdded = Math.round(pointsAdded * 1.5);
      if (difficulty === 'advanced') pointsAdded = pointsAdded * 2;
      if (difficulty === 'expert') pointsAdded = Math.round(pointsAdded * 3);
    } else {
      if (difficulty === 'intermediate' || difficulty === 'advanced' || difficulty === 'expert') {
        pointsAdded = -5;
      }
    }
    
    const newScore = Math.max(0, score + pointsAdded);
    const newCorrectCount = isCorrect ? correctCount + 1 : correctCount;
    
    const shouldAdvance = isCorrect || difficulty === 'advanced' || difficulty === 'expert';
    const newIndex = shouldAdvance ? questionIndex + 1 : questionIndex;
    
    setScore(newScore);
    setCorrectCount(newCorrectCount);
    
    if (isCorrect) {
      setPullingItemId(itemId);
      setShakeScreen(true);
      setRopePhase('extending');
      setPopoyPulling(true);
      setTimeout(() => setPopoyPulling(false), 600);
      
      const canvas = boardRef.current;
      const width = canvas?.clientWidth || 1000;
      const height = canvas?.clientHeight || 600;

      const itemX_pct = itemCoords[itemId]?.x || 50;
      const itemY_pct = itemCoords[itemId]?.y || 50;
      
      const targetX = (itemX_pct / 100) * width;
      const targetY = (itemY_pct / 100) * height;
      const centerX = width / 2;
      const centerY = 50; // Starting from the center of the minecart instead of top edge

      const dx = targetX - centerX;
      const dy = targetY - centerY;
      
      const targetDistancePx = Math.sqrt(dx * dx + dy * dy);
      const targetAngle = -(Math.atan2(dx, dy) * (180 / Math.PI));

      setTimeout(() => {
        setRopeHeight(targetDistancePx);
        setRopeAngle(targetAngle);
      }, 50);
      
      setTimeout(() => {
        setRopePhase('attached');
        setShowClank(true);
        
        const newParticles = Array.from({ length: 15 }, (_, i) => ({
          id: Date.now() + i,
          x: itemX_pct,
          y: itemY_pct,
          delay: i * 0.05
        }));
        setParticles(newParticles);
        
        setTimeout(() => setShowClank(false), 400);
      }, 600);
      
      setTimeout(() => {
        setRopePhase('retracting');
        setRopeHeight(0);
        setRopeAngle(0);
      }, 800);
      
      setTimeout(() => setShakeScreen(false), 300);
      setTimeout(() => setParticles([]), 2000);
      
      setTimeout(() => {
        setRopePhase('idle');
        setRopeHeight(0);
        setRopeAngle(0);
        setPullingItemId(null);
      }, 1700);
      
      setTimeout(() => {
        if (newIndex < session.questions.length) {
          setQuestionIndex(newIndex);
          initPositions(session.questions[newIndex]);
          if (totalTime) setTimeLeft(totalTime);
        } else {
          endGame();
        }
      }, 1700);

    } else {
      setFlashingItemId(itemId);
      
      if (difficulty === 'advanced' || difficulty === 'expert') {
        setTimeout(() => {
          setFlashingItemId(null);
          if (newIndex < session.questions.length) {
            setQuestionIndex(newIndex);
            initPositions(session.questions[newIndex]);
            if (totalTime) setTimeLeft(totalTime);
          } else {
            endGame();
          }
        }, 800);
      } else {
        setDisabledItems(prev => new Set([...prev, itemId]));
        
        setTimeout(() => {
          setFlashingItemId(null);
          questionStartTime.current += 500;
        }, 500);
      }
    }
  };

  const getTimerColor = () => {
    if (!totalTime || !timeLeft) return '';
    const ratio = timeLeft / totalTime;
    return ratio < 0.25 ? styles.timerWarning : '';
  };

  return (
    <div className={styles.container}>
      {showResumeModal && (
        <ResumeModal
          gameName="Miner Game"
          onResume={handleResume}
          onStartNew={handleStartNew}
          previousScore={savedSession?.score}
          previousProgress={`Question: ${(savedSession?.questionIndex ?? 0) + 1}/10`}
        />
      )}

      <Link href="/games" className={styles.backLink}>
        &larr; Leave Game
      </Link>

      <div className={styles.gameArea}>
        
        {!session && !gameOver && (
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
        )}

        {session && !gameOver && (
          <>
            <div className={styles.uiLayer}>
              <div className={styles.uiBox}>Score: {score}</div>
              <div className={styles.uiBox}>Question: {questionIndex + 1} / 10</div>
            </div>

            {/* Rails - Moved to top level to span 100% of game container */}
            <div className={styles.minecartRails}>
              <div className={styles.rail}></div>
              <div className={styles.rail}></div>
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

                  {/* Minecart - only during gameplay */}
                  <div className={`${styles.minerPopoyContainer} ${popoyPulling ? styles.minerPopoyPulling : styles.minerPopoyIdle}`}>
                    <div className={styles.minecart}>
                      <div className={styles.minecartBody}>
                        <div className={styles.minecartRim}></div>
                      </div>
                      <div className={styles.minecartWheels}>
                        <div className={styles.wheel}></div>
                        <div className={styles.wheel}></div>
                      </div>
                    </div>
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
