# Supabase Auth Improvements

This document outlines the improvements made to align with [Supabase Auth documentation](https://supabase.com/docs/reference/javascript/auth-onauthstatechange) best practices, especially regarding tab changes and auth state management.

## Issues Fixed

### 1. **Multiple Auth State Listeners (CRITICAL)**
**Before**: 4 separate `onAuthStateChange` listeners in different components:
- `AuthContext.tsx`
- `MainLayout.tsx` 
- `ChatWrapper.tsx`
- `Sidebar.tsx`

**After**: Single centralized auth listener in `AuthContext.tsx`

**Why this matters**: Multiple listeners violate Supabase best practices and can cause:
- Multiple event emissions across tabs
- Performance issues
- Race conditions
- Inconsistent auth state

### 2. **Tab Change Handling**
**Before**: No proper handling of frequent `SIGNED_IN` events on tab changes

**After**: Proper debouncing and event handling following Supabase documentation:
- 100ms debounce for rapid events
- Only process meaningful auth state changes
- Proper handling of `SIGNED_IN` events that fire frequently on tab switches

### 3. **Auth State Management**
**Before**: Each component independently managed auth state

**After**: Centralized auth state management through `AuthContext`

## Implementation Details

### Centralized Auth Context
```typescript
// Single source of truth for auth state
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Single auth state listener for entire app
  const { data: { subscription } } = createAuthListener({
    onInitialSession: (session) => { /* ... */ },
    onSignedIn: (session) => { /* ... */ },
    onSignedOut: (session) => { /* ... */ },
    // ... other handlers
  });
}
```

### Proper Event Handling
Following Supabase documentation recommendations:

```typescript
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
    
    // Handle events according to Supabase best practices
    switch (event) {
      case 'SIGNED_IN':
        // This event can fire very frequently on tab changes
        // Only process if we have a meaningful change
        break;
      // ... other cases
    }
  });
}
```

### Tab Visibility Integration
```typescript
// Proper integration with tab visibility changes
export function useTabVisibility() {
  const { refreshUser } = useAuth();
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Debounce rapid visibility changes
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      debounceTimeoutRef.current = setTimeout(() => {
        // Handle auth state when tab becomes visible
        if (visible && now - lastAuthRefreshRef.current > 5000) {
          refreshUser();
        }
      }, 100); // 100ms debounce
    };
  }, [refreshUser]);
}
```

## Best Practices Implemented

### 1. **Single Auth Listener**
- ✅ One `onAuthStateChange` listener for the entire app
- ✅ Centralized in `AuthContext`
- ✅ All components use the same auth state

### 2. **Proper Event Debouncing**
- ✅ 100ms debounce for rapid events
- ✅ Prevents excessive processing on tab changes
- ✅ Follows Supabase performance recommendations

### 3. **Tab Change Handling**
- ✅ Proper handling of `SIGNED_IN` events on tab switches
- ✅ Debounced auth refresh on tab visibility
- ✅ Prevents unnecessary API calls

### 4. **Token Management**
- ✅ Proper handling of `TOKEN_REFRESHED` events
- ✅ Avoids frequent `getSession()` calls
- ✅ Stores access tokens for immediate use

### 5. **Local Storage Cleanup**
- ✅ Proper cleanup on sign out
- ✅ Preserves Supabase internal keys
- ✅ Clears only app-specific data

## Usage Examples

### Components Using Auth
```typescript
// Before: Each component had its own auth listener
const { data: { subscription } } = supabase.auth.onAuthStateChange(/* ... */);

// After: Use centralized auth context
const { user, loading, signOut } = useAuth();
```

### Tab Visibility Handling
```typescript
// Proper integration with Supabase auth
const { isVisible, lastVisibilityChange } = useTabVisibility();
const { refreshUser } = useAuth();

// Auth state automatically syncs on tab changes
```

## Performance Benefits

1. **Reduced Event Emissions**: Single listener instead of 4
2. **Proper Debouncing**: Prevents excessive processing on tab changes
3. **Centralized State**: No duplicate auth state management
4. **Efficient Token Handling**: Avoids frequent API calls
5. **Smart Tab Sync**: Only refreshes auth when necessary

## Compliance with Supabase Documentation

✅ **Single Auth Listener**: One listener per app as recommended
✅ **Event Debouncing**: Proper handling of frequent events
✅ **Tab Change Handling**: Follows recommendations for `SIGNED_IN` events
✅ **Token Management**: Proper `TOKEN_REFRESHED` handling
✅ **Performance**: Efficient callback functions as recommended
✅ **Storage Cleanup**: Proper local storage management on sign out

## Files Modified

- `src/contexts/AuthContext.tsx` - Centralized auth management
- `src/components/MainLayout.tsx` - Removed duplicate auth listener
- `src/components/Sidebar.tsx` - Uses centralized auth context
- `src/components/ChatWrapper.tsx` - Uses centralized auth context
- `src/app/layout.tsx` - Added AuthProvider wrapper
- `src/hooks/useTabVisibility.ts` - Improved tab visibility handling
- `src/hooks/useAppLifecycle.ts` - Better Supabase auth integration
- `src/lib/supabaseAuthUtils.ts` - New utility functions (NEW FILE)

## Testing Recommendations

1. **Tab Switching**: Test rapid tab switching to ensure no excessive auth calls
2. **Multiple Tabs**: Verify auth state syncs across tabs properly
3. **Sign Out**: Ensure proper cleanup across all components
4. **Performance**: Monitor console for excessive auth events
5. **Token Refresh**: Verify tokens refresh properly without excessive calls

## Future Improvements

1. **Session Persistence**: Implement proper session storage strategy
2. **Offline Handling**: Add offline auth state management
3. **Error Boundaries**: Add auth error boundaries for better UX
4. **Analytics**: Track auth events for debugging and optimization
