import { useEffect, useRef, useCallback, useState } from 'react';
import { requestRegistry } from '@/lib/requestRegistry';
import { useAuth } from '@/contexts/AuthContext';

export type AppLifecycleState = 'active' | 'hidden' | 'paused' | 'resuming';

interface UseAppLifecycleOptions {
  onTabHide?: () => void;
  onTabShow?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  enableAutoResubscribe?: boolean;
  pauseTimeoutMs?: number;
  debounceMs?: number;
  enableAuthSync?: boolean; // New option for Supabase auth sync
}

interface AppLifecycleAPI {
  state: AppLifecycleState;
  isTabVisible: boolean;
  isPaused: boolean;
  pause: () => void;
  resume: () => void;
  resubscribe: () => void;
  registerCleanup: (cleanup: () => void) => () => void;
}

export function useAppLifecycle(options: UseAppLifecycleOptions = {}): AppLifecycleAPI {
  const {
    onTabHide,
    onTabShow,
    onPause,
    onResume,
    enableAutoResubscribe = true,
    pauseTimeoutMs = 60000, // Increased to 60 seconds
    debounceMs = 500, // Add debouncing
    enableAuthSync = true // Enable Supabase auth sync by default
  } = options;

  const { refreshUser } = useAuth();
  const [state, setState] = useState<AppLifecycleState>('active');
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  
  const cleanupFunctions = useRef<Set<() => void>>(new Set());
  const pauseTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const resubscribeCallbacks = useRef<Set<() => void>>(new Set());
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastVisibilityChange = useRef<number>(Date.now());
  const lastAuthRefreshRef = useRef<number>(0);

  const runCleanups = useCallback(() => {
    cleanupFunctions.current.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.warn('Cleanup function failed:', error);
      }
    });
    cleanupFunctions.current.clear();
  }, []);

  const pause = useCallback(() => {
    if (isPaused) return;
    
    setState('paused');
    setIsPaused(true);
    
    // Only cancel non-critical requests, keep important ones alive
    requestRegistry.cancelAll('fetch');
    
    onPause?.();
  }, [isPaused, onPause]);

  const resume = useCallback(() => {
    if (!isPaused) return;
    
    setState('resuming');
    
    // Clear pause timeout
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = undefined;
    }
    
    // Run resubscribe callbacks with a small delay to ensure proper state
    if (enableAutoResubscribe) {
      setTimeout(() => {
        resubscribeCallbacks.current.forEach(callback => {
          try {
            callback();
          } catch (error) {
            console.warn('Resubscribe callback failed:', error);
          }
        });
      }, 100);
    }
    
    onResume?.();
    
    setIsPaused(false);
    setState('active');
  }, [isPaused, enableAutoResubscribe, onResume]);

  const resubscribe = useCallback(() => {
    resubscribeCallbacks.current.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('Manual resubscribe failed:', error);
      }
    });
  }, []);

  const registerCleanup = useCallback((cleanup: () => void) => {
    cleanupFunctions.current.add(cleanup);
    return () => cleanupFunctions.current.delete(cleanup);
  }, []);

  // Register resubscribe callback
  const registerResubscribe = useCallback((callback: () => void) => {
    resubscribeCallbacks.current.add(callback);
    return () => resubscribeCallbacks.current.delete(callback);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();
      const visible = !document.hidden;
      
      // Debounce rapid visibility changes (following Supabase best practices)
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      debounceTimeoutRef.current = setTimeout(() => {
        // Only process if enough time has passed since last change
        if (now - lastVisibilityChange.current < debounceMs) {
          return;
        }
        
        lastVisibilityChange.current = now;
        setIsTabVisible(visible);
        
        if (!visible) {
          setState('hidden');
          onTabHide?.();
          
          // Set pause timeout only if tab remains hidden
          pauseTimeoutRef.current = setTimeout(() => {
            pause();
          }, pauseTimeoutMs);
          
        } else {
          setState('active');
          onTabShow?.();
          
          // Clear pause timeout if tab becomes visible again
          if (pauseTimeoutRef.current) {
            clearTimeout(pauseTimeoutRef.current);
            pauseTimeoutRef.current = undefined;
          }
          
          // Auto-resume if was paused
          if (isPaused) {
            resume();
          }
          
          // Sync Supabase auth state when tab becomes visible
          // Following Supabase documentation recommendations for tab changes
          if (enableAuthSync && now - lastAuthRefreshRef.current > 5000) {
            refreshUser().then(() => {
              lastAuthRefreshRef.current = Date.now();
            }).catch(error => {
              console.warn('Error refreshing auth on tab visibility:', error);
            });
          }
        }
      }, debounceMs);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Initial state
    setIsTabVisible(!document.hidden);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      runCleanups();
    };
  }, [onTabHide, onTabShow, pause, resume, isPaused, pauseTimeoutMs, debounceMs, runCleanups, enableAuthSync, refreshUser]);

  return {
    state,
    isTabVisible,
    isPaused,
    pause,
    resume,
    resubscribe,
    registerCleanup
  };
}

// Hook for components that need to resubscribe on resume
export function useResubscribeOnResume(callback: () => void, deps: React.DependencyList = []) {
  const { registerCleanup } = useAppLifecycle();
  
  useEffect(() => {
    return registerCleanup(callback);
  }, [callback, registerCleanup, ...deps]);
}