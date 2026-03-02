'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { reactionsData } from '@/lib/data/reactions-data';
import styles from './page.module.css';

interface Question {
  reactants: string;
  correctAnswer: string;
  reactionName: string;
  options: string[];
}

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

  const generateQuestion = useCallback((): Question => {
    const correctReaction =
      reactionsData[Math.floor(Math.random() * reactionsData.length)];

    const correctAnswer = correctReaction.products;

    // Generate 3 distractors from other reactions' products
    const distractors: string[] = [];
    const usedValues = new Set<string>([correctAnswer]);

    while (distractors.length < 3) {
      const randomReaction =
        reactionsData[Math.floor(Math.random() * reactionsData.length)];
      const distractor = randomReaction.products;

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
      reactants: correctReaction.reactants,
      correctAnswer,
      reactionName: correctReaction.name,
      options,
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
            <h1 className={styles.title}>Reaction Quiz</h1>
            <p className={styles.subtitle}>
              Identify the products of chemical reactions and test your
              chemistry knowledge!
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
              <p>What are the products of this reaction?</p>
              <p className={styles.reactionEquation}>
                {question.reactants} &rarr; ?
              </p>
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
            <button className={styles.playAgainBtn} onClick={startGame}>
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
