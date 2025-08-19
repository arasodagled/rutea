// UI State Machine to prevent stuck spinners and inconsistent states
export enum UiState {
  IDLE = 'idle',
  LOADING = 'loading',
  STREAMING = 'streaming',
  SUCCESS = 'success',
  ERROR = 'error',
  PAUSED = 'paused',
  RETRYING = 'retrying'
}

export interface UiStateContext {
  state: UiState;
  error?: string;
  progress?: number;
  canRetry?: boolean;
  retryCount?: number;
}

export class UiStateMachine {
  private currentState: UiState = UiState.IDLE;
  private context: UiStateContext;
  private listeners = new Set<(state: UiStateContext) => void>();
  private timeoutId?: NodeJS.Timeout;
  
  constructor(initialState: UiState = UiState.IDLE) {
    this.currentState = initialState;
    this.context = { state: initialState };
  }

  subscribe(listener: (state: UiStateContext) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => {
      try {
        listener({ ...this.context });
      } catch (error) {
        console.warn('UI state listener failed:', error);
      }
    });
  }

  private setState(newState: UiState, updates: Partial<UiStateContext> = {}) {
    this.currentState = newState;
    this.context = {
      ...this.context,
      state: newState,
      ...updates
    };
    this.notify();
  }

  // State transitions
  startLoading(timeout?: number) {
    if (this.canTransitionTo(UiState.LOADING)) {
      this.setState(UiState.LOADING, { error: undefined });
      
      // Defensive timeout to prevent stuck loading
      if (timeout) {
        this.timeoutId = setTimeout(() => {
          if (this.currentState === UiState.LOADING) {
            this.setError('Request timed out', true);
          }
        }, timeout);
      }
    } else if (this.currentState === UiState.PAUSED) {
      // Allow transition from paused to loading
      this.setState(UiState.LOADING, { error: undefined });
    }
  }

  startStreaming() {
    if (this.canTransitionTo(UiState.STREAMING)) {
      this.clearTimeout();
      this.setState(UiState.STREAMING, { error: undefined, progress: 0 });
    } else if (this.currentState === UiState.PAUSED) {
      // Allow transition from paused to streaming
      this.clearTimeout();
      this.setState(UiState.STREAMING, { error: undefined, progress: 0 });
    }
  }

  updateProgress(progress: number) {
    if (this.currentState === UiState.STREAMING || this.currentState === UiState.LOADING) {
      this.setState(this.currentState, { progress });
    }
  }

  setSuccess() {
    this.clearTimeout();
    this.setState(UiState.SUCCESS, { error: undefined, progress: 100 });
  }

  setError(error: string, canRetry = false, retryCount = 0) {
    this.clearTimeout();
    this.setState(UiState.ERROR, { error, canRetry, retryCount });
  }

  pause() {
    if (this.currentState === UiState.LOADING || this.currentState === UiState.STREAMING) {
      this.setState(UiState.PAUSED);
    }
  }

  resume() {
    if (this.currentState === UiState.PAUSED) {
      // Resume to the previous state or default to loading
      this.setState(UiState.LOADING);
    }
  }

  retry() {
    if (this.currentState === UiState.ERROR && this.context.canRetry) {
      const retryCount = (this.context.retryCount || 0) + 1;
      this.setState(UiState.RETRYING, { retryCount });
    }
  }

  reset() {
    this.clearTimeout();
    this.setState(UiState.IDLE, { 
      error: undefined, 
      progress: undefined, 
      canRetry: undefined, 
      retryCount: undefined 
    });
  }

  // Force reset for emergency situations
  forceReset() {
    this.clearTimeout();
    this.currentState = UiState.IDLE;
    this.context = { state: UiState.IDLE };
    this.notify();
  }

  private clearTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  private canTransitionTo(newState: UiState): boolean {
    const validTransitions: Record<UiState, UiState[]> = {
      [UiState.IDLE]: [UiState.LOADING],
      [UiState.LOADING]: [UiState.STREAMING, UiState.SUCCESS, UiState.ERROR, UiState.PAUSED],
      [UiState.STREAMING]: [UiState.SUCCESS, UiState.ERROR, UiState.PAUSED],
      [UiState.SUCCESS]: [UiState.IDLE, UiState.LOADING],
      [UiState.ERROR]: [UiState.IDLE, UiState.LOADING, UiState.RETRYING],
      [UiState.PAUSED]: [UiState.LOADING, UiState.STREAMING, UiState.ERROR],
      [UiState.RETRYING]: [UiState.LOADING, UiState.ERROR]
    };

    return validTransitions[this.currentState]?.includes(newState) ?? false;
  }

  // Getters
  get state() { return this.currentState; }
  get isLoading() { return this.currentState === UiState.LOADING; }
  get isStreaming() { return this.currentState === UiState.STREAMING; }
  get isError() { return this.currentState === UiState.ERROR; }
  get isSuccess() { return this.currentState === UiState.SUCCESS; }
  get isPaused() { return this.currentState === UiState.PAUSED; }
  get canRetry() { return this.context.canRetry ?? false; }
  get error() { return this.context.error; }
  get progress() { return this.context.progress; }
}

// React hook for UI state management
import { useState, useEffect, useCallback } from 'react';

export function useUiState(initialState: UiState = UiState.IDLE) {
  const [stateMachine] = useState(() => new UiStateMachine(initialState));
  const [state, setState] = useState<UiStateContext>({ state: initialState });

  useEffect(() => {
    return stateMachine.subscribe(setState);
  }, [stateMachine]);

  const actions = {
    startLoading: useCallback((timeout?: number) => stateMachine.startLoading(timeout), [stateMachine]),
    startStreaming: useCallback(() => stateMachine.startStreaming(), [stateMachine]),
    updateProgress: useCallback((progress: number) => stateMachine.updateProgress(progress), [stateMachine]),
    setSuccess: useCallback(() => stateMachine.setSuccess(), [stateMachine]),
    setError: useCallback((error: string, canRetry?: boolean) => stateMachine.setError(error, canRetry), [stateMachine]),
    pause: useCallback(() => stateMachine.pause(), [stateMachine]),
    resume: useCallback(() => stateMachine.resume(), [stateMachine]),
    retry: useCallback(() => stateMachine.retry(), [stateMachine]),
    reset: useCallback(() => stateMachine.reset(), [stateMachine]),
    forceReset: useCallback(() => stateMachine.forceReset(), [stateMachine])
  };

  // Add convenience properties from the state machine
  const conveniences = {
    isLoading: stateMachine.isLoading,
    isStreaming: stateMachine.isStreaming,
    isError: stateMachine.isError,
    isSuccess: stateMachine.isSuccess,
    isPaused: stateMachine.isPaused
  };

  return { ...state, ...actions, ...conveniences };
}