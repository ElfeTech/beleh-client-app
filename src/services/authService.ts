import {
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import { auth, getGoogleProvider } from '../lib/firebase';
import { apiClient } from './apiClient';
import { apiCacheManager } from '../utils/apiCacheManager';
import { clearAllSelectedDatasetStorage } from '../lib/selectedDatasourceStorage';
import { SESSION_CLEAR_LOCALSTORAGE_KEYS } from '../constants/clientStorageKeys';

const TOKEN_KEY = 'firebase_auth_token';
const USER_KEY = 'firebase_user';
const BACKEND_USER_KEY = 'backend_user';

/** Set before Google sign-up so first-run demo can run after auth. */
export const GOOGLE_SIGNUP_FLOW_KEY = 'beleh_google_is_signup';

export type GoogleAuthIntent = 'signin' | 'register';

/**
 * Invariants:
 * - Firebase `auth.currentUser` is the source of truth for signed-in identity.
 * - `TOKEN_KEY`, `USER_KEY`, `BACKEND_USER_KEY` mirror the latest ID token and snapshots for API use and reloads.
 * - `clearSessionLocal` must be safe to call multiple times and from `finally` blocks.
 */

export async function establishSession(
  user: User,
  options?: { forceRefreshToken?: boolean; backendIntent?: GoogleAuthIntent }
): Promise<void> {
  const force = options?.forceRefreshToken ?? false;
  const token = await user.getIdToken(force);
  persistAuthToken(token);
  persistUserData(user);

  if (!options?.backendIntent) {
    return;
  }

  try {
    if (options.backendIntent === 'register') {
      const backendUser = await apiClient.registerUser(token);
      persistBackendUser(backendUser);
    } else {
      const backendUser = await apiClient.loginUser(token);
      persistBackendUser(backendUser);
    }
  } catch (backendError) {
    console.error('[Auth] Backend login/register failed:', backendError);
    try {
      await firebaseSignOut(auth);
    } catch {
      /* ignore */
    }
    clearSessionLocal();
    throw backendError;
  }
}

export async function completeGoogleSignIn(intent: GoogleAuthIntent): Promise<void> {
  const provider = getGoogleProvider();
  const cred = await signInWithPopup(auth, provider);
  await establishSession(cred.user, { forceRefreshToken: false, backendIntent: intent });
}

function persistAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function persistUserData(user: User): void {
  const userData = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
  localStorage.setItem(USER_KEY, JSON.stringify(userData));
}

function persistBackendUser(user: unknown): void {
  localStorage.setItem(BACKEND_USER_KEY, JSON.stringify(user));
}

export function clearSessionLocal(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(BACKEND_USER_KEY);
  localStorage.removeItem(GOOGLE_SIGNUP_FLOW_KEY);
  SESSION_CLEAR_LOCALSTORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  clearAllSelectedDatasetStorage();
  apiCacheManager.clearAll();
}

async function getValidIdTokenInternal(forceRefresh: boolean): Promise<string | null> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }
    const token = await user.getIdToken(forceRefresh);
    persistAuthToken(token);
    return token;
  } catch (error) {
    console.error('Error getting ID token:', error);
    return null;
  }
}

export const authService = {
  async signInWithGoogle(): Promise<void> {
    await completeGoogleSignIn('signin');
  },

  async registerWithGoogle(): Promise<void> {
    try {
      localStorage.setItem(GOOGLE_SIGNUP_FLOW_KEY, '1');
    } catch {
      /* storage full / disabled */
    }
    await completeGoogleSignIn('register');
  },

  completeGoogleSignIn,
  establishSession,

  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      clearSessionLocal();
    }
  },

  storeAuthToken(token: string): void {
    persistAuthToken(token);
  },

  getAuthToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  storeUserData(user: User): void {
    persistUserData(user);
  },

  getUserData(): User | null {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  },

  storeBackendUser(user: unknown): void {
    persistBackendUser(user);
  },

  getBackendUser(): unknown {
    const userData = localStorage.getItem(BACKEND_USER_KEY);
    return userData ? JSON.parse(userData) : null;
  },

  clearAuthData(): void {
    clearSessionLocal();
  },

  async getValidIdToken(forceRefresh = false): Promise<string | null> {
    return getValidIdTokenInternal(forceRefresh);
  },

  async refreshToken(): Promise<string | null> {
    return getValidIdTokenInternal(true);
  },

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        await establishSession(user, { forceRefreshToken: true });
        apiCacheManager.clearAll();
      } else {
        clearSessionLocal();
      }
      callback(user);
    });
  },

  getCurrentUser(): User | null {
    return auth.currentUser;
  },
};
