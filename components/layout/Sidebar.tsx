'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { logout } from '@/lib/firebase/auth';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { href: '/', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>, label: 'Home' },
  { href: '/lab', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.31"></path><path d="M14 9.3V1.99"></path><path d="M8.5 2h7"></path><path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path><path d="M5.52 16h12.96"></path></svg>, label: 'Your Lab' },
  { href: '/friends', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>, label: 'Friends' },
  { href: '/elements', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="9" x2="9" y2="21"></line><line x1="15" y1="9" x2="15" y2="21"></line></svg>, label: 'Elements' },
  { href: '/games', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="12" x2="10" y2="12"></line><line x1="8" y1="10" x2="8" y2="14"></line><line x1="15" y1="13" x2="15.01" y2="13"></line><line x1="18" y1="11" x2="18.01" y2="11"></line><rect x="2" y="6" width="20" height="12" rx="2"></rect></svg>, label: 'Games' },
  { href: '/progress', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>, label: 'Progress' },
  { href: '/about', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>, label: 'About' },
];

export default function Sidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const profile = useAuthStore((s) => s.profile);
  const loading = useAuthStore((s) => s.loading);
  const user = useAuthStore((s) => s.user);
  const [progressPct, setProgressPct] = useState(0);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'progress', user.uid)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        const discs = data.discoveries || [];
        setProgressPct(Math.min((discs.length / 118) * 100, 100));
      }
    });
  }, [user]);

  const handleLogout = async () => { await logout(); };

  return (
    <aside
      className={cn(
        'fixed left-4 z-[1000] flex flex-col gap-2 py-6 px-3',
        'bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 border border-border',
        'rounded-3xl shadow-lg',
        'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
        'top-[calc(var(--header-height)+2rem)] h-[calc(100vh-var(--header-height)-3rem)]',
        collapsed ? 'w-20' : 'w-60',
        // mobile: full height slide-in overlay
        'max-[900px]:top-0 max-[900px]:left-0 max-[900px]:h-screen max-[900px]:rounded-[0_32px_32px_0] max-[900px]:z-[1200] max-[900px]:bg-card',
        collapsed && 'max-[900px]:-translate-x-full',
      )}
    >
      {/* Menu label */}
      {!collapsed && (
        <p className="px-4 pt-2 pb-1 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-muted-foreground opacity-80">
          Menu
        </p>
      )}

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

          const linkContent = (
            <Link
              href={item.href}
              className={cn(
                'relative flex items-center gap-3 px-4 py-3 rounded-xl no-underline outline-none',
                'text-foreground font-medium text-sm',
                'transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'hover:bg-accent text-muted-foreground hover:text-accent-foreground hover:translate-x-1',
                collapsed && 'px-0 justify-center'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-[15%] bottom-[15%] w-1 rounded-r-md bg-primary shadow-sm" />
              )}
              <span className="w-6 h-6 flex items-center justify-center shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>
                  {linkContent}
                </TooltipTrigger>
                <TooltipContent side="right" className="font-semibold ml-2">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <div key={item.href}>{linkContent}</div>
          );
        })}
      </nav>

      {/* Footer / Profile */}
      <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-border">
        {!collapsed && (
          <p className="px-4 pb-1 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-muted-foreground opacity-80">
            Account
          </p>
        )}
        {!loading && profile && (
          <div className={cn(
            "flex p-2 bg-muted/50 border border-border rounded-xl",
            collapsed ? "flex-col items-center gap-3" : "items-center justify-between"
          )}>
            <Link
              href="/profile"
              className={cn(
                "flex items-center gap-3 no-underline text-inherit hover:opacity-80 transition-opacity",
                collapsed && "w-full justify-center"
              )}
            >
              {/* Avatar with progress ring */}
              <div
                className={cn(
                  "rounded-full flex items-center justify-center relative shrink-0",
                  collapsed ? "w-10 h-10" : "w-[46px] h-[46px]"
                )}
                style={{ background: `conic-gradient(var(--accent-color) ${progressPct}%, transparent ${progressPct}%)` }}
              >
                <Avatar className={cn("border-2 border-background", collapsed ? "w-8 h-8" : "w-10 h-10")}>
                  <AvatarImage src="/img/default-avatar.png" alt="Profile" className="object-cover" />
                  <AvatarFallback className="bg-background text-foreground text-xs font-semibold">
                    {profile.username?.substring(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
              </div>
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground text-sm leading-tight inline-block max-w-[100px] truncate">{profile.username}</span>
                  <span className="text-xs text-primary font-medium">
                    {profile.emailVerified ? 'Verified' : 'Explorer'}
                  </span>
                </div>
              )}
            </Link>

            {collapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="w-10 h-10 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-semibold ml-2">Logout</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Logout"
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors rounded-lg"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </Button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}