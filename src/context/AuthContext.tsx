import { createContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  registerWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toAuthFlowError(error: unknown): Error {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/popup-blocked':
        return new Error(
          'Your browser blocked the sign-in popup. Allow pop-ups for this site and try again.',
        );
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return new Error('Sign-in was cancelled.');
      default:
        return new Error(error.message || 'Authentication failed. Please try again.');
    }
  }
  return error instanceof Error ? error : new Error('Authentication failed. Please try again.');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await authService.signInWithGoogle();
    } catch (error) {
      throw toAuthFlowError(error);
    }
  };

  const registerWithGoogle = async () => {
    try {
      await authService.registerWithGoogle();
    } catch (error) {
      throw toAuthFlowError(error);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await authService.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    registerWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { useAuth } from './useAuth';
