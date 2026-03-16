'use client';

import { useEffect, useRef, useCallback } from 'react';

export function useTickingSound(timeLeft: number, isGameActive: boolean) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio context immediately (not on user interaction)
  useEffect(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn('AudioContext not supported:', error);
      }
    }
  }, []);

  const getFrequency = (time: number): number => {
    if (time <= 5) return 1200; // Very fast beep
    if (time <= 10) return 1000; // Fast beep
    if (time <= 15) return 800; // Medium beep
    return 600; // Slow beep (shouldn't happen since we only tick when <=15)
  };

  const playTick = useCallback(() => {
    if (!audioContextRef.current) {
      // Try to initialize if not already
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        return; // Audio not supported
      }
    }

    const ctx = audioContextRef.current;
    
    // Resume audio context if suspended (required by browsers)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {
        // Ignore resume errors
        return;
      });
    }

    try {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Frequency increases as time decreases
      oscillator.frequency.value = getFrequency(timeLeft);
      oscillator.type = 'sine';

      // Short beep duration
      const beepDuration = 0.1;
      const currentTime = ctx.currentTime;
      
      gainNode.gain.setValueAtTime(0.1, currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + beepDuration);

      oscillator.start(currentTime);
      oscillator.stop(currentTime + beepDuration);
    } catch (error) {
      console.warn('Error playing ticking sound:', error);
    }
  }, [timeLeft]);

  useEffect(() => {
    if (!isGameActive) return;

    const shouldTick = timeLeft <= 15 && timeLeft > 0;

    if (shouldTick) {
      // Start ticking if not already running
      if (!intervalRef.current) {
        // Play immediately and then every second
        playTick();
        intervalRef.current = setInterval(() => {
          playTick();
        }, 1000);
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
        intervalRef.current = null;
      }
    };
  }, [timeLeft, isGameActive, playTick]);

  return { playTick };
}
