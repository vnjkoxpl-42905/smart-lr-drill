import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Pause, Play, Clock } from 'lucide-react';
import type { TimerConfig } from '@/types/drill';

interface TimerControlsProps {
  config: TimerConfig;
  onPause: () => void;
  onResume: () => void;
  onTimeUpdate: (elapsedMs: number) => void;
}

export function TimerControls({ config, onPause, onResume, onTimeUpdate }: TimerControlsProps) {
  const [currentTime, setCurrentTime] = useState(config.elapsedMs);

  useEffect(() => {
    if (config.isPaused || config.mode === 'unlimited') return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - config.startedAt + config.elapsedMs;
      setCurrentTime(elapsed);
      onTimeUpdate(elapsed);
    }, 100);

    return () => clearInterval(interval);
  }, [config.isPaused, config.startedAt, config.elapsedMs, config.mode, onTimeUpdate]);

  const getTargetMs = () => {
    switch (config.mode) {
      case '35': return 35 * 60 * 1000;
      case '52.5': return 52.5 * 60 * 1000;
      case '70': return 70 * 60 * 1000;
      case 'custom': return (config.customMinutes || 35) * 60 * 1000;
      case 'unlimited': return 0;
      default: return 0;
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const targetMs = getTargetMs();
  const isCountdown = config.mode !== 'unlimited';
  const displayTime = isCountdown 
    ? formatTime(Math.max(0, targetMs - currentTime))
    : formatTime(currentTime);
  
  const isOvertime = isCountdown && currentTime > targetMs;

  if (config.mode === 'unlimited') {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <span className="text-2xl font-mono">{displayTime}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Clock className={`w-5 h-5 ${isOvertime ? 'text-destructive' : 'text-muted-foreground'}`} />
        <span className={`text-2xl font-mono ${isOvertime ? 'text-destructive' : ''}`}>
          {isOvertime && '+'}{displayTime}
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={config.isPaused ? onResume : onPause}
      >
        {config.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
      </Button>
    </div>
  );
}
