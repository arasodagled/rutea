'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { createAuthListener, clearLocalStorageOnSignOut } from '@/lib/supabaseAuthUtils';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConnected: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Centralized function to update auth state
  const updateAuthState = useCallback((newSession: Session | null) => {
    setSession(newSession);
    setUser(newSession?.user ?? null);
    setLoading(false);
  }, []);

  // Function to refresh user data
  const refreshUser = useCallback(async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  }, []);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        updateAuthState(initialSession);
      } catch (error) {
        console.error('Error getting initial session:', error);
        setLoading(false);
      }
    };

    getInitialSession();

    // Use the utility function for proper auth state handling
    const { data: { subscription: authSubscription } } = createAuthListener({
      onInitialSession: (session) => {
        updateAuthState(session);
      },
      onSignedIn: (session) => {
        // Handle sign in - this can fire frequently on tab changes
        // Only update if we have a new session or different user
        if (session && (!user || user.id !== session.user.id)) {
          updateAuthState(session);
        }
      },
      onSignedOut: (session) => {
        // Handle sign out - clear local storage and state
        updateAuthState(null);
      },
      onTokenRefreshed: (session) => {
        // Handle token refresh - update session with new tokens
        if (session) {
          updateAuthState(session);
        }
      },
      onUserUpdated: (session) => {
        // Handle user profile updates
        if (session) {
          updateAuthState(session);
        }
      },
      onPasswordRecovery: (session) => {
        // Handle password recovery flow
        updateAuthState(session);
      }
    });

    // Set up local storage cleanup on sign out
    const { data: { subscription: cleanupSubscription } } = clearLocalStorageOnSignOut();

    return () => {
      authSubscription.unsubscribe();
      cleanupSubscription.unsubscribe();
    };
  }, [updateAuthState, user]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // Auth state change will handle the rest
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      // Force cleanup on error
      updateAuthState(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      isConnected: !!session && !!session.access_token, 
      signOut, 
      refreshUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};