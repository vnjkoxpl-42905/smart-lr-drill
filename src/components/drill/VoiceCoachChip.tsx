import * as React from 'react';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceCoachChipProps {
  onActivate: () => void;
  className?: string;
}

export function VoiceCoachChip({ onActivate, className }: VoiceCoachChipProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onActivate}
      className={cn(
        "h-8 px-3 gap-2",
        "bg-muted hover:bg-muted/80",
        "text-muted-foreground hover:text-foreground",
        "border border-border",
        "transition-all duration-200",
        className
      )}
    >
      <Mic className="w-3.5 h-3.5" />
      <span className="text-sm">Explain your reasoning</span>
    </Button>
  );
}
