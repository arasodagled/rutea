// Central registry for request lifecycle management
type RequestType = 'fetch' | 'stream' | 'subscription';

interface RequestEntry {
  controller: AbortController;
  type: RequestType;
  id: string;
  startTime: number;
  timeout?: NodeJS.Timeout;
  cleanup?: () => void;
}

class RequestRegistry {
  private requests = new Map<string, RequestEntry>();
  private isTabVisible = true;
  private pausedRequests = new Set<string>();
  
  constructor() {
    this.setupVisibilityHandling();
  }

  private setupVisibilityHandling() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.isTabVisible = !document.hidden;
        if (document.hidden) {
          this.onTabHide();
        } else {
          this.onTabShow();
        }
      });
    }
  }

  private onTabHide() {
    // Cancel all non-critical requests on tab hide
    for (const [id, entry] of this.requests) {
      if (entry.type === 'fetch') {
        this.cancelRequest(id, 'tab_hidden');
      } else if (entry.type === 'stream') {
        this.pauseRequest(id);
      }
    }
  }

  private onTabShow() {
    // Resume paused requests when tab becomes visible
    for (const id of this.pausedRequests) {
      this.resumeRequest(id);
    }
    this.pausedRequests.clear();
  }

  createRequest(
    type: RequestType,
    id?: string,
    timeoutMs?: number,
    cleanup?: () => void
  ): { controller: AbortController; id: string } {
    const requestId = id || `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const controller = new AbortController();
    
    const entry: RequestEntry = {
      controller,
      type,
      id: requestId,
      startTime: Date.now(),
      cleanup
    };

    // Set up timeout if specified
    if (timeoutMs) {
      entry.timeout = setTimeout(() => {
        this.cancelRequest(requestId, 'timeout');
      }, timeoutMs);
    }

    // Auto-cleanup on abort
    controller.signal.addEventListener('abort', () => {
      this.cleanupRequest(requestId);
    }, { once: true });

    this.requests.set(requestId, entry);
    return { controller, id: requestId };
  }

  private pauseRequest(id: string) {
    const entry = this.requests.get(id);
    if (entry && entry.type === 'stream') {
      this.pausedRequests.add(id);
      // Don't abort, just mark as paused for potential resume
    }
  }

  private resumeRequest(id: string) {
    // This would be handled by the consuming code
    // The registry just tracks the state
  }

  cancelRequest(id: string, reason?: string) {
    const entry = this.requests.get(id);
    if (entry) {
      try {
        entry.controller.abort(reason);
      } catch (error) {
        console.warn(`Failed to abort request ${id}:`, error);
      }
    }
  }

  private cleanupRequest(id: string) {
    const entry = this.requests.get(id);
    if (entry) {
      // Clear timeout
      if (entry.timeout) {
        clearTimeout(entry.timeout);
      }
      
      // Run custom cleanup
      if (entry.cleanup) {
        try {
          entry.cleanup();
        } catch (error) {
          console.warn(`Cleanup failed for request ${id}:`, error);
        }
      }
      
      this.requests.delete(id);
      this.pausedRequests.delete(id);
    }
  }

  cancelAll(type?: RequestType) {
    const toCancel = type 
      ? Array.from(this.requests.entries()).filter(([, entry]) => entry.type === type)
      : Array.from(this.requests.entries());
    
    for (const [id] of toCancel) {
      this.cancelRequest(id, 'cancel_all');
    }
  }

  getActiveRequests(type?: RequestType): string[] {
    if (type) {
      return Array.from(this.requests.entries())
        .filter(([, entry]) => entry.type === type)
        .map(([id]) => id);
    }
    return Array.from(this.requests.keys());
  }

  isRequestActive(id: string): boolean {
    return this.requests.has(id);
  }

  isPaused(id: string): boolean {
    return this.pausedRequests.has(id);
  }

  getRequestAge(id: string): number {
    const entry = this.requests.get(id);
    return entry ? Date.now() - entry.startTime : 0;
  }

  // Defensive timeout for stuck requests
  cleanupStaleRequests(maxAgeMs = 300000) { // 5 minutes default
    const now = Date.now();
    for (const [id, entry] of this.requests) {
      if (now - entry.startTime > maxAgeMs) {
        console.warn(`Cleaning up stale request ${id} (${entry.type})`);
        this.cancelRequest(id, 'stale');
      }
    }
  }
}

// Global singleton instance
const registry = new RequestRegistry();

// Legacy compatibility
export function newAbortController() {
  const { controller } = registry.createRequest('fetch');
  return controller;
}

export function abortAllInflight() {
  registry.cancelAll();
}

// New enhanced API
export { registry as requestRegistry };
export type { RequestType };

// Convenience functions
export function createFetchRequest(id?: string, timeoutMs?: number) {
  return registry.createRequest('fetch', id, timeoutMs);
}

export function createStreamRequest(id?: string, cleanup?: () => void) {
  return registry.createRequest('stream', id, undefined, cleanup);
}

export function createSubscriptionRequest(id?: string, cleanup?: () => void) {
  return registry.createRequest('subscription', id, undefined, cleanup);
}

// Periodic cleanup of stale requests
if (typeof window !== 'undefined') {
  setInterval(() => {
    registry.cleanupStaleRequests();
  }, 60000); // Check every minute
}