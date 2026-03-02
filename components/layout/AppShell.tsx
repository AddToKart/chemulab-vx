'use client';

import { useState, useEffect, useCallback } from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 900px)').matches;
    const stored = localStorage.getItem('chemulab_sidebar_collapsed');
    if (stored === 'true') setCollapsed(true);
    else if (stored === 'false' && !isMobile) setCollapsed(false);
    else if (isMobile) setCollapsed(true);
    else setCollapsed(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem('chemulab_sidebar_collapsed', String(next)); } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (collapsed) return;
      const isMobile = window.matchMedia('(max-width: 900px)').matches;
      if (!isMobile) return;
      const sidebar = document.querySelector('[data-sidebar]');
      const toggle = document.querySelector('[data-sidebar-toggle]');
      if (sidebar && !sidebar.contains(e.target as Node) && toggle && !toggle.contains(e.target as Node)) {
        setCollapsed(true);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [collapsed]);

  return (
    <div className="w-full min-h-screen overflow-x-hidden relative pt-[calc(64px+2rem)] pb-5">
      <TopBar onToggleSidebar={toggleSidebar} />
      <div data-sidebar>
        <Sidebar collapsed={collapsed} />
      </div>
      <main
        className={[
          'mainContent',
          'mt-4 pb-8 min-h-[calc(100vh-64px-4rem)]',
          'transition-[margin-left] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          collapsed ? 'ml-[100px] max-[900px]:ml-0' : 'ml-[260px] max-[900px]:ml-0',
          'px-4 md:px-6 lg:pr-8',
        ].join(' ')}
      >
        {children}
      </main>
    </div>
  );
}
