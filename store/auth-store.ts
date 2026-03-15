import { create } from 'zustand';
import type { User } from 'firebase/auth';

export interface UserProfile {
  uid: string;
  email: string | null;
  username: string;
  isAdmin: boolean;
  emailVerified: boolean;
  photoURL?: string;
  photoSourceURL?: string;
  bio?: string;
  registrationDate?: any;
  createdAt?: any;
}

interface AuthState {
  /** Firebase user object (null when signed out, undefined when loading) */
  user: User | null | undefined;
  /** Enriched profile from Firestore */
  profile: UserProfile | null;
  /** True while we're waiting for the initial auth state */
  loading: boolean;
  /** True while the register() flow is running — suppresses auth-listener side-effects */
  registering: boolean;

  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setRegistering: (registering: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: undefined,
  profile: null,
  loading: true,
  registering: false,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setRegistering: (registering) => set({ registering }),
  reset: () => set({ user: null, profile: null, loading: false }),
}));
