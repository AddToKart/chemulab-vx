'use client';

import { DifficultyLevel } from '@/lib/types/game-difficulty';
import styles from './difficulty-selector.module.css';

interface DifficultySelectorProps {
  onSelect: (difficulty: DifficultyLevel) => void;
  selected: DifficultyLevel;
  disabled?: boolean;
}

const difficultyConfig = {
  beginner: { emoji: '🌱', label: 'Beginner' },
  intermediate: { emoji: '📘', label: 'Intermediate' },
  advanced: { emoji: '📙', label: 'Advanced' },
  expert: { emoji: '📕', label: 'Expert' },
};

export default function DifficultySelector({
  onSelect,
  selected,
  disabled = false,
}: DifficultySelectorProps) {
  return (
    <div className={styles.difficultySelector}>
      <label htmlFor="difficulty-select" className={styles.label}>
        Select Difficulty:
      </label>
      <select
        id="difficulty-select"
        value={selected}
        onChange={(e) => onSelect(e.target.value as DifficultyLevel)}
        disabled={disabled}
        className={styles.dropdown}
      >
        {(['beginner', 'intermediate', 'advanced', 'expert'] as DifficultyLevel[]).map((level) => (
          <option key={level} value={level}>
            {difficultyConfig[level].emoji} {difficultyConfig[level].label}
          </option>
        ))}
      </select>
    </div>
  );
}
