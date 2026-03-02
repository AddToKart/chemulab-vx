'use client';

import { useState, useEffect, useCallback } from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import styles from './AppShell.module.css';

/**
 * Client-side shell that wraps all pages.
 * Manages sidebar collapsed state, responsive behaviour, and outside-click-to-close.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(true); // default collapsed

  // Hydrate from localStorage + responsive check
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 900px)').matches;
    const stored = localStorage.getItem('chemulab_sidebar_collapsed');

    if (stored === 'true') {
      setCollapsed(true);
    } else if (stored === 'false' && !isMobile) {
      setCollapsed(false);
    } else if (isMobile) {
      setCollapsed(true);
    } else {
      setCollapsed(false);
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('chemulab_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (collapsed) return;
      const isMobile = window.matchMedia('(max-width: 900px)').matches;
      if (!isMobile) return;

      const sidebar = document.querySelector('[data-sidebar]');
      const toggle = document.querySelector('[data-sidebar-toggle]');
      if (
        sidebar &&
        !sidebar.contains(e.target as Node) &&
        toggle &&
        !toggle.contains(e.target as Node)
      ) {
        setCollapsed(true);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [collapsed]);

  return (
    <div className={`${styles.appContainer} ${collapsed ? styles.sidebarCollapsed : ''}`}>
      <TopBar onToggleSidebar={toggleSidebar} />
      <div data-sidebar>
        <Sidebar collapsed={collapsed} />
      </div>
      <main className={styles.mainContent}>{children}</main>
    </div>
  );
}
