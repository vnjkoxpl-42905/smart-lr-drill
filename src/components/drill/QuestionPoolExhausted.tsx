import { AlertCircle, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface QuestionPoolExhaustedProps {
  onReset: () => void;
  onExpandCriteria: () => void;
  onSettings: () => void;
  mode: string;
}

export function QuestionPoolExhausted({
  onReset,
  onExpandCriteria,
  onSettings,
  mode
}: QuestionPoolExhaustedProps) {
  return (
    <Card className="p-8 text-center max-w-lg mx-auto mt-8">
      <div className="flex justify-center mb-4">
        <div className="rounded-full bg-warning/10 p-3">
          <AlertCircle className="h-8 w-8 text-warning" />
        </div>
      </div>
      
      <h3 className="text-xl font-semibold mb-2">Question Pool Exhausted</h3>
      
      <p className="text-muted-foreground mb-6">
        You've seen all available questions matching your current criteria for {mode} mode.
      </p>

      <div className="space-y-3">
        <Button onClick={onExpandCriteria} className="w-full" size="lg">
          Expand Criteria
        </Button>
        
        <Button onClick={onReset} variant="outline" className="w-full" size="lg">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset Question Pool
        </Button>
        
        <Button onClick={onSettings} variant="ghost" className="w-full" size="lg">
          <Settings className="mr-2 h-4 w-4" />
          Pool Settings
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-6">
        Tip: Enable "Allow repeats" in settings to practice all questions again immediately.
      </p>
    </Card>
  );
}
