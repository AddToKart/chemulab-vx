'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { logout } from '@/lib/firebase/auth';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useUserProgress } from '@/lib/hooks/use-user-progress';

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
  const { progress } = useUserProgress(user?.uid);
  const progressPct = Math.min(progress.progressPercentage, 100);

  const handleLogout = async () => { await logout(); };

  return (
    <aside
      className={cn(
        'fixed left-3 top-[calc(var(--header-height)+0.75rem)] z-[1200] flex h-[calc(100dvh-var(--header-height)-1.5rem)] flex-col gap-2 overflow-hidden px-3 py-5 sm:left-4 sm:top-[calc(var(--header-height)+1rem)] sm:h-[calc(100dvh-var(--header-height)-2rem)] sm:py-6',
        'border border-border bg-card/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/60',
        'rounded-[28px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
        collapsed ? 'w-20' : 'w-[17rem] xl:w-[18rem]',
        'max-[1023px]:left-3 max-[1023px]:top-3 max-[1023px]:z-[1500] max-[1023px]:h-[calc(100dvh-1.5rem)] max-[1023px]:w-[min(20rem,calc(100vw-1.5rem))] max-[1023px]:rounded-[28px] max-[1023px]:bg-card max-[1023px]:shadow-2xl',
        collapsed && 'max-[1023px]:-translate-x-[calc(100%+1rem)]',
      )}
    >
      {!collapsed && (
        <p className="px-4 pb-1 pt-2 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-muted-foreground opacity-80">
          Menu
        </p>
      )}

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

          const linkContent = (
            <Link
              href={item.href}
              className={cn(
                'relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground no-underline outline-none',
                'transition-all duration-200',
                isActive
                  ? 'bg-primary/10 font-bold text-primary'
                  : 'text-muted-foreground hover:translate-x-1 hover:bg-accent hover:text-accent-foreground',
                collapsed && 'justify-center px-0'
              )}
            >
              {isActive && (
                <span className="absolute bottom-[15%] left-0 top-[15%] w-1 rounded-r-md bg-primary shadow-sm" />
              )}
              <span className="flex h-6 w-6 shrink-0 items-center justify-center">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>
                  {linkContent}
                </TooltipTrigger>
                <TooltipContent side="right" className="ml-2 font-semibold">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.href}>{linkContent}</div>;
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
        {!collapsed && (
          <p className="px-4 pb-1 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-muted-foreground opacity-80">
            Account
          </p>
        )}
        {!loading && profile && (
          <div className={cn(
            'flex rounded-xl border border-border bg-muted/50 p-2',
            collapsed ? 'flex-col items-center gap-3' : 'items-center justify-between'
          )}>
            <Link
              href="/profile"
              className={cn(
                'flex items-center gap-3 text-inherit no-underline transition-opacity hover:opacity-80',
                collapsed && 'w-full justify-center'
              )}
            >
              <div
                className={cn(
                  'relative flex items-center justify-center rounded-full shrink-0',
                  collapsed ? 'h-10 w-10' : 'h-[46px] w-[46px]'
                )}
                style={{ background: `conic-gradient(var(--accent-color) ${progressPct}%, transparent ${progressPct}%)` }}
              >
                <Avatar className={cn('border-2 border-background', collapsed ? 'h-8 w-8' : 'h-10 w-10')}>
                  <AvatarImage src={profile.photoURL || '/img/default-avatar.png'} alt="Profile" className="object-cover" />
                  <AvatarFallback className="bg-background text-xs font-semibold text-foreground">
                    {profile.username?.substring(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
              </div>
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="inline-block max-w-[140px] truncate text-sm leading-tight font-semibold text-foreground">{profile.username}</span>
                  <span className="text-xs font-medium text-primary">
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
                    className="h-10 w-10 rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="ml-2 font-semibold">Logout</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Logout"
                className="rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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
