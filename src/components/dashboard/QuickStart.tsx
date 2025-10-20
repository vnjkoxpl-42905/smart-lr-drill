import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';

interface QuickStartProps {
  onStart: () => void;
}

export function QuickStart({ onStart }: QuickStartProps) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-surface-elevated p-10 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group">
      {/* Warm bronze gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-bronze/[0.03] via-accent-warm/[0.02] to-transparent pointer-events-none" />
      
      {/* Bronze glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-bronze/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      <div className="relative z-10 max-w-xl">
        <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-text-tertiary mb-4">
          <Zap className="w-3.5 h-3.5" />
          Quick Start
        </div>
        
        <h2 className="text-[32px] font-semibold leading-tight mb-3 text-text-primary">
          Start Adaptive Drill
        </h2>
        
        <p className="text-base text-text-secondary mb-8 leading-relaxed">
          Jump into an intelligent practice session tailored to your performance.
        </p>
        
        <Button 
          onClick={onStart}
          size="lg"
          className="relative overflow-hidden h-12 px-8 text-base font-medium shadow-sm hover:shadow-md"
        >
          <span className="relative z-10">Start Adaptive Drill</span>
        </Button>
      </div>
    </div>
  );
}
