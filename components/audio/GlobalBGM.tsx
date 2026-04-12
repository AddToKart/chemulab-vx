'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function GlobalBGM() {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const initializedRef = useRef(false);

  // Check if audio should play
  const shouldPlayAudio = () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('chemulab_main_bgm') !== 'true';
  };

  // /games (hub) keeps BGM, /games/* (game pages) auto-mutes
  const isGamePage = pathname !== '/games' && pathname?.startsWith('/games');

  // Initialize audio (runs once)
  useEffect(() => {
    if (typeof window === 'undefined' || initializedRef.current) return;
    initializedRef.current = true;

    audioRef.current = new Audio('/music/main_bgm.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.5;
  }, []);

  // Main logic - handle navigation and mute
  useEffect(() => {
    if (!audioRef.current || typeof window === 'undefined') return;

    const canPlay = !isGamePage && shouldPlayAudio();

    if (canPlay && !isPlayingRef.current) {
      audioRef.current.play()
        .then(() => { isPlayingRef.current = true; })
        .catch(() => {});
    } else if (!canPlay && isPlayingRef.current) {
      audioRef.current.pause();
      isPlayingRef.current = false;
    }
  }, [pathname, isGamePage]);

  // Poll for localStorage changes (sync with TopBar toggle)
  useEffect(() => {
    const syncMute = () => {
      if (!audioRef.current) return;
      
      const shouldBePlaying = !isGamePage && shouldPlayAudio();
      
      if (shouldBePlaying && !isPlayingRef.current) {
        audioRef.current.play()
          .then(() => { isPlayingRef.current = true; })
          .catch(() => {});
      } else if (!shouldBePlaying && isPlayingRef.current) {
        audioRef.current.pause();
        isPlayingRef.current = false;
      }
    };

    // Initial check
    syncMute();

    // Poll every 500ms
    const interval = setInterval(syncMute, 500);
    return () => clearInterval(interval);
  }, [isGamePage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        isPlayingRef.current = false;
      }
    };
  }, []);

  return null;
}