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
  updateDoc, 
  deleteDoc, 
  writeBatch, 
  serverTimestamp 
} from 'firebase/firestore';
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
  const user = useAuthStore((s) => s.user);
  const [scrolled, setScrolled] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Listen for friend requests
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'friendRequests'), where('toUid', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((r: any) => !r.acceptedAt));
    });
    return () => unsub();
  }, [user?.uid]);

  // Click outside to close notifications
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

  const handleAccept = async (req: any) => {
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

  const handleDecline = async (req: any) => {
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
            <div className="relative">
              <button
                data-notifications-trigger
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 cursor-pointer relative",
                  isNotificationsOpen 
                    ? "bg-primary text-white shadow-lg scale-105" 
                    : "text-muted-foreground hover:text-primary hover:bg-muted hover:scale-110"
                )}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {requests.length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-background animate-pulse" />
                )}
              </button>

              {/* Dropdown Menu */}
              {isNotificationsOpen && (
                <div 
                  data-notifications-dropdown
                  className="absolute right-0 mt-3 w-80 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden z-[1200] animate-[slideDown_0.2s_ease-out]"
                >
                  <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-bold text-sm">Notifications</h3>
                    {requests.length > 0 && (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                        {requests.length} NEW
                      </span>
                    )}
                  </div>

                  <div className="max-h-[320px] overflow-y-auto">
                    {requests.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                        <div className="p-3 bg-muted rounded-full mb-3 opacity-50">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          </svg>
                        </div>
                        <p className="text-sm text-muted-foreground">All caught up!</p>
                        <p className="text-xs text-muted-foreground mt-1">No new notifications or requests.</p>
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {requests.map((req) => (
                          <div key={req.id} className="p-3 bg-muted/40 hover:bg-muted/80 rounded-xl transition-colors border border-transparent hover:border-border/50">
                            <div className="flex gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 text-blue-500 text-lg">
                                👋
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-foreground leading-tight">
                                  <span className="text-primary">{req.fromUsername}</span>
                                  <span className="font-normal text-muted-foreground"> sent you a friend request.</span>
                                </p>
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() => handleAccept(req)}
                                    className="flex-1 h-8 bg-emerald-500 text-white text-[11px] font-bold rounded-lg hover:bg-emerald-600 transition-colors shadow-sm cursor-pointer"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleDecline(req)}
                                    className="flex-1 h-8 bg-muted text-foreground border border-border text-[11px] font-bold rounded-lg hover:bg-accent transition-colors cursor-pointer"
                                  >
                                    Decline
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Link
                    href="/friends"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="block w-full py-3 bg-muted/50 hover:bg-muted text-center text-xs font-bold text-primary transition-colors border-t border-border no-underline"
                  >
                    View All Friends & Activity
                  </Link>
                </div>
              )}
            </div>
            <Link
              href="/profile"
              className="hidden md:block w-9 h-9 rounded-full overflow-hidden border-2 border-border hover:border-primary hover:scale-105 shadow-sm transition-all duration-200"
            >
              <img src={profile.photoURL || "/img/default-avatar.png"} alt="Profile" className="w-full h-full object-cover" />
            </Link>
          </>
        )}
      </div>
    </header>
  );
}