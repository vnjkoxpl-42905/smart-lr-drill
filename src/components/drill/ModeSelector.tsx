import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Clock, Target } from 'lucide-react';
import { DrillMode } from '@/types/drill';

interface ModeSelectorProps {
  onSelectMode: (mode: DrillMode) => void;
}

export function ModeSelector({ onSelectMode }: ModeSelectorProps) {
  return (
    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Brain className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">Adaptive Drill</h3>
          <p className="text-sm text-muted-foreground">
            AI-powered question selection that adapts to your skill level. 
            Automatically adjusts difficulty and resurfaces missed questions.
          </p>
          <Button 
            onClick={() => onSelectMode('adaptive')}
            className="w-full"
          >
            Start Adaptive
          </Button>
        </div>
      </Card>

      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">Full Section</h3>
          <p className="text-sm text-muted-foreground">
            Complete a full LSAT LR section with timed practice. 
            Choose 35min standard, 1.5x, 2x, or custom timing.
          </p>
          <Button 
            onClick={() => onSelectMode('full-section')}
            className="w-full"
          >
            Start Section
          </Button>
        </div>
      </Card>

      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Target className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">Type Drill</h3>
          <p className="text-sm text-muted-foreground">
            Focus on specific question types, difficulty levels, or PT sections. 
            Build targeted practice sets.
          </p>
          <Button 
            onClick={() => onSelectMode('type-drill')}
            className="w-full"
          >
            Build Drill
          </Button>
        </div>
      </Card>
    </div>
  );
}
