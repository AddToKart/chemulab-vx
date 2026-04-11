'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import TopBar from './TopBar';
import Sidebar from './Sidebar';

const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);

    const syncLayout = (matchesDesktop: boolean) => {
      setIsDesktop(matchesDesktop);

      const stored = localStorage.getItem('chemulab_sidebar_collapsed');
      if (!matchesDesktop) {
        setCollapsed(true);
        return;
      }

      if (stored === 'true') {
        setCollapsed(true);
        return;
      }

      if (stored === 'false') {
        setCollapsed(false);
        return;
      }

      setCollapsed(false);
    };

    syncLayout(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncLayout(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      if (isDesktop) {
        try {
          localStorage.setItem('chemulab_sidebar_collapsed', String(next));
        } catch {}
      }
      return next;
    });
  }, [isDesktop]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (collapsed || isDesktop) return;
      const sidebar = document.querySelector('[data-sidebar]');
      const toggle = document.querySelector('[data-sidebar-toggle]');
      if (sidebar && !sidebar.contains(e.target as Node) && toggle && !toggle.contains(e.target as Node)) {
        setCollapsed(true);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [collapsed, isDesktop]);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden pb-6 pt-20 sm:pt-24 lg:pt-[calc(var(--header-height)+1.5rem)]">
      <TopBar onToggleSidebar={toggleSidebar} />
      {!collapsed && !isDesktop && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-[1150] bg-slate-950/35 backdrop-blur-[2px] lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}
      <div data-sidebar>
        <Sidebar collapsed={collapsed} />
      </div>
      <main
        style={{
          '--sidebar-offset': collapsed ? '6rem' : '17rem',
        } as React.CSSProperties}
        className={[
          'mainContent',
          'relative z-10 mx-auto mt-4 min-h-[calc(100dvh-var(--header-height)-2.5rem)] w-full lg:w-[calc(100%-var(--sidebar-offset))] max-w-[var(--content-max-width)] pb-8',
          'px-4 sm:px-5 lg:px-8 xl:px-10',
          'transition-[margin-left,padding,width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          'lg:ml-[var(--sidebar-offset)]',
        ].join(' ')}
      >
        <div className={cn('mx-auto w-full max-w-[1440px] min-w-0')}>{children}</div>
      </main>
    </div>
  );
}
