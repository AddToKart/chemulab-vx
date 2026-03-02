'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useThemeStore } from '@/store/theme-store';
import { useAuthStore } from '@/store/auth-store';
import styles from './TopBar.module.css';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export default function TopBar({ onToggleSidebar }: TopBarProps) {
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const theme = useThemeStore((s) => s.theme);
  const pathname = usePathname();
  const profile = useAuthStore((s) => s.profile);
  const loading = useAuthStore((s) => s.loading);

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Simple breadcrumb generator
  const getBreadcrumbs = () => {
    if (pathname === '/') return ['Home'];
    const parts = pathname.split('/').filter(Boolean);
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1));
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className={`${styles.topBar} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.headerLeft}>
        <button
          className={styles.sidebarToggle}
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <Link href="/" className={styles.logoGroup}>
          <div className={styles.logoIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#chemGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id="chemGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--color-flask-blue)" />
                  <stop offset="100%" stopColor="var(--color-accent)" />
                </linearGradient>
              </defs>
              <path d="M10 2v7.31"></path>
              <path d="M14 9.3V1.99"></path>
              <path d="M8.5 2h7"></path>
              <path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path>
              <path d="M5.52 16h12.96"></path>
            </svg>
          </div>
          <span className={styles.logo}>CheMuLab</span>
        </Link>

        <div className={styles.breadcrumbs}>
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx} className={styles.breadcrumbItem}>
              {idx > 0 && <span className={styles.separator}>/</span>}
              {crumb}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.headerRight}>
        <button
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-label="Toggle Dark Mode"
        >
          <span className={`${styles.toggleIcon} ${theme === 'light' ? styles.visible : styles.hidden}`}>
            &#9728;&#65039;
          </span>
          <span className={`${styles.toggleIcon} ${theme === 'dark' ? styles.visible : styles.hidden}`}>
            &#127769;
          </span>
        </button>

        {!loading && profile && (
          <>
            <Link href="/friends" className={styles.iconButton}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </Link>
            <Link href="/profile" className={styles.miniAvatar}>
              <img src="/img/default-avatar.png" alt="Profile" />
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
