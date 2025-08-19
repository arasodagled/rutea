import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useTabVisibility() {
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const [lastVisibilityChange, setLastVisibilityChange] = useState(Date.now());
  const { refreshUser } = useAuth();
  
  // Debounce refs to prevent excessive calls
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastAuthRefreshRef = useRef<number>(0);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();
      const visible = !document.hidden;
      
      // Debounce rapid visibility changes (following Supabase best practices)
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      debounceTimeoutRef.current = setTimeout(() => {
        setIsVisible(visible);
        setLastVisibilityChange(now);
        
        // Handle auth state when tab becomes visible
        if (visible) {
          // Only refresh auth if enough time has passed since last refresh
          // This prevents excessive calls when switching tabs rapidly
          if (now - lastAuthRefreshRef.current > 5000) { // 5 second minimum
            refreshUser().then(() => {
              lastAuthRefreshRef.current = Date.now();
            }).catch(error => {
              console.warn('Error refreshing user on tab visibility:', error);
            });
          }
        }
      }, 100); // 100ms debounce
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [refreshUser]);

  const isTabVisible = useCallback(() => !document.hidden, []);
  
  const waitForTabVisible = useCallback((timeout = 5000): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!document.hidden) {
        resolve(true);
        return;
      }

      const timeoutId = setTimeout(() => {
        resolve(false);
      }, timeout);

      const handleVisibilityChange = () => {
        if (!document.hidden) {
          clearTimeout(timeoutId);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          resolve(true);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
    });
  }, []);

  return {
    isVisible,
    lastVisibilityChange,
    isTabVisible,
    waitForTabVisible
  };
}
