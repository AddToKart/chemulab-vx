'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useThemeStore } from '@/store/theme-store';
import { useAuthStore } from '@/store/auth-store';
import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { DailyMissionsDialog } from '@/components/daily-missions/daily-missions-dialog';
import { useDailyMissions } from '@/lib/hooks/use-daily-missions';
import { Target, Trophy } from 'lucide-react';

interface TopBarProps {
  onToggleSidebar: () => void;
}

interface FriendRequestNotification {
  id: string;
  fromUid: string;
  fromEmail: string;
  fromUsername?: string;
  chatId: string;
  acceptedAt?: unknown;
}

interface ChatNotification {
  id: string;
  type?: string;
  fromUsername?: string;
  fromPhotoURL?: string;
  message?: string;
  chatId?: string;
  groupId?: string;
  groupName?: string;
}

export default function TopBar({ onToggleSidebar }: TopBarProps) {
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const theme = useThemeStore((s) => s.theme);
  const pathname = usePathname();
  const profile = useAuthStore((s) => s.profile);
  const loading = useAuthStore((s) => s.loading);
  const user = useAuthStore((s) => s.user);
  const [mainBgmMuted, setMainBgmMuted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chemulab_main_bgm') === 'true';
    }
    return false;
  });
  const [scrolled, setScrolled] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [requests, setRequests] = useState<FriendRequestNotification[]>([]);
  const [unreadChats, setUnreadChats] = useState<ChatNotification[]>([]);
  const [isDailyMissionsOpen, setIsDailyMissionsOpen] = useState(false);

  const { completedCount, totalCount } = useDailyMissions(user?.uid);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'friendRequests'), where('toUid', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setRequests(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as FriendRequestNotification)
          .filter((request) => !request.acceptedAt)
      );
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'notifications'),
      where('toUid', '==', user.uid),
    );
    const unsub = onSnapshot(q, (snap) => {
      console.log('[TopBar] Notifications snap:', snap.docs.length, 'docs');
      setUnreadChats(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatNotification));
    }, (err) => {
      console.error('[TopBar] Notifications listener error:', err);
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!isNotificationsOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-notifications-dropdown]') &&
          !(e.target as HTMLElement).closest('[data-notifications-trigger]')) {
        setIsNotificationsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [isNotificationsOpen]);

  const handleDismissNotification = async (notifId: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', notifId));
    } catch (e) {
      console.error('[TopBar] Dismiss notification error:', e);
    }
  };

  const handleAccept = async (req: FriendRequestNotification) => {
    if (!user?.uid || !profile) return;
    try {
      const senderSnap = await getDoc(doc(db, 'users', req.fromUid));
      const senderData = senderSnap.exists() ? senderSnap.data() : {};
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', user.uid, 'friends', req.fromUid), {
        uid: req.fromUid,
        email: req.fromEmail,
        username: senderData.username ?? req.fromUsername ?? req.fromEmail,
        photoURL: senderData.photoURL ?? '',
        chatId: req.chatId,
        createdAt: serverTimestamp(),
      });
      batch.set(doc(db, 'users', req.fromUid, 'friends', user.uid), {
        uid: user.uid,
        email: profile.email || '',
        username: profile.username || '',
        photoURL: profile.photoURL || '',
        chatId: req.chatId,
        createdAt: serverTimestamp(),
      });
      batch.set(doc(db, 'chats', req.chatId), { participants: [user.uid, req.fromUid], createdAt: serverTimestamp() }, { merge: true });
      batch.delete(doc(db, 'friendRequests', req.id));
      await batch.commit();
    } catch (e) {
      console.error('[TopBar] Request Accept Error:', e);
    }
  };

  const handleDecline = async (req: FriendRequestNotification) => {
    try {
      await deleteDoc(doc(db, 'friendRequests', req.id));
    } catch (e) {
      console.error('[TopBar] Request Decline Error:', e);
    }
  };

  const getBreadcrumbs = () => {
    if (pathname === '/') return ['Home'];
    return pathname.split('/').filter(Boolean).map((p) => p.charAt(0).toUpperCase() + p.slice(1));
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <>
      <header
        className={cn(
          'fixed left-3 right-3 top-3 z-[1300] min-h-16 sm:left-4 sm:right-4 sm:top-4',
          'flex flex-nowrap items-center justify-between gap-x-2 gap-y-2 px-3 py-3 sm:px-4 lg:px-6',
          'bg-background/95 text-foreground shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60',
          'border border-border rounded-2xl',
          'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          scrolled && 'border-b shadow-md',
        )}
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <button
            data-sidebar-toggle
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
            className="flex h-9 w-9 shrink-0 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm transition-all duration-200 hover:scale-105 hover:bg-accent hover:text-accent-foreground cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <Link href="/" className="flex min-w-0 items-center gap-2 no-underline transition-transform duration-200 hover:scale-[1.02]">
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
              className="max-[380px]:hidden truncate bg-gradient-to-r from-cyan-500 to-emerald-500 bg-clip-text text-xl font-extrabold tracking-[-0.04em] text-transparent sm:text-2xl"
              style={{ backgroundSize: '200% auto', animation: 'shimmer 4s linear infinite' }}
            >
              CheMuLab
            </span>
          </Link>

          <div className="ml-4 hidden items-center border-l border-border pl-4 text-sm font-medium text-muted-foreground xl:flex">
            {breadcrumbs.map((crumb, idx) => (
              <span key={idx} className="flex items-center">
                {idx > 0 && <span className="mx-2 text-xs opacity-40">/</span>}
                {crumb}
              </span>
            ))}
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
        <button
          onClick={toggleTheme}
          aria-label="Toggle Dark Mode"
          className="relative flex h-9 w-9 shrink-0 sm:h-10 sm:w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:rotate-[15deg] hover:border-primary hover:shadow-md cursor-pointer"
        >
          <span className={cn('absolute text-lg transition-all duration-500', theme === 'light' ? 'rotate-0 scale-100 opacity-100' : 'rotate-180 scale-50 opacity-0')}>
            ☀️
          </span>
          <span className={cn('absolute text-lg transition-all duration-500', theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : 'rotate-180 scale-50 opacity-0')}>
            🌙
          </span>
        </button>

        <button
          onClick={() => {
              const newMuted = !mainBgmMuted;
              setMainBgmMuted(newMuted);
              localStorage.setItem('chemulab_main_bgm', String(newMuted));
            }}
          aria-label={mainBgmMuted ? 'Unmute Music' : 'Mute Music'}
          className="relative flex h-9 w-9 shrink-0 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-all duration-200 hover:scale-105 hover:border-primary hover:shadow-md cursor-pointer"
        >
          {mainBgmMuted ? (
            <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </button>

        <button
          onClick={() => setIsDailyMissionsOpen(true)}
          aria-label="Daily Missions"
          className="relative flex h-9 w-9 shrink-0 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-all duration-200 hover:scale-105 hover:border-primary hover:shadow-md cursor-pointer"
        >
          {completedCount === totalCount && totalCount > 0 ? (
            <Trophy className="h-5 w-5 text-yellow-500" />
          ) : (
            <Target className="h-5 w-5 text-primary" />
          )}
        </button>

        {!loading && profile && (
          <>
            <div className="relative">
              <button
                data-notifications-trigger
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={cn(
                  'relative flex h-9 w-9 shrink-0 sm:h-10 sm:w-10 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer',
                  isNotificationsOpen
                    ? 'scale-105 bg-primary text-white shadow-lg'
                    : 'text-muted-foreground hover:scale-110 hover:bg-muted hover:text-primary'
                )}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {(requests.length > 0 || unreadChats.length > 0) && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full border border-background bg-red-500 animate-pulse" />
                )}
              </button>

              {isNotificationsOpen && (
                <div
                  data-notifications-dropdown
                  className="absolute right-0 mt-3 z-[1400] w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl animate-[slideDown_0.2s_ease-out] sm:w-80"
                >
                  <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <h3 className="text-sm font-bold">Notifications</h3>
                    {(requests.length > 0 || unreadChats.length > 0) && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {requests.length + unreadChats.length} NEW
                      </span>
                    )}
                  </div>

                  <div className="max-h-[320px] overflow-y-auto">
                    {requests.length === 0 && unreadChats.length === 0 ? (
                      <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                        <div className="mb-3 rounded-full bg-muted p-3 opacity-50">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          </svg>
                        </div>
                        <p className="text-sm text-muted-foreground">All caught up!</p>
                        <p className="mt-1 text-xs text-muted-foreground">No new notifications or messages.</p>
                      </div>
                    ) : (
                      <div className="space-y-1 p-2">
                        {requests.map((req) => (
                          <div key={req.id} className="rounded-xl border border-transparent bg-muted/40 p-3 transition-colors hover:border-border/50 hover:bg-muted/80">
                            <div className="flex gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-lg text-blue-500">
                                👋
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold leading-tight text-foreground">
                                  <span className="text-primary">{req.fromUsername}</span>
                                  <span className="font-normal text-muted-foreground"> sent you a friend request.</span>
                                </p>
                                <div className="mt-2 flex gap-2">
                                  <button
                                    onClick={() => handleAccept(req)}
                                    className="h-8 flex-1 rounded-lg bg-emerald-500 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-emerald-600 cursor-pointer"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleDecline(req)}
                                    className="h-8 flex-1 rounded-lg border border-border bg-muted text-[11px] font-bold text-foreground transition-colors hover:bg-accent cursor-pointer"
                                  >
                                    Decline
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        {unreadChats.map((notif) => {
                          const isGroupMessage = notif.type === 'groupMessage' || notif.groupId;
                          const navigateTo = isGroupMessage 
                            ? `/groups?groupId=${notif.groupId}` 
                            : `/friends?chatId=${notif.chatId}`;
                          
                          return (
                            <div
                              key={notif.id}
                              className="rounded-xl border border-transparent bg-muted/40 p-3 transition-colors hover:border-border/50 hover:bg-muted/80"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-green-500/20 bg-green-500/10 text-lg text-green-500">
                                  {isGroupMessage ? '👥' : '💬'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold leading-tight text-foreground">
                                    <span className="text-primary">{notif.fromUsername || 'Someone'}</span>
                                    <span className="font-normal text-muted-foreground">
                                      {isGroupMessage 
                                        ? ` in ${notif.groupName || 'a group'}:` 
                                        : ' sent you a message:'}
                                    </span>
                                  </p>
                                  <p className="mt-1 truncate text-xs italic text-muted-foreground">
                                    &quot;{notif.message}&quot;
                                  </p>
                                </div>
                                <div className="flex shrink-0 gap-1.5">
                                  <Link
                                    href={navigateTo}
                                    onClick={() => {
                                      handleDismissNotification(notif.id);
                                      setIsNotificationsOpen(false);
                                    }}
                                    className="flex h-7 items-center rounded-lg bg-primary/10 px-2.5 text-[10px] font-bold text-primary no-underline transition-colors hover:bg-primary/20 cursor-pointer"
                                  >
                                    View
                                  </Link>
                                  <button
                                    onClick={() => handleDismissNotification(notif.id)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-muted text-xs text-muted-foreground transition-colors hover:bg-accent cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <Link
                    href="/friends"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="block w-full border-t border-border bg-muted/50 py-3 text-center text-xs font-bold text-primary no-underline transition-colors hover:bg-muted"
                  >
                    View All Friends & Activity
                  </Link>
                </div>
              )}
            </div>
            <Link
              href="/profile"
              className="hidden h-9 w-9 shrink-0 sm:h-10 sm:w-10 overflow-hidden rounded-full border-2 border-border shadow-sm transition-all duration-200 hover:scale-105 hover:border-primary md:block"
            >
              <img src={profile.photoURL || '/img/default-avatar.png'} alt="Profile" className="h-full w-full object-cover" />
            </Link>
          </>
        )}
      </div>
      </header>

      <DailyMissionsDialog open={isDailyMissionsOpen} onOpenChange={setIsDailyMissionsOpen} />
    </>
  );
}
