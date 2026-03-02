'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useThemeStore } from '@/store/theme-store';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';

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
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getBreadcrumbs = () => {
    if (pathname === '/') return ['Home'];
    return pathname.split('/').filter(Boolean).map((p) => p.charAt(0).toUpperCase() + p.slice(1));
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header
      className={cn(
        'fixed top-4 left-4 right-4 z-[1100] h-16',
        'flex items-center justify-between px-6',
        'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        'border border-border rounded-2xl',
        'shadow-sm text-foreground',
        'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
        scrolled && 'shadow-md border-b',
      )}
    >
      {/* Left */}
      <div className="flex items-center gap-4">
        <button
          data-sidebar-toggle
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className="flex items-center justify-center w-9 h-9 rounded-xl border border-border bg-card text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground hover:scale-105 transition-all duration-200 cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <Link href="/" className="flex items-center gap-2 no-underline hover:scale-[1.02] transition-transform duration-200">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#chemGradientTB)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="chemGradientTB" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00D4FF" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <path d="M10 2v7.31" /><path d="M14 9.3V1.99" /><path d="M8.5 2h7" />
            <path d="M14 9.3a6.5 6.5 0 1 1-4 0" /><path d="M5.52 16h12.96" />
          </svg>
          <span
            className="text-2xl font-extrabold tracking-[-0.04em] bg-gradient-to-r from-cyan-500 to-emerald-500 bg-clip-text text-transparent"
            style={{ backgroundSize: '200% auto', animation: 'shimmer 4s linear infinite' }}
          >
            CheMuLab
          </span>
        </Link>

        {/* Breadcrumbs (md+) */}
        <div className="hidden md:flex items-center ml-4 pl-4 border-l border-border text-sm text-muted-foreground font-medium">
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx} className="flex items-center">
              {idx > 0 && <span className="opacity-40 mx-2 text-xs">/</span>}
              {crumb}
            </span>
          ))}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          aria-label="Toggle Dark Mode"
          className="relative w-10 h-10 rounded-full border border-border bg-card shadow-sm flex items-center justify-center cursor-pointer overflow-hidden hover:-translate-y-0.5 hover:rotate-[15deg] hover:shadow-md hover:border-primary transition-all duration-300"
        >
          <span className={cn('absolute text-lg transition-all duration-500', theme === 'light' ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 rotate-180')}>
            ☀️
          </span>
          <span className={cn('absolute text-lg transition-all duration-500', theme === 'dark' ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 rotate-180')}>
            🌙
          </span>
        </button>

        {!loading && profile && (
          <>
            <Link
              href="/friends"
              className="flex items-center justify-center p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted hover:scale-110 transition-all duration-200"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </Link>
            <Link
              href="/profile"
              className="w-9 h-9 rounded-full overflow-hidden border-2 border-border hover:border-primary hover:scale-105 shadow-sm transition-all duration-200"
            >
              <img src="/img/default-avatar.png" alt="Profile" className="w-full h-full object-cover" />
            </Link>
          </>
        )}
      </div>
    </header>
  );
}