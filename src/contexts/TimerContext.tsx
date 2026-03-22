import * as React from 'react';
import { useTimer } from '@/hooks/useTimer';

interface TimerContextValue {
  label: string;
  ms: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  running: boolean;
  isPaused: boolean;
}

const TimerContext = React.createContext<TimerContextValue | null>(null);

interface TimerProviderProps {
  children: React.ReactNode;
  mode: 'countdown' | 'stopwatch';
  durationMs?: number;
}

export function TimerProvider({ children, mode, durationMs }: TimerProviderProps) {
  const timer = useTimer(mode, durationMs);

  return (
    <TimerContext.Provider value={timer}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimerContext() {
  const context = React.useContext(TimerContext);
  if (!context) {
    throw new Error('useTimerContext must be used within TimerProvider');
  }
  return context;
}

/** Safe version that returns null when no TimerProvider is present (no crash). */
export function useTimerContextSafe(): TimerContextValue | null {
  return React.useContext(TimerContext);
}
