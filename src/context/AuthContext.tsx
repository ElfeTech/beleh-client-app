import { createContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { authService } from '../services/authService';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    registerWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
            setLoading(true);
            const result = await authService.signInWithGoogle();
            // Set user immediately so navigation to workspace sees user (avoids redirect to /signin)
            setUser(result.user);
        } catch (error) {
            // Don't log error if user just cancelled the popup
            if (error instanceof Error && error.message === 'POPUP_CLOSED') {
                throw error;
            }
            console.error('Error signing in:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const registerWithGoogle = async () => {
        try {
            setLoading(true);
            const result = await authService.registerWithGoogle();
            // Set user immediately so navigation to workspace sees user (avoids redirect to /signin)
            setUser(result.user);
        } catch (error) {
            // Don't log error if user just cancelled the popup
            if (error instanceof Error && error.message === 'POPUP_CLOSED') {
                throw error;
            }
            console.error('Error registering:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        try {
            setLoading(true);
            await authService.signOut();
            setUser(null);
        } catch (error) {
            console.error('Error signing out:', error);
            setUser(null);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const value = {
        user,
        loading,
        signInWithGoogle,
        registerWithGoogle,
        signOut
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export { useAuth } from './useAuth';


