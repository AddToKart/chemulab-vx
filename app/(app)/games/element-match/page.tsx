'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { elementsData } from '@/lib/data/elements-data';
import styles from './page.module.css';

import { ShareGameScore } from '@/components/game/ShareGameScore';
import DifficultySelector from '@/components/game/DifficultySelector';
import TimerProgress from '@/components/game/TimerProgress';
import {
  DifficultyLevel,
  elementMatchDifficulty,
  ElementMatchSettings,
} from '@/lib/types/game-difficulty';

type QuestionType = 'symbol-to-name' | 'name-to-symbol' | 'atomic-number' | 'category';

interface Question {
  questionText: string;
  highlightText: string;
  correctAnswer: string;
  options: string[];
  type: QuestionType;
}

export default function ElementMatchPage() {
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [isGameActive, setIsGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [showNext, setShowNext] = useState(false);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('intermediate');
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Get difficulty settings
  const difficultySettings: ElementMatchSettings = elementMatchDifficulty[difficulty];

  // Timer countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    const settings = elementMatchDifficulty[difficulty];

    if (isGameActive && settings.timePerQuestion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimeLeft(settings.timePerQuestion);
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Time's up - treat as wrong answer
            if (question) {
              setStreak(0);
              setFeedbackText(`Time's up! The answer was ${question.correctAnswer}`);
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
  }, [isGameActive, difficulty, question]);

  const generateQuestion = useCallback((): Question => {
    // Get current difficulty settings
    const settings = elementMatchDifficulty[difficulty];
    
    // Filter elements based on difficulty
    const filteredElements = elementsData.filter(
      (el) => el.atomic_number <= settings.maxAtomicNumber
    );

    const correctElement =
      filteredElements[Math.floor(Math.random() * filteredElements.length)];

    // Select question type based on difficulty settings
    const questionTypes = settings.questionTypes;
    const questionType: QuestionType =
      questionTypes[Math.floor(Math.random() * questionTypes.length)];

    let correctAnswer: string;
    let highlightText: string;
    let questionText: string;

    switch (questionType) {
      case 'symbol-to-name':
        correctAnswer = correctElement.name;
        highlightText = correctElement.symbol;
        questionText = 'What element has the symbol';
        break;
      case 'name-to-symbol':
        correctAnswer = correctElement.symbol;
        highlightText = correctElement.name;
        questionText = 'What is the symbol for';
        break;
      case 'atomic-number':
        correctAnswer = correctElement.name;
        highlightText = correctElement.atomic_number.toString();
        questionText = 'What element has atomic number';
        break;
      case 'category':
        correctAnswer = correctElement.name;
        highlightText = correctElement.category;
        questionText = 'What element belongs to the category';
        break;
    }

    // Generate distractors based on difficulty
    const distractors: string[] = [];
    const usedValues = new Set<string>([correctAnswer]);

    const numOptions = difficultySettings.options - 1; // -1 for correct answer

    while (distractors.length < numOptions) {
      let distractor: string;
      const correctIdx = filteredElements.indexOf(correctElement);

      // Higher chance of similar elements for harder difficulties
      const neighborChance = difficulty === 'expert' ? 0.9 : difficulty === 'advanced' ? 0.85 : 0.8;

      if (Math.random() < neighborChance) {
        // Pick neighbor within ±5 atomic number (tighter range for expert)
        const range = difficulty === 'expert' ? 3 : 5;
        const offset = Math.floor(Math.random() * (range * 2 + 1)) - range;
        const neighborIdx = Math.max(
          0,
          Math.min(filteredElements.length - 1, correctIdx + offset)
        );
        const neighbor = filteredElements[neighborIdx];

        switch (questionType) {
          case 'symbol-to-name':
            distractor = neighbor.name;
            break;
          case 'name-to-symbol':
            distractor = neighbor.symbol;
            break;
          case 'atomic-number':
            distractor = neighbor.name;
            break;
          case 'category':
            distractor = neighbor.name;
            break;
        }
      } else {
        // Random element
        const randomEl =
          filteredElements[Math.floor(Math.random() * filteredElements.length)];
        switch (questionType) {
          case 'symbol-to-name':
            distractor = randomEl.name;
            break;
          case 'name-to-symbol':
            distractor = randomEl.symbol;
            break;
          case 'atomic-number':
            distractor = randomEl.name;
            break;
          case 'category':
            distractor = randomEl.name;
            break;
        }
      }

      if (!usedValues.has(distractor)) {
        usedValues.add(distractor);
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
      questionText,
      highlightText,
      correctAnswer,
      options,
      type: questionType,
    };
  }, [difficulty]);

  const startGame = useCallback(() => {
    const settings = elementMatchDifficulty[difficulty];
    setScore(0);
    setStreak(0);
    setLives(settings.lives);
    setIsGameActive(true);
    setGameOver(false);
    setSelectedAnswer(null);
    setFeedbackText('');
    setShowNext(false);
    setQuestion(generateQuestion());
    setTimeLeft(settings.timePerQuestion || 0);
  }, [generateQuestion, difficulty]);

  const handleAnswer = useCallback(
    (answer: string) => {
      if (!question || selectedAnswer !== null) return;

      setSelectedAnswer(answer);
      setShowNext(true);

      if (answer === question.correctAnswer) {
        // Apply scoring multiplier to all points including streak bonus
        const settings = elementMatchDifficulty[difficulty];
        const basePoints = 10 + streak * 2;
        const points = Math.round(basePoints * settings.scoringMultiplier);
        setScore((prev) => prev + points);
        setStreak((prev) => prev + 1);
        setFeedbackText(`Correct! +${points} points`);
      } else {
        setStreak(0);
        setFeedbackText(
          `Wrong! The answer was ${question.correctAnswer}`
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
    [question, selectedAnswer, streak, difficulty]
  );

  const nextQuestion = useCallback(() => {
    setSelectedAnswer(null);
    setFeedbackText('');
    setShowNext(false);
    setQuestion(generateQuestion());
    const settings = elementMatchDifficulty[difficulty];
    if (settings.timePerQuestion) {
      setTimeLeft(settings.timePerQuestion);
    }
  }, [generateQuestion, difficulty]);

  const getOptionClass = (option: string): string => {
    if (selectedAnswer === null) return styles.optionBtn;

    if (option === question?.correctAnswer) {
      return `${styles.optionBtn} ${styles.optionBtnCorrect}`;
    }
    if (option === selectedAnswer && option !== question?.correctAnswer) {
      return `${styles.optionBtn} ${styles.optionBtnWrong}`;
    }
    return styles.optionBtn;
  };

  return (
    <div className={styles.container}>
      <Link href="/games" className={styles.backLink}>
        &larr; Back to Games
      </Link>

      <div className={styles.gameArea}>
        {!isGameActive && !gameOver && (
          <div className={styles.startScreen}>
            <h1 className={styles.title}>Element Match</h1>
            <p className={styles.subtitle}>
              Match element symbols to their names and test your chemistry
              knowledge!
            </p>
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
              <span>{question.questionText} </span>
              <span className={styles.highlight}>
                {question.highlightText}
              </span>
              <span>?</span>
            </div>

            <div className={styles.optionsGrid}>
              {question.options.map((option) => (
                <button
                  key={option}
                  className={getOptionClass(option)}
                  onClick={() => handleAnswer(option)}
                  disabled={selectedAnswer !== null}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className={styles.feedback}>{feedbackText}</div>

            {showNext && (
              <button className={styles.nextBtn} onClick={nextQuestion}>
                Next Question
              </button>
            )}
          </>
        )}

        {gameOver && (
          <div className={styles.gameOverScreen}>
            <h2 className={styles.gameOverTitle}>Game Over!</h2>
            <p className={styles.finalScore}>Final Score: {score}</p>
            <div style={{ margin: '1rem 0', display: 'flex', justifyContent: 'center' }}>
              <ShareGameScore score={score} gameName="Element Match" />
            </div>
            <button className={styles.startBtn} onClick={startGame}>
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
