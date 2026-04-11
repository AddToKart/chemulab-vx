'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { login, register, forgotPassword } from '@/lib/firebase/auth';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type FormMode = 'login' | 'register' | 'forgot';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function SignInPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  const [mode, setMode] = useState<FormMode>('login');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [showVerificationOverlay, setShowVerificationOverlay] = useState(false);
  const [overlayMessage, setOverlayMessage] = useState('');
  const [overlayCountdown, setOverlayCountdown] = useState(5);
  const overlayTimerRef = useRef<number | null>(null);

  const registering = useAuthStore((s) => s.registering);

  useEffect(() => {
    if (!loading && user && !registering) router.replace('/');
  }, [user, loading, registering, router]);

  useEffect(() => {
    if (!showVerificationOverlay) {
      if (overlayTimerRef.current !== null) {
        clearInterval(overlayTimerRef.current);
        overlayTimerRef.current = null;
      }
      setOverlayCountdown(5);
      return;
    }

    setOverlayCountdown(5);
    if (overlayTimerRef.current !== null) {
      clearInterval(overlayTimerRef.current);
    }

    overlayTimerRef.current = window.setInterval(() => {
      setOverlayCountdown((prev) => {
        if (prev <= 1) {
          if (overlayTimerRef.current !== null) {
            clearInterval(overlayTimerRef.current);
            overlayTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (overlayTimerRef.current !== null) {
        clearInterval(overlayTimerRef.current);
        overlayTimerRef.current = null;
      }
    };
  }, [showVerificationOverlay]);

  const redirectToLogin = () => {
    if (overlayTimerRef.current !== null) {
      clearInterval(overlayTimerRef.current);
      overlayTimerRef.current = null;
    }
    if (typeof window !== 'undefined') {
      window.location.assign('/sign-in');
    }
  };

  const clearMessages = useCallback(() => { setError(''); setSuccess(''); }, []);
  const switchMode = (next: FormMode) => { clearMessages(); setMode(next); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!loginEmail || !loginPassword) { setError('Please fill in all fields'); return; }
    setSubmitting(true);
    try {
      await login(loginEmail, loginPassword);
      setSuccess('Login successful! Redirecting...');
      setTimeout(() => router.replace('/'), 500);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Login failed. Please try again.'));
    } finally { setSubmitting(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!regUsername || !regEmail || !regPassword || !regConfirm) { setError('Please fill in all fields'); return; }
    if (regUsername.length < 3 || regUsername.length > 20) { setError('Username must be 3–20 characters'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(regUsername)) { setError('Username can only contain letters, numbers, and underscores'); return; }
    if (regPassword.length < 6) { setError('Password must be at least 6 characters long'); return; }
    if (regPassword !== regConfirm) { setError('Passwords do not match'); return; }
    setSubmitting(true);
    setShowVerificationOverlay(false);
    setOverlayMessage('');
    setOverlayCountdown(5);
    try {
      const result = await register(regUsername.trim(), regEmail, regPassword);
      setRegUsername(''); setRegEmail(''); setRegPassword(''); setRegConfirm('');
      setOverlayMessage(result.message);
      setShowVerificationOverlay(true);
      setSuccess('');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Registration failed. Please try again.'));
    } finally { setSubmitting(false); }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!forgotEmail) { setError('Please enter your email address'); return; }
    setSubmitting(true);
    try {
      await forgotPassword(forgotEmail);
      setSuccess('Password reset email sent! Please check your inbox.');
      setForgotEmail('');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to send reset email. Please try again.'));
    } finally { setSubmitting(false); }
  };

  if (loading || user) return null;

  return (
    <div className="relative min-h-screen overflow-hidden font-[var(--font-heading)] text-white">
      {/* Animated background blobs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" style={{ background: 'var(--bg-main)' }}>
        <div className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-[#8e2de2] opacity-60 blur-[50px] animate-[authFloat_20s_infinite_alternate] [animation-delay:-5s]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40vw] h-[40vw] rounded-[40%] bg-[#4a00e0] opacity-60 blur-[50px] animate-[authFloat_20s_infinite_alternate] [animation-delay:-2s]" />
        <div className="absolute bottom-[20%] left-[20%] w-[20vw] h-[20vw] rounded-[45%] bg-[#00b09b] opacity-60 blur-[50px] animate-[authFloat_25s_infinite_alternate]" />
      </div>

      {/* Floating chemistry emojis */}
      {[
        { top: '15%', left: '10%', emoji: '🧪', size: '4rem', dur: '4s', op: 0.6 },
        { top: '60%', left: '15%', emoji: '⚗️', size: '3.5rem', dur: '5s', op: 0.5, reverse: true },
        { top: '20%', left: '80%', emoji: '☁️', size: '4.5rem', dur: '6s', op: 0.6 },
        { top: '70%', left: '75%', emoji: '🧫', size: '3.8rem', dur: '4.5s', op: 0.5, reverse: true },
        { top: '40%', left: '85%', emoji: '🧬', size: '3rem', dur: '5.5s', op: 0.4 },
      ].map((f, i) => (
        <div key={i} className="absolute z-[1] hidden pointer-events-none sm:block" style={{ top: f.top, left: f.left }}>
          <span
            className="flex items-center justify-center"
            style={{ fontSize: f.size, opacity: f.op, animation: `emojiFloat ${f.dur} ease-in-out infinite${f.reverse ? ' reverse' : ''}` }}
          >
            {f.emoji}
          </span>
        </div>
      ))}

      {/* Auth card */}
      <div className="relative z-[2] flex min-h-screen items-center justify-center p-4 sm:p-5">
        <div className="relative w-full max-w-[440px] overflow-hidden rounded-[32px] border border-[var(--glass-border)] bg-[var(--bg-card)] p-6 text-[var(--text-main)] shadow-2xl animate-[slideUp_0.6s_cubic-bezier(0.175,0.885,0.32,1.275)] backdrop-blur-[40px] sm:p-8 lg:p-10">
          {/* Top shimmer line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Alerts */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-[10px] text-center font-medium text-[#ffcccc] bg-red-600/40 border border-red-200/20 backdrop-blur-sm">
              {error}
            </div>
          )}
          {success && !showVerificationOverlay && (
            <div className="mb-4 px-4 py-3 rounded-[10px] text-center font-medium text-green-100 bg-green-600/40 border border-green-200/20 backdrop-blur-sm">
              {success}
            </div>
          )}

          {/* Logo */}
          <div className="text-center mb-2">
            <span className="text-[2.5rem] font-extrabold tracking-[-0.03em] bg-gradient-to-br from-indigo-600 via-indigo-500 to-indigo-300 dark:from-white dark:to-indigo-300 bg-clip-text text-transparent">
              CheMuLab
            </span>
          </div>

          {/* ─── Login Form ─── */}
          {mode === 'login' && (
            <form className="flex flex-col gap-4" onSubmit={handleLogin}>
              <h2 className="text-center text-2xl font-bold tracking-[-0.01em] mb-1">Log In</h2>
              <Input
                type="text"
                placeholder="Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="h-12 px-5 bg-black/10 border-[var(--border-color)] text-[var(--text-main)] placeholder:text-[var(--text-light)] focus-visible:ring-[var(--accent-color)] focus-visible:border-[var(--accent-color)] rounded-[12px]"
              />
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="h-12 px-5 bg-black/10 border-[var(--border-color)] text-[var(--text-main)] placeholder:text-[var(--text-light)] focus-visible:ring-[var(--accent-color)] focus-visible:border-[var(--accent-color)] rounded-[12px] pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-light)] hover:text-white transition-colors cursor-pointer bg-transparent border-none p-1"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="text-right -mt-1">
                <button type="button" onClick={() => switchMode('forgot')} className="text-sm text-[var(--text-light)] hover:text-[var(--text-main)] dark:text-white/70 dark:hover:text-white hover:underline bg-transparent border-none cursor-pointer p-0 transition-colors">
                  Forgot Password?
                </button>
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="h-12 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 hover:brightness-110 text-white font-bold text-base uppercase tracking-[0.05em] shadow-[var(--shadow-md),var(--glow-accent)] hover:-translate-y-0.5 hover:scale-[1.02] transition-all duration-300 relative overflow-hidden mt-1"
              >
                {submitting ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>
          )}

          {/* ─── Register Form ─── */}
          {mode === 'register' && (
            <form className="flex flex-col gap-4" onSubmit={handleRegister}>
              <h2 className="text-center text-2xl font-bold tracking-[-0.01em] mb-1">Create Account</h2>
              <Input
                type="text"
                placeholder="Username (3–20 chars, letters/numbers/_)"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                autoComplete="username"
                required
                className="h-12 px-5 bg-black/10 border-[var(--border-color)] text-[var(--text-main)] placeholder:text-[var(--text-light)] focus-visible:ring-[var(--accent-color)] focus-visible:border-[var(--accent-color)] rounded-[12px]"
              />
              <Input
                type="email"
                placeholder="Email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
                className="h-12 px-5 bg-black/10 border-[var(--border-color)] text-[var(--text-main)] placeholder:text-[var(--text-light)] focus-visible:ring-[var(--accent-color)] focus-visible:border-[var(--accent-color)] rounded-[12px]"
              />
              <div className="relative">
                <Input
                  type={showRegPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  className="h-12 px-5 bg-black/10 border-[var(--border-color)] text-[var(--text-main)] placeholder:text-[var(--text-light)] focus-visible:ring-[var(--accent-color)] focus-visible:border-[var(--accent-color)] rounded-[12px] pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-light)] hover:text-white transition-colors cursor-pointer bg-transparent border-none p-1"
                >
                  {showRegPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showRegConfirm ? 'text' : 'password'}
                  placeholder="Confirm Password"
                  value={regConfirm}
                  onChange={(e) => setRegConfirm(e.target.value)}
                  required
                  className="h-12 px-5 bg-black/10 border-[var(--border-color)] text-[var(--text-main)] placeholder:text-[var(--text-light)] focus-visible:ring-[var(--accent-color)] focus-visible:border-[var(--accent-color)] rounded-[12px] pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowRegConfirm(!showRegConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-light)] hover:text-white transition-colors cursor-pointer bg-transparent border-none p-1"
                >
                  {showRegConfirm ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  )}
                </button>
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="h-12 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 hover:brightness-110 text-white font-bold text-base uppercase tracking-[0.05em] shadow-[var(--shadow-md),var(--glow-accent)] hover:-translate-y-0.5 hover:scale-[1.02] transition-all duration-300 mt-1"
              >
                {submitting ? 'Creating account…' : 'Create Account'}
              </Button>
            </form>
          )}

          {/* ─── Forgot Password Form ─── */}
          {mode === 'forgot' && (
            <form className="flex flex-col gap-4" onSubmit={handleForgot}>
              <h2 className="text-center text-2xl font-bold tracking-[-0.01em] mb-1">Reset Password</h2>
              <p className="text-center text-sm text-[var(--text-light)] dark:text-white/70">Enter your email to receive a password reset link.</p>
              <Input
                type="email"
                placeholder="Email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                className="h-12 px-5 bg-black/10 border-[var(--border-color)] text-[var(--text-main)] placeholder:text-[var(--text-light)] focus-visible:ring-[var(--accent-color)] focus-visible:border-[var(--accent-color)] rounded-[12px]"
              />
              <Button
                type="submit"
                disabled={submitting}
                className="h-12 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 hover:brightness-110 text-white font-bold text-base uppercase tracking-[0.05em] shadow-[var(--shadow-md),var(--glow-accent)] hover:-translate-y-0.5 hover:scale-[1.02] transition-all duration-300"
              >
                {submitting ? 'Sending…' : 'Send Reset Link'}
              </Button>
              <button type="button" onClick={() => switchMode('login')} className="text-sm text-[var(--text-light)] hover:text-[var(--text-main)] dark:text-white/70 dark:hover:text-white hover:underline bg-transparent border-none cursor-pointer transition-colors self-center">
                Back to Sign In
              </button>
            </form>
          )}

          {/* Toggle */}
          {mode !== 'forgot' && (
            <div className="mt-6 pt-5 text-center text-[0.95rem] border-t border-[var(--glass-border)]">
              <button
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                className="bg-transparent border-none text-[var(--text-main)] font-bold cursor-pointer px-4 py-2 rounded-full hover:bg-[var(--bg-item-active)] hover:text-[var(--accent-color)] hover:-translate-y-0.5 transition-all duration-200"
              >
                {mode === 'login' ? "Don't have an account? Create One!" : 'Already have an account? Sign in'}
              </button>
            </div>
          )}
        </div>
      </div>
      {showVerificationOverlay && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 px-4 py-8 text-white">
          <div className="w-full max-w-xl rounded-[28px] border border-white/20 bg-gradient-to-b from-slate-900/95 to-slate-900/70 p-8 text-center shadow-[0_0_40px_rgba(0,0,0,0.6)]">
            <p className="text-sm font-semibold uppercase tracking-[0.4em] text-cyan-400/90">Account created</p>
            <p className="mt-4 text-lg font-semibold leading-relaxed text-slate-100">{overlayMessage}</p>
            <p className="mt-3 text-sm text-white/70">
              Redirect ready in {overlayCountdown} second{overlayCountdown === 1 ? '' : 's'}.
            </p>
            <button
              type="button"
              disabled={overlayCountdown > 0}
              onClick={redirectToLogin}
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-base font-bold uppercase tracking-[0.08em] text-slate-900 shadow-[var(--shadow-md),var(--glow-accent)] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {overlayCountdown > 0 ? 'Please wait…' : 'Go to Sign In'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
