'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export function useTickingSound(timeLeft: number, isGameActive: boolean) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize audio context on first user interaction
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (!isInitialized) {
        setIsInitialized(true);
      }
    };

    // Initialize on first click/touch
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });

    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
  }, [isInitialized]);

  const getFrequency = (time: number): number => {
    if (time <= 5) return 1200; // Very fast beep
    if (time <= 10) return 1000; // Fast beep
    if (time <= 15) return 800; // Medium beep
    return 600; // Slow beep (shouldn't happen since we only tick when <=15)
  };

  const playTick = useCallback(() => {
    if (!audioContextRef.current) return;

    try {
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Frequency increases as time decreases
      oscillator.frequency.value = getFrequency(timeLeft);
      oscillator.type = 'sine';

      // Short beep duration
      const beepDuration = 0.1;
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + beepDuration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + beepDuration);
    } catch (error) {
      console.warn('Error playing ticking sound:', error);
    }
  }, [timeLeft]);

  useEffect(() => {
    if (!isGameActive || !isInitialized) return;

    const shouldTick = timeLeft <= 15 && timeLeft > 0;

    if (shouldTick) {
      // Start ticking if not already running
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          playTick();
        }, 1000); // Tick every second
      }
    } else {
      // Stop ticking
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timeLeft, isGameActive, isInitialized, playTick]);

  return { playTick };
}
