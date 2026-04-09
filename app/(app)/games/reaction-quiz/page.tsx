'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { reactionsData } from '@/lib/data/reactions-data';
import styles from './page.module.css';

import { ShareGameScore } from '@/components/game/ShareGameScore';
import { GameTutorial } from '@/components/game/GameTutorial';
import DifficultySelector from '@/components/game/DifficultySelector';
import TimerProgress from '@/components/game/TimerProgress';
import GameRating from '@/components/game/GameRating';
import { gameTutorials } from '@/lib/data/game-tutorials';
import {
  DifficultyLevel,
  reactionQuizDifficulty,
  ReactionQuizSettings,
} from '@/lib/types/game-difficulty';
import { ResumeModal } from '@/components/game/ResumeModal';

interface Question {
  reactants: string;
  reactantsName: string;
  correctAnswer: { formula: string; name: string };
  reactionName: string;
  options: { formula: string; name: string }[];
}

interface SavedSession {
  score: number;
  streak: number;
  lives: number;
  isGameActive: boolean;
  question: Question | null;
  difficulty: DifficultyLevel;
  timeLeft: number;
}

const SESSION_KEY = 'reactionQuizSession';

export default function ReactionQuizPage() {
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [isGameActive, setIsGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [showNext, setShowNext] = useState(false);
  const [showName, setShowName] = useState(false);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('intermediate');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [savedSession, setSavedSession] = useState<SavedSession | null>(null);
  const autoAdvanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* ---------- Session restoration on mount ---------- */
  useEffect(() => {
    const storedSession = sessionStorage.getItem(SESSION_KEY);
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession) as SavedSession;
        if (parsed.isGameActive && !parsed.question?.correctAnswer) {
          sessionStorage.removeItem(SESSION_KEY);
          return;
        }
        if (parsed.isGameActive) {
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
    if (isGameActive && question) {
      const session: SavedSession = {
        score,
        streak,
        lives,
        isGameActive,
        question,
        difficulty,
        timeLeft,
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  }, [score, streak, lives, isGameActive, question, difficulty, timeLeft]);

  /* ---------- Clear session on game over ---------- */
  useEffect(() => {
    if (gameOver) {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [gameOver]);

  /* ---------- Handle resume ---------- */
  const handleResume = useCallback(() => {
    if (savedSession) {
      setScore(savedSession.score);
      setStreak(savedSession.streak);
      setLives(savedSession.lives);
      setQuestion(savedSession.question);
      setDifficulty(savedSession.difficulty);
      setTimeLeft(savedSession.timeLeft);
      setIsGameActive(true);
      setGameOver(false);
      setShowResumeModal(false);
      
      const settings = reactionQuizDifficulty[savedSession.difficulty];
      setShowName(settings.displayMode === 'name');
    }
  }, [savedSession]);

  /* ---------- Handle start new ---------- */
  const handleStartNew = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setShowResumeModal(false);
    setSavedSession(null);
    startGame();
  }, []);

  /* ---------- Clear session on back navigation ---------- */
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isGameActive && question) {
        const session: SavedSession = {
          score,
          streak,
          lives,
          isGameActive,
          question,
          difficulty,
          timeLeft,
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [score, streak, lives, isGameActive, question, difficulty, timeLeft]);

  // Get difficulty settings
  const difficultySettings: ReactionQuizSettings = reactionQuizDifficulty[difficulty];

  // Timer countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    const settings = reactionQuizDifficulty[difficulty];

    if (isGameActive && settings.timePerQuestion && selectedAnswer === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimeLeft(settings.timePerQuestion);
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Time's up - treat as wrong answer (only if no answer selected)
            if (question && selectedAnswer === null) {
              setStreak(0);
              setFeedbackText(`Time's up! The answer was ${showName ? question.correctAnswer.name : question.correctAnswer.formula}`);
              setLives((prevLives) => {
                const newLives = prevLives - 1;
                if (newLives <= 0) {
                  setIsGameActive(false);
                  setGameOver(true);
                  setShowNext(false);
                }
                return newLives;
              });
              setShowNext(true);
              setSelectedAnswer('TIME_UP');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGameActive, difficulty, question, showName, selectedAnswer]);

  const generateQuestion = useCallback((): Question => {
    const settings = reactionQuizDifficulty[difficulty];
    
    // Filter reactions based on difficulty
    const filteredReactions =
      difficulty === 'beginner'
        ? reactionsData.slice(0, 5) // First 5 simple reactions
        : reactionsData;

    const correctReaction =
      filteredReactions[Math.floor(Math.random() * filteredReactions.length)];

    const correctAnswer = { formula: correctReaction.products, name: correctReaction.productsName };

    // Generate distractors based on difficulty
    const distractors: { formula: string; name: string }[] = [];
    const usedValues = new Set<string>([correctAnswer.formula]);

    const numOptions = settings.options - 1; // -1 for correct answer

    while (distractors.length < numOptions) {
      let randomReaction;
      if (difficulty === 'expert') {
        // For expert, pick from similar reactions (same type)
        // Simplified: just pick random but closer in formula length
        randomReaction = filteredReactions[Math.floor(Math.random() * filteredReactions.length)];
      } else {
        randomReaction = filteredReactions[Math.floor(Math.random() * filteredReactions.length)];
      }

      const distractor = { formula: randomReaction.products, name: randomReaction.productsName };

      if (!usedValues.has(distractor.formula)) {
        usedValues.add(distractor.formula);
        distractors.push(distractor);
      }
    }

    // Shuffle options
    const options = [...distractors, correctAnswer];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    return {
      reactants: correctReaction.reactants,
      reactantsName: correctReaction.reactantsName,
      correctAnswer,
      reactionName: correctReaction.name,
      options,
    };
  }, [difficulty]);

  const startGame = useCallback(() => {
    const settings = reactionQuizDifficulty[difficulty];
    setScore(0);
    setStreak(0);
    setLives(settings.lives);
    setIsGameActive(true);
    setGameOver(false);
    setSelectedAnswer(null);
    setFeedbackText('');
    setShowNext(false);
    setQuestion(generateQuestion());
    setShowName(settings.displayMode === 'name');
    setTimeLeft(settings.timePerQuestion || 0);
  }, [generateQuestion, difficulty]);

  const handleAnswer = useCallback(
    (answer: string) => {
      if (!question || selectedAnswer !== null) return;

      setSelectedAnswer(answer);
      setShowNext(true);

      if (answer === question.correctAnswer.formula) {
        // Apply scoring multiplier to all points including streak bonus
        const settings = reactionQuizDifficulty[difficulty];
        const basePoints = 10 + streak * 2;
        const points = Math.round(basePoints * settings.scoringMultiplier);
        setScore((prev) => prev + points);
        setStreak((prev) => prev + 1);
        setFeedbackText(`Correct! +${points} points`);
      } else {
        setStreak(0);
        setFeedbackText(
          `Wrong! The answer was ${showName ? question.correctAnswer.name : question.correctAnswer.formula}`
        );
        setLives((prev) => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            setIsGameActive(false);
            setGameOver(true);
            setShowNext(false);
          }
          return newLives;
        });
      }
    },
    [question, selectedAnswer, streak, showName, difficulty]
  );

  const nextQuestion = useCallback(() => {
    // Clear any pending auto-advance timeout
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
    setSelectedAnswer(null);
    setFeedbackText('');
    setShowNext(false);
    setQuestion(generateQuestion());
    const settings = reactionQuizDifficulty[difficulty];
    if (settings.timePerQuestion) {
      setTimeLeft(settings.timePerQuestion);
    }
  }, [generateQuestion, difficulty]);

  // Auto-advance effect: move to next question after 1 second delay
  useEffect(() => {
    if (showNext && isGameActive && !gameOver) {
      // Clear any existing timeout
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }
      // Auto-advance after 1 second
      autoAdvanceTimeoutRef.current = setTimeout(() => {
        nextQuestion();
      }, 1000);
    }
    return () => {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }
    };
  }, [showNext, isGameActive, gameOver, nextQuestion]);

  const getOptionClass = (option: string): string => {
    if (selectedAnswer === null) return styles.optionBtn;

    if (option === question?.correctAnswer.formula) {
      return `${styles.optionBtn} ${styles.optionBtnCorrect}`;
    }
    if (option === selectedAnswer && option !== question?.correctAnswer.formula) {
      return `${styles.optionBtn} ${styles.optionBtnWrong}`;
    }
    return styles.optionBtn;
  };

  return (
    <div className={styles.container}>
      {showResumeModal && (
        <ResumeModal
          gameName="Reaction Quiz"
          onResume={handleResume}
          onStartNew={handleStartNew}
          previousScore={savedSession?.score}
          previousProgress={`Streak: ${savedSession?.streak} | Lives: ${savedSession?.lives}`}
        />
      )}

      <Link href="/games" className={styles.backLink}>
        &larr; Leave Game
      </Link>

      <div className={styles.gameArea}>
        {!isGameActive && !gameOver && (
          <div className={styles.startScreen}>
            <h1 className={styles.title}>Reaction Quiz</h1>
            <p className={styles.subtitle}>
              Identify the products of chemical reactions and test your
              chemistry knowledge!
            </p>
            <GameTutorial tutorial={gameTutorials.reactionQuiz} accentColor="#8b5cf6" />
            <DifficultySelector
              onSelect={setDifficulty}
              selected={difficulty}
            />
            <button className={styles.startBtn} onClick={startGame}>
              Start Game
            </button>
          </div>
        )}

        {isGameActive && question && (
          <>
            <TimerProgress
              timeLeft={timeLeft}
              totalTime={difficultySettings.timePerQuestion || 0}
              isGameActive={isGameActive}
            />

            <div className={styles.scoreBoard}>
              <span>Score: {score}</span>
              <span>Streak: {streak}</span>
              <span>
                Lives: {'❤️'.repeat(lives)}
                {'🖤'.repeat(difficultySettings.lives - lives)}
              </span>
            </div>

            <div className={styles.questionBox}>
              {difficultySettings.displayMode === 'toggle' && (
                <div className={styles.toggleContainer}>
                  <span className={!showName ? styles.activeToggle : ''}>Formula</span>
                  <button 
                    className={styles.toggleBtn} 
                    onClick={() => setShowName(!showName)}
                    aria-pressed={showName}
                  >
                    <div className={`${styles.toggleKnob} ${showName ? styles.toggleKnobActive : ''}`} />
                  </button>
                  <span className={showName ? styles.activeToggle : ''}>Name</span>
                </div>
              )}
              <p>
                {difficulty === 'expert' 
                  ? 'What are the products of this reaction?'
                  : 'What are the products of this reaction?'}
              </p>
              <p className={styles.reactionEquation}>
                {showName ? `${question.reactantsName} \u2192 ?` : `${question.reactants} \u2192 ?`}
              </p>
            </div>

            <div className={styles.optionsGrid}>
              {question.options.map((option) => (
                <button
                  key={option.formula}
                  className={getOptionClass(option.formula)}
                  onClick={() => handleAnswer(option.formula)}
                  disabled={selectedAnswer !== null}
                >
                  {showName ? option.name : option.formula}
                </button>
              ))}
            </div>

            <div className={styles.feedback}>{feedbackText}</div>


          </>
        )}

        {gameOver && (
          <div className={styles.gameOverScreen}>
            <h2 className={styles.gameOverTitle}>Game Over!</h2>
            <p className={styles.finalScore}>Final Score: {score}</p>
            <div style={{ margin: '1rem 0', display: 'flex', justifyContent: 'center' }}>
              <ShareGameScore score={score} gameName="Reaction Quiz" />
            </div>
            <button className={styles.playAgainBtn} onClick={startGame}>
              Play Again
            </button>
            <GameRating gameId="reaction-quiz" gameName="Reaction Quiz" />
          </div>
        )}
      </div>
    </div>
  );
}
