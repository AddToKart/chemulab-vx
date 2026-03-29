'use client';

import { useEffect, useRef, useCallback } from 'react';

// Extend Window interface to include webkitAudioContext
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export function useReactionSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (error) {
        console.warn('AudioContext not supported:', error);
      }
    }
  }, []);

  const playReactionSound = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (error) {
        return;
      }
    }

    const ctx = audioContextRef.current;
    
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {
        return;
      });
    }

    try {
      const currentTime = ctx.currentTime;
      
      // Create multiple oscillators for bubbly effect
      for (let i = 0; i < 5; i++) {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        // Random frequency for bubbly sound
        oscillator.frequency.value = 200 + Math.random() * 400;
        oscillator.type = 'sine';
        
        // Stagger start times
        const startTime = currentTime + i * 0.1;
        const duration = 0.3;
        
        gainNode.gain.setValueAtTime(0.05, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      }
      
      // Add a subtle "fizz" sound
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = Math.random() * 2 - 1;
      }
      
      const noise = ctx.createBufferSource();
      const noiseGain = ctx.createGain();
      const noiseFilter = ctx.createBiquadFilter();
      
      noise.buffer = noiseBuffer;
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 1000;
      
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      
      noiseGain.gain.setValueAtTime(0.02, currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.5);
      
      noise.start(currentTime);
      noise.stop(currentTime + 0.5);
      
    } catch (error) {
      console.warn('Error playing reaction sound:', error);
    }
  }, []);

  return { playReactionSound };
}