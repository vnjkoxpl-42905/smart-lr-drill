import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CapsuleCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}

export function CapsuleCard({ icon: Icon, title, description, onClick }: CapsuleCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full rounded-2xl bg-surface-elevated/40 backdrop-blur-sm border border-border/50 p-6",
        "transition-all duration-150 ease-out text-left",
        "hover:border-accent-bronze/30 hover:shadow-glow-sm hover:scale-[1.01]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bronze/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "animate-fade-in"
      )}
    >
      {/* Ambient glow on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent-bronze/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center transition-all duration-200 group-hover:bg-accent-bronze/10">
          <Icon className="w-5 h-5 text-text-secondary transition-colors duration-200 group-hover:text-accent-bronze" />
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-text-primary mb-1">{title}</h3>
          <p className="text-xs text-text-secondary leading-relaxed">{description}</p>
        </div>
      </div>
    </button>
  );
}
