import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InsightCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sublabel?: string;
  onClick?: () => void;
}

export function InsightCard({ icon: Icon, label, value, sublabel, onClick }: InsightCardProps) {
  const interactive = !!onClick;
  
  return (
    <button
      onClick={onClick}
      disabled={!interactive}
      className={cn(
        "group relative w-full h-full rounded-lg bg-card border border-border p-6 text-left transition-all duration-200 flex flex-col",
        interactive && "cursor-pointer hover:shadow-md hover:shadow-glow-sm hover:border-accent-bronze/30 hover:-translate-y-0.5",
        !interactive && "cursor-default"
      )}
    >
      <div className="flex items-start gap-4 flex-1">
        <div className="rounded-lg bg-secondary/50 p-3 transition-all duration-200 group-hover:bg-accent-bronze/10 group-hover:shadow-glow-sm flex-shrink-0">
          <Icon className="w-5 h-5 text-primary transition-colors duration-200 group-hover:text-accent-bronze" />
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col">
          <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-2">
            {label}
          </p>
          <p className="text-2xl font-semibold text-text-primary mb-1 leading-tight">
            {value}
          </p>
          {sublabel && (
            <p className="text-sm text-text-secondary mt-auto">
              {sublabel}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
