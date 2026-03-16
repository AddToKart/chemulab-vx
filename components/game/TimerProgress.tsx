'use client';

import { useEffect } from 'react';
import styles from './timer-progress.module.css';
import { useTickingSound } from '@/lib/hooks/use-ticking-sound';

interface TimerProgressProps {
  timeLeft: number;
  totalTime: number;
  isGameActive: boolean;
}

export default function TimerProgress({
  timeLeft,
  totalTime,
  isGameActive,
}: TimerProgressProps) {
  // Initialize ticking sound hook
  useTickingSound(timeLeft, isGameActive);
  // Don't show timer if there's no time limit
  if (!totalTime) return null;

  const percentage = (timeLeft / totalTime) * 100;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // Determine color based on time remaining
  const getColorClass = () => {
    if (percentage > 60) return styles.green;
    if (percentage > 30) return styles.yellow;
    return styles.red;
  };

  return (
    <div className={styles.timerContainer}>
      <div className={styles.timerInfo}>
        <span className={styles.timeText}>{timeString}</span>
        <span className={styles.timeLabel}>Time Remaining</span>
      </div>
      <div className={styles.progressBarContainer}>
        <div
          className={`${styles.progressBar} ${getColorClass()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
