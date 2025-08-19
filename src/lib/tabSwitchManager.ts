// Utility to manage requests and state during tab switching
class TabSwitchManager {
  private pendingRequests = new Map<string, { 
    controller: AbortController; 
    retry: () => Promise<void>;
    timestamp: number;
  }>();
  private isTabVisible = true;
  private visibilityChangeCallbacks = new Set<() => void>();

  constructor() {
    this.setupVisibilityHandling();
  }

  private setupVisibilityHandling() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        const wasVisible = this.isTabVisible;
        this.isTabVisible = !document.hidden;
        
        if (!wasVisible && this.isTabVisible) {
          // Tab became visible - retry pending requests
          this.retryPendingRequests();
        }
        
        // Notify callbacks
        this.visibilityChangeCallbacks.forEach(callback => {
          try {
            callback();
          } catch (error) {
            console.warn('Tab visibility callback failed:', error);
          }
        });
      });
    }
  }

  registerRequest(id: string, controller: AbortController, retry: () => Promise<void>) {
    this.pendingRequests.set(id, {
      controller,
      retry,
      timestamp: Date.now()
    });
  }

  unregisterRequest(id: string) {
    this.pendingRequests.delete(id);
  }

  private async retryPendingRequests() {
    const requestsToRetry = Array.from(this.pendingRequests.entries());
    
    for (const [id, request] of requestsToRetry) {
      try {
        // Only retry requests that are less than 5 minutes old
        if (Date.now() - request.timestamp < 300000) {
          console.log(`Retrying request: ${id}`);
          await request.retry();
        } else {
          console.log(`Skipping old request: ${id}`);
          this.pendingRequests.delete(id);
        }
      } catch (error) {
        console.warn(`Failed to retry request ${id}:`, error);
        this.pendingRequests.delete(id);
      }
    }
  }

  cancelAllRequests() {
    for (const [id, request] of this.pendingRequests) {
      try {
        request.controller.abort();
      } catch (error) {
        console.warn(`Failed to abort request ${id}:`, error);
      }
    }
    this.pendingRequests.clear();
  }

  onVisibilityChange(callback: () => void) {
    this.visibilityChangeCallbacks.add(callback);
    return () => this.visibilityChangeCallbacks.delete(callback);
  }

  get isVisible() {
    return this.isTabVisible;
  }

  get pendingCount() {
    return this.pendingRequests.size;
  }

  cleanup() {
    this.cancelAllRequests();
    this.visibilityChangeCallbacks.clear();
  }
}

// Global singleton instance
export const tabSwitchManager = new TabSwitchManager();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    tabSwitchManager.cleanup();
  });
}
