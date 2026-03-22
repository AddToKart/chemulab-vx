'use client';

import { useState, useEffect } from 'react';

export function useIdle(delay: number) {
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const setupTimeout = () => {
      timeoutId = setTimeout(() => setIsIdle(true), delay);
    };

    const handleActivity = () => {
      setIsIdle(false);
      clearTimeout(timeoutId);
      setupTimeout();
    };

    // Events to track user activity
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

    setupTimeout();

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [delay]);

  return isIdle;
}
