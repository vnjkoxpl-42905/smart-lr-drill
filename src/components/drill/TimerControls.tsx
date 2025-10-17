import { Button } from '@/components/ui/button';
import { Pause, Play, Clock } from 'lucide-react';
import { useTimerContext } from '@/contexts/TimerContext';

export function TimerControls() {
  const timer = useTimerContext();
  
  const isOvertime = timer.ms < 0;
  const displayLabel = isOvertime ? `+${timer.label}` : timer.label;

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Clock className={`w-5 h-5 ${isOvertime ? 'text-destructive' : 'text-muted-foreground'}`} />
        <span className={`text-2xl font-mono ${isOvertime ? 'text-destructive' : ''}`}>
          {displayLabel}
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={timer.isPaused ? timer.resume : timer.pause}
      >
        {timer.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
      </Button>
    </div>
  );
}
