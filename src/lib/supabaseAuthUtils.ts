import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';

/**
 * Utility functions for handling Supabase auth events according to best practices
 * Based on: https://supabase.com/docs/reference/javascript/auth-onauthstatechange
 */

export interface AuthEventHandlers {
  onInitialSession?: (session: Session | null) => void;
  onSignedIn?: (session: Session | null) => void;
  onSignedOut?: (session: Session | null) => void;
  onTokenRefreshed?: (session: Session | null) => void;
  onUserUpdated?: (session: Session | null) => void;
  onPasswordRecovery?: (session: Session | null) => void;
}

/**
 * Creates a properly configured auth state change listener
 * Following Supabase documentation recommendations for tab changes and performance
 */
export function createAuthListener(handlers: AuthEventHandlers) {
  // Debounce refs to prevent excessive calls
  const lastEventTime = new Map<string, number>();
  const debounceTimeout = 100; // 100ms debounce for rapid events
  
  return supabase.auth.onAuthStateChange((event, session) => {
    const now = Date.now();
    const lastTime = lastEventTime.get(event) || 0;
    
    // Debounce rapid events (especially SIGNED_IN on tab changes)
    if (now - lastTime < debounceTimeout) {
      return;
    }
    
    lastEventTime.set(event, now);
    
    console.log('Auth state change:', event, session?.user?.id);
    
    switch (event) {
      case 'INITIAL_SESSION':
        handlers.onInitialSession?.(session);
        break;
        
      case 'SIGNED_IN':
        // This event can fire very frequently on tab changes
        // Only process if we have a meaningful change
        handlers.onSignedIn?.(session);
        break;
        
      case 'SIGNED_OUT':
        handlers.onSignedOut?.(session);
        break;
        
      case 'TOKEN_REFRESHED':
        // Extract and store access token for further use
        if (session?.access_token) {
          // Store token in memory for immediate access
          // Avoid frequent calls to getSession()
          handlers.onTokenRefreshed?.(session);
        }
        break;
        
      case 'USER_UPDATED':
        handlers.onUserUpdated?.(session);
        break;
        
      case 'PASSWORD_RECOVERY':
        handlers.onPasswordRecovery?.(session);
        break;
        
      default:
        // Handle any other events
        break;
    }
  });
}

/**
 * Utility to handle OAuth provider tokens on sign in
 * Following Supabase documentation pattern
 */
export function handleOAuthTokens() {
  return supabase.auth.onAuthStateChange((event, session) => {
    if (session?.provider_token) {
      window.localStorage.setItem('oauth_provider_token', session.provider_token);
    }

    if (session?.provider_refresh_token) {
      window.localStorage.setItem('oauth_provider_refresh_token', session.provider_refresh_token);
    }

    if (event === 'SIGNED_OUT') {
      window.localStorage.removeItem('oauth_provider_token');
      window.localStorage.removeItem('oauth_provider_refresh_token');
    }
  });
}

/**
 * Utility to clear local storage on sign out
 * Following Supabase documentation recommendations
 */
export function clearLocalStorageOnSignOut() {
  return supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      // Clear local and session storage
      [window.localStorage, window.sessionStorage].forEach((storage) => {
        Object.entries(storage).forEach(([key]) => {
          // Only clear app-specific keys, not Supabase internal keys
          if (!key.startsWith('sb-') && !key.startsWith('supabase.')) {
            storage.removeItem(key);
          }
        });
      });
    }
  });
}

/**
 * Utility to handle token refresh events
 * Following Supabase documentation for storing access tokens
 */
export function handleTokenRefresh(onTokenRefresh?: (token: string) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED' && session?.access_token) {
      // Store the new access token for immediate use
      // This prevents frequent calls to getSession()
      onTokenRefresh?.(session.access_token);
    }
  });
}

/**
 * Utility to check if user session is valid
 * Use this instead of frequent getSession() calls
 */
export async function isSessionValid(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session && !!session.access_token;
  } catch (error) {
    console.error('Error checking session validity:', error);
    return false;
  }
}

/**
 * Utility to get current user without triggering auth state changes
 * Use this for read-only user data access
 */
export async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}
