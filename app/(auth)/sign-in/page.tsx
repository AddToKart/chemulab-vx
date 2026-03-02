'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { login, register, forgotPassword } from '@/lib/firebase/auth';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type FormMode = 'login' | 'register' | 'forgot';

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

  const registering = useAuthStore((s) => s.registering);

  useEffect(() => {
    if (!loading && user && !registering) router.replace('/');
  }, [user, loading, registering, router]);

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
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
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
    try {
      const result = await register(regUsername.toLowerCase().trim(), regEmail, regPassword);
      setSuccess(result.emailSent ? result.message : 'Account created successfully!');
      setRegUsername(''); setRegEmail(''); setRegPassword(''); setRegConfirm('');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
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
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
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
        <div key={i} className="absolute z-[1] pointer-events-none" style={{ top: f.top, left: f.left }}>
          <span
            className="flex items-center justify-center"
            style={{ fontSize: f.size, opacity: f.op, animation: `emojiFloat ${f.dur} ease-in-out infinite${f.reverse ? ' reverse' : ''}` }}
          >
            {f.emoji}
          </span>
        </div>
      ))}

      {/* Auth card */}
      <div className="relative z-[2] flex items-center justify-center min-h-screen p-5">
        <div className="w-full max-w-[440px] bg-[var(--bg-card)] backdrop-blur-[40px] border border-[var(--glass-border)] rounded-[32px] p-10 shadow-2xl text-[var(--text-main)] animate-[slideUp_0.6s_cubic-bezier(0.175,0.885,0.32,1.275)] relative overflow-hidden">
          {/* Top shimmer line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Alerts */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-[10px] text-center font-medium text-[#ffcccc] bg-red-600/40 border border-red-200/20 backdrop-blur-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 px-4 py-3 rounded-[10px] text-center font-medium text-green-100 bg-green-600/40 border border-green-200/20 backdrop-blur-sm">
              {success}
            </div>
          )}

          {/* Logo */}
          <div className="text-center mb-2">
            <span className="text-[2.5rem] font-extrabold tracking-[-0.03em] bg-gradient-to-br from-white to-indigo-300 bg-clip-text text-transparent">
              CheMuLab
            </span>
          </div>

          {/* ─── Login Form ─── */}
          {mode === 'login' && (
            <form className="flex flex-col gap-4" onSubmit={handleLogin}>
              <h2 className="text-center text-2xl font-bold tracking-[-0.01em] mb-1">Sign In</h2>
              <Input
                type="text"
                placeholder="Email or Username"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="h-12 px-5 bg-black/10 border-[var(--border-color)] text-[var(--text-main)] placeholder:text-[var(--text-light)] focus-visible:ring-[var(--accent-color)] focus-visible:border-[var(--accent-color)] rounded-[12px]"
              />
              <Input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="h-12 px-5 bg-black/10 border-[var(--border-color)] text-[var(--text-main)] placeholder:text-[var(--text-light)] focus-visible:ring-[var(--accent-color)] focus-visible:border-[var(--accent-color)] rounded-[12px]"
              />
              <div className="text-right -mt-1">
                <button type="button" onClick={() => switchMode('forgot')} className="text-sm text-white/70 hover:text-white hover:underline bg-transparent border-none cursor-pointer p-0 transition-colors">
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
              {[
                { type: 'text', placeholder: 'Username (3–20 chars, letters/numbers/_)', value: regUsername, onChange: setRegUsername, autoComplete: 'username' },
                { type: 'email', placeholder: 'Email', value: regEmail, onChange: setRegEmail },
                { type: 'password', placeholder: 'Password', value: regPassword, onChange: setRegPassword },
                { type: 'password', placeholder: 'Confirm Password', value: regConfirm, onChange: setRegConfirm },
              ].map((field, i) => (
                <Input
                  key={i}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  autoComplete={field.autoComplete}
                  required
                  className="h-12 px-5 bg-black/10 border-[var(--border-color)] text-[var(--text-main)] placeholder:text-[var(--text-light)] focus-visible:ring-[var(--accent-color)] focus-visible:border-[var(--accent-color)] rounded-[12px]"
                />
              ))}
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
              <p className="text-center text-sm text-white/70">Enter your email to receive a password reset link.</p>
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
              <button type="button" onClick={() => switchMode('login')} className="text-sm text-white/70 hover:text-white hover:underline bg-transparent border-none cursor-pointer transition-colors self-center">
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
                {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}