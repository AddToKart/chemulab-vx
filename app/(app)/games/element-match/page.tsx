'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { elementsData } from '@/lib/data/elements-data';
import styles from './page.module.css';

type QuestionType = 'symbol-to-name' | 'name-to-symbol';

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

  const generateQuestion = useCallback((): Question => {
    const correctElement =
      elementsData[Math.floor(Math.random() * elementsData.length)];
    const questionType: QuestionType =
      Math.random() < 0.5 ? 'symbol-to-name' : 'name-to-symbol';

    const correctAnswer =
      questionType === 'symbol-to-name'
        ? correctElement.name
        : correctElement.symbol;
    const highlightText =
      questionType === 'symbol-to-name'
        ? correctElement.symbol
        : correctElement.name;
    const questionText =
      questionType === 'symbol-to-name'
        ? 'What element has the symbol'
        : 'What is the symbol for';

    // Generate 3 distractors
    const distractors: string[] = [];
    const usedValues = new Set<string>([correctAnswer]);

    while (distractors.length < 3) {
      let distractor: string;
      const correctIdx = elementsData.indexOf(correctElement);

      if (Math.random() < 0.8) {
        // 80% chance: pick neighbor within ±5 atomic number
        const offset = Math.floor(Math.random() * 11) - 5; // -5 to +5
        const neighborIdx = Math.max(
          0,
          Math.min(elementsData.length - 1, correctIdx + offset)
        );
        const neighbor = elementsData[neighborIdx];
        distractor =
          questionType === 'symbol-to-name' ? neighbor.name : neighbor.symbol;
      } else {
        // 20% chance: random element
        const randomEl =
          elementsData[Math.floor(Math.random() * elementsData.length)];
        distractor =
          questionType === 'symbol-to-name' ? randomEl.name : randomEl.symbol;
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
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setStreak(0);
    setLives(3);
    setIsGameActive(true);
    setGameOver(false);
    setSelectedAnswer(null);
    setFeedbackText('');
    setShowNext(false);
    setQuestion(generateQuestion());
  }, [generateQuestion]);

  const handleAnswer = useCallback(
    (answer: string) => {
      if (!question || selectedAnswer !== null) return;

      setSelectedAnswer(answer);
      setShowNext(true);

      if (answer === question.correctAnswer) {
        const points = 10 + streak * 2;
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
    [question, selectedAnswer, streak]
  );

  const nextQuestion = useCallback(() => {
    setSelectedAnswer(null);
    setFeedbackText('');
    setShowNext(false);
    setQuestion(generateQuestion());
  }, [generateQuestion]);

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
            <button className={styles.startBtn} onClick={startGame}>
              Start Game
            </button>
          </div>
        )}

        {isGameActive && question && (
          <>
            <div className={styles.scoreBoard}>
              <span>Score: {score}</span>
              <span>Streak: {streak}</span>
              <span>
                Lives: {'❤️'.repeat(lives)}
                {'🖤'.repeat(3 - lives)}
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
            <button className={styles.startBtn} onClick={startGame}>
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
