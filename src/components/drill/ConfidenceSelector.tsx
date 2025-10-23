import * as React from 'react';
import { cn } from '@/lib/utils';

interface ConfidenceSelectorProps {
  value: number | null;
  onChange: (level: number) => void;
  disabled?: boolean;
}

export function ConfidenceSelector({ value, onChange, disabled = false }: ConfidenceSelectorProps) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-1 p-1 rounded-full border-2 border-border bg-muted/50">
        {[1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => !disabled && onChange(level)}
            disabled={disabled}
            className={cn(
              "flex-1 h-11 rounded-full text-sm font-semibold transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              value === level
                ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20 scale-105"
                : "bg-transparent text-muted-foreground hover:bg-accent/50 active:scale-95",
              !disabled && "cursor-pointer touch-manipulation"
            )}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );
}
