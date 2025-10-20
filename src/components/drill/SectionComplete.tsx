import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ClipboardList, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionCompleteProps {
  onBlindReview: () => void;
  onSeeResults: () => void;
}

export function SectionComplete({ onBlindReview, onSeeResults }: SectionCompleteProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">Section Complete</h1>
          <p className="text-lg text-muted-foreground">
            What would you like to do next?
          </p>
        </div>

        {/* Two large choices */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Blind Review */}
          <button
            onClick={onBlindReview}
            className={cn(
              "group relative overflow-hidden rounded-xl border transition-all duration-150",
              "bg-card hover:bg-accent/30 hover:border-primary/50",
              "p-8 text-left space-y-6",
              "hover:scale-[1.02] active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
          >
            <div className="relative z-10 space-y-4">
              <div className="inline-flex p-3 rounded-lg bg-primary/10 text-primary">
                <ClipboardList className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Start Blind Review</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Review your answers without seeing correctness. Untimed pass where you can change answers and provide rationale.
                </p>
              </div>

              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                <div>• Untimed review session</div>
                <div>• Change answers with rationale</div>
                <div>• See results with BR comparison</div>
              </div>
            </div>
          </button>

          {/* See Results */}
          <button
            onClick={onSeeResults}
            className={cn(
              "group relative overflow-hidden rounded-xl border transition-all duration-150",
              "bg-card hover:bg-accent/30 hover:border-primary/50",
              "p-8 text-left space-y-6",
              "hover:scale-[1.02] active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
          >
            <div className="relative z-10 space-y-4">
              <div className="inline-flex p-3 rounded-lg bg-primary/10 text-primary">
                <BarChart3 className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">See Results</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  View your score report immediately. This will lock Blind Review for this section.
                </p>
              </div>

              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                <div>• Immediate score report</div>
                <div>• Detailed performance data</div>
                <div>• No Blind Review available</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
