import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
  type UserCredential
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { apiClient } from './apiClient';
import { apiCacheManager } from '../utils/apiCacheManager';

const TOKEN_KEY = 'firebase_auth_token';
const USER_KEY = 'firebase_user';
const BACKEND_USER_KEY = 'backend_user';

// User-specific localStorage keys to clear on sign out (so new account doesn't see old data)
const SESSION_STORAGE_KEYS = [
  'activeWorkspaceId',
  'activeSessionId',
  'beleh_has_completed_demo',
  'beleh_is_new_user',
];

export const authService = {
  async signInWithGoogle(): Promise<UserCredential> {
    try {
      const result = await signInWithPopup(auth, googleProvider);

      const token = await result.user.getIdToken();

      this.storeAuthToken(token);
      this.storeUserData(result.user);

      // Register/login user with backend
      try {
        const backendUser = await apiClient.loginUser(token);
        this.storeBackendUser(backendUser);
      } catch (backendError) {
        console.error('[Auth] Backend login failed:', backendError);
        // Continue with Firebase auth even if backend fails
        // You can choose to throw here if backend is critical
      }


      return result;
    } catch (error: unknown) {
      // Handle popup closed by user - this is not an error, just user cancellation
      if (error instanceof Error && error.message.includes('auth/popup-closed-by-user')) {
        throw new Error('POPUP_CLOSED');
      }

      // Handle popup blocked by browser
      if (error instanceof Error && error.message.includes('auth/popup-blocked')) {
        console.error('[Auth] Popup was blocked by browser');
        throw new Error('POPUP_BLOCKED');
      }

      console.error('[Auth] Error signing in with Google:', error);
      throw error;
    }
  },

  async registerWithGoogle(): Promise<UserCredential> {
    try {
      const result = await signInWithPopup(auth, googleProvider);

      const token = await result.user.getIdToken();

      this.storeAuthToken(token);
      this.storeUserData(result.user);

      // Register user with backend
      try {
        const backendUser = await apiClient.registerUser(token);
        this.storeBackendUser(backendUser);
      } catch (backendError) {
        console.error('[Auth] Backend registration failed:', backendError);
        // Continue with Firebase auth even if backend fails
      }


      return result;
    } catch (error: unknown) {
      // Handle popup closed by user
      if (error instanceof Error && error.message.includes('auth/popup-closed-by-user')) {
        throw new Error('POPUP_CLOSED');
      }

      // Handle popup blocked by browser
      if (error instanceof Error && error.message.includes('auth/popup-blocked')) {
        console.error('[Auth] Popup was blocked by browser');
        throw new Error('POPUP_BLOCKED');
      }

      console.error('[Auth] Error signing up with Google:', error);
      throw error;
    }
  },

  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
      this.clearAuthData();
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  storeAuthToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  getAuthToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  storeUserData(user: User): void {
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  },

  getUserData(): User | null {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  },

  storeBackendUser(user: unknown): void {
    localStorage.setItem(BACKEND_USER_KEY, JSON.stringify(user));
  },

  getBackendUser(): unknown {
    const userData = localStorage.getItem(BACKEND_USER_KEY);
    return userData ? JSON.parse(userData) : null;
  },

  clearAuthData(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(BACKEND_USER_KEY);
    SESSION_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    apiCacheManager.clearAll();
  },

  async refreshToken(): Promise<string | null> {
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken(true);
        this.storeAuthToken(token);
        return token;
      }
      return null;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  },

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        this.storeAuthToken(token);
        this.storeUserData(user);
      } else {
        this.clearAuthData();
      }
      callback(user);
    });
  },

  getCurrentUser(): User | null {
    return auth.currentUser;
  }
};
