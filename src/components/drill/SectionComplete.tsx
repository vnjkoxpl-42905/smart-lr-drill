import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ClipboardList, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionCompleteProps {
  onReview: () => void;
  onScoreReport: () => void;
}

export function SectionComplete({ onReview, onScoreReport }: SectionCompleteProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">Section Complete</h1>
          <p className="text-lg text-muted-foreground">
            Choose how to review your performance
          </p>
        </div>

        {/* Two large choices */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Review */}
          <button
            onClick={onReview}
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
                <h2 className="text-2xl font-bold">Review</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Revisit selected questions without seeing correctness. Re-answer with fresh eyes and rationale.
                </p>
              </div>

              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                <div>• All wrong answers</div>
                <div>• All flagged questions</div>
                <div>• Hardest correct answers</div>
              </div>
            </div>
          </button>

          {/* Score Report */}
          <button
            onClick={onScoreReport}
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
                <h2 className="text-2xl font-bold">Score Report</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  View detailed performance data, timing breakdowns, and question-by-question analytics.
                </p>
              </div>

              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                <div>• Raw score and accuracy</div>
                <div>• Timing analysis per question</div>
                <div>• Filters and expandable details</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
