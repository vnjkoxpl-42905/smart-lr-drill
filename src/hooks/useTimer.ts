import * as React from 'react';

type TimerMode = 'countdown' | 'stopwatch';

interface TimerState {
  startedAt: number;
  pausedAt: number;
  pausedAcc: number;
  running: boolean;
  duration: number;
}

export function useTimer(mode: TimerMode, durationMs?: number) {
  const raf = React.useRef<number | null>(null);
  const state = React.useRef<TimerState>({
    startedAt: 0,
    pausedAt: 0,
    pausedAcc: 0,
    running: false,
    duration: durationMs ?? 0
  });
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  const mountedRef = React.useRef(false);

  const now = () => performance.now();

  const tick = React.useCallback(() => {
    if (!mountedRef.current) return;
    force();
    raf.current = window.setTimeout(tick, 250) as unknown as number;
  }, []);

  const start = React.useCallback(() => {
    if (state.current.running) return;
    state.current.startedAt = now();
    state.current.pausedAcc = 0;
    state.current.pausedAt = 0;
    state.current.running = true;
    tick();
  }, [tick]);

  const pause = React.useCallback(() => {
    if (!state.current.running) return;
    state.current.running = false;
    state.current.pausedAt = now();
    if (raf.current !== null) {
      clearTimeout(raf.current);
      raf.current = null;
    }
    force();
  }, []);

  const resume = React.useCallback(() => {
    if (state.current.running || !state.current.pausedAt) return;
    state.current.pausedAcc += now() - state.current.pausedAt;
    state.current.pausedAt = 0;
    state.current.running = true;
    tick();
  }, [tick]);

  const reset = React.useCallback(() => {
    state.current = {
      startedAt: 0,
      pausedAt: 0,
      pausedAcc: 0,
      running: false,
      duration: durationMs ?? 0
    };
    if (raf.current !== null) {
      clearTimeout(raf.current);
      raf.current = null;
    }
    force();
  }, [durationMs]);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (raf.current !== null) {
        clearTimeout(raf.current);
      }
    };
  }, []);

  const elapsed = () => {
    const base = state.current.running ? now() : (state.current.pausedAt || state.current.startedAt);
    return Math.max(0, base - state.current.startedAt - state.current.pausedAcc);
  };

  const remaining = () => Math.max(0, (state.current.duration || 0) - elapsed());

  const ms = mode === 'countdown' ? remaining() : elapsed();
  const mm = Math.floor(ms / 60000);
  const ss = Math.floor((ms % 60000) / 1000);
  const label = `${mm}:${ss.toString().padStart(2, '0')}`;

  return {
    label,
    ms,
    start,
    pause,
    resume,
    reset,
    running: state.current.running,
    isPaused: state.current.pausedAt > 0 && !state.current.running
  };
}
