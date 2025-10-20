import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';

interface QuickStartProps {
  onStart: () => void;
}

export function QuickStart({ onStart }: QuickStartProps) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-surface-elevated p-12 shadow-lg transition-shadow hover:shadow-xl">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent pointer-events-none" />
      
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
          className="relative overflow-hidden group h-12 px-8 text-base font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
        >
          <span className="relative z-10">Begin Practice</span>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </Button>
      </div>
    </div>
  );
}
