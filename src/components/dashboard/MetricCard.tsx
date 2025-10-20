import * as React from 'react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  children: React.ReactNode;
  className?: string;
}

export function MetricCard({ children, className }: MetricCardProps) {
  return (
    <div
      className={cn(
        "group relative rounded-xl bg-surface-elevated/40 backdrop-blur-sm border border-border/50 p-6",
        "transition-all duration-150 ease-out",
        "hover:border-accent-bronze/30 hover:shadow-glow-sm hover:scale-[1.01]",
        "focus-within:ring-1 focus-within:ring-accent-bronze/50",
        "animate-fade-in",
        className
      )}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent-bronze/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
