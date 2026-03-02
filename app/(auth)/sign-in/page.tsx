'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { login, register, forgotPassword } from '@/lib/firebase/auth';
import { useAuthStore } from '@/store/auth-store';
import styles from './page.module.css';

type FormMode = 'login' | 'register' | 'forgot';

export default function SignInPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  const [mode, setMode] = useState<FormMode>('login');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');

  // Forgot field
  const [forgotEmail, setForgotEmail] = useState('');

  const registering = useAuthStore((s) => s.registering);

  // If already signed in (and not mid-registration), redirect to home
  useEffect(() => {
    if (!loading && user && !registering) {
      router.replace('/');
    }
  }, [user, loading, registering, router]);

  const clearMessages = useCallback(() => {
    setError('');
    setSuccess('');
  }, []);

  const switchMode = (next: FormMode) => {
    clearMessages();
    setMode(next);
  };

  // ─── Handlers ───

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!loginEmail || !loginPassword) {
      setError('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      await login(loginEmail, loginPassword);
      setSuccess('Login successful! Redirecting...');
      setTimeout(() => router.replace('/'), 500);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!regUsername || !regEmail || !regPassword || !regConfirm) {
      setError('Please fill in all fields');
      return;
    }
    if (regUsername.length < 3 || regUsername.length > 20) {
      setError('Username must be 3–20 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(regUsername)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (regPassword !== regConfirm) {
      setError('Passwords do not match');
      return;
    }

    const username = regUsername.toLowerCase().trim();

    setSubmitting(true);
    try {
      const result = await register(username, regEmail, regPassword);
      if (result.emailSent) {
        setSuccess(result.message);
      } else {
        setSuccess('Account created successfully!');
      }
      // Clear fields on success
      setRegUsername('');
      setRegEmail('');
      setRegPassword('');
      setRegConfirm('');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!forgotEmail) {
      setError('Please enter your email address');
      return;
    }

    setSubmitting(true);
    try {
      await forgotPassword(forgotEmail);
      setSuccess('Password reset email sent! Please check your inbox.');
      setForgotEmail('');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Don't render the form until auth state is resolved
  if (loading) return null;
  if (user) return null; // Will redirect

  return (
    <div className={styles.authPage}>
      {/* Animated background */}
      <div className={styles.background}>
        <div className={`${styles.shape} ${styles.shape1}`} />
        <div className={`${styles.shape} ${styles.shape2}`} />
        <div className={`${styles.shape} ${styles.shape3}`} />

        {/* Floating chemistry emojis */}
        <div className={styles.floatingEmoji} style={{ top: '15%', left: '10%' }}>
          <span className={styles.floatingContent} style={{ fontSize: '4rem', animationDuration: '4s', opacity: 0.6 }}>
            &#129514;
          </span>
        </div>
        <div className={styles.floatingEmoji} style={{ top: '60%', left: '15%' }}>
          <span
            className={styles.floatingContent}
            style={{ fontSize: '3.5rem', animationDuration: '5s', animationDirection: 'reverse', opacity: 0.5 }}
          >
            &#9879;&#65039;
          </span>
        </div>
        <div className={styles.floatingEmoji} style={{ top: '20%', left: '80%' }}>
          <span className={styles.floatingContent} style={{ fontSize: '4.5rem', animationDuration: '6s', opacity: 0.6 }}>
            &#9883;&#65039;
          </span>
        </div>
        <div className={styles.floatingEmoji} style={{ top: '70%', left: '75%' }}>
          <span
            className={styles.floatingContent}
            style={{ fontSize: '3.8rem', animationDuration: '4.5s', animationDirection: 'reverse', opacity: 0.5 }}
          >
            &#129516;
          </span>
        </div>
        <div className={styles.floatingEmoji} style={{ top: '40%', left: '85%' }}>
          <span className={styles.floatingContent} style={{ fontSize: '3rem', animationDuration: '5.5s', opacity: 0.4 }}>
            &#129513;
          </span>
        </div>
      </div>

      {/* Auth container */}
      <div className={styles.centerWrapper}>
        <div className={styles.authContainer}>
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          {/* ─── Login Form ─── */}
          {mode === 'login' && (
            <form className={styles.authForm} onSubmit={handleLogin}>
              <div className={styles.logo}>CheMuLab</div>
              <h2>Sign In</h2>
              <input
                type="text"
                placeholder="Email or Username"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
              <div style={{ textAlign: 'right', marginTop: '-10px' }}>
                <button
                  type="button"
                  className={styles.textLink}
                  onClick={() => switchMode('forgot')}
                >
                  Forgot Password?
                </button>
              </div>
              <button type="submit" className={styles.submitBtn} disabled={submitting}>
                {submitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* ─── Register Form ─── */}
          {mode === 'register' && (
            <form className={styles.authForm} onSubmit={handleRegister}>
              <div className={styles.logo}>CheMuLab</div>
              <h2>Create Account</h2>
              <input
                type="text"
                placeholder="Username (3–20 chars, letters/numbers/_)"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                autoComplete="username"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Confirm Password"
                value={regConfirm}
                onChange={(e) => setRegConfirm(e.target.value)}
                required
              />
              <button type="submit" className={styles.submitBtn} disabled={submitting}>
                {submitting ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}

          {/* ─── Forgot Password Form ─── */}
          {mode === 'forgot' && (
            <form className={styles.authForm} onSubmit={handleForgot}>
              <div className={styles.logo}>CheMuLab</div>
              <h2>Reset Password</h2>
              <p className={styles.small}>
                Enter your email to receive a password reset link.
              </p>
              <input
                type="email"
                placeholder="Email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
              <button type="submit" className={styles.submitBtn} disabled={submitting}>
                {submitting ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button
                type="button"
                className={styles.textLink}
                onClick={() => switchMode('login')}
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* Toggle between login / register */}
          {mode !== 'forgot' && (
            <div className={styles.authToggle}>
              <button
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              >
                {mode === 'login'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
