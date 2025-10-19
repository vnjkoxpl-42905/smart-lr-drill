import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';
import { questionBank } from '@/lib/questionLoader';
import type { DrillSession } from '@/types/drill';

interface BlindReviewSelectionProps {
  session: DrillSession;
  onStartBlindReview: (selectedQids: string[]) => void;
  onSkip: () => void;
}

export function BlindReviewSelection({ session, onStartBlindReview, onSkip }: BlindReviewSelectionProps) {
  const [selectedQids, setSelectedQids] = React.useState<Set<string>>(new Set());

  // Initialize with all marked items
  React.useEffect(() => {
    const markedQids = Array.from(session.attempts.entries())
      .filter(([_, attempt]) => attempt.brMarked)
      .map(([qid]) => qid);
    setSelectedQids(new Set(markedQids));
  }, [session]);

  const wrongItems = Array.from(session.attempts.entries())
    .filter(([_, attempt]) => !attempt.correct)
    .map(([qid]) => qid);

  const rightItems = Array.from(session.attempts.entries())
    .filter(([_, attempt]) => attempt.correct)
    .map(([qid]) => qid);

  const handleToggle = (qid: string) => {
    setSelectedQids(prev => {
      const newSet = new Set(prev);
      if (newSet.has(qid)) {
        newSet.delete(qid);
      } else {
        newSet.add(qid);
      }
      return newSet;
    });
  };

  const renderItem = (qid: string) => {
    const attempt = session.attempts.get(qid);
    const question = questionBank.getQuestion(qid);
    if (!question || !attempt) return null;

    return (
      <div
        key={qid}
        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer"
        onClick={() => handleToggle(qid)}
      >
        <Checkbox
          checked={selectedQids.has(qid)}
          onCheckedChange={() => handleToggle(qid)}
        />
        <div className="flex-1 flex items-center gap-3">
          <span className="text-sm font-medium">
            PT{question.pt}-S{question.section}-Q{question.qnum}
          </span>
          <span className="text-xs text-muted-foreground">{question.qtype}</span>
          {attempt.brMarked && (
            <Badge variant="secondary" className="text-xs">BR</Badge>
          )}
        </div>
        {attempt.correct ? (
          <CheckCircle className="w-4 h-4 text-green-600" />
        ) : (
          <XCircle className="w-4 h-4 text-red-600" />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Start Blind Review</h2>
          <p className="text-muted-foreground">
            Select questions to review without seeing correctness or your previous choices.
          </p>
        </div>

        <div className="space-y-4">
          {wrongItems.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Wrong ({wrongItems.length})
              </h3>
              <div className="space-y-2">
                {wrongItems.map(renderItem)}
              </div>
            </div>
          )}

          {rightItems.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Right ({rightItems.length})
              </h3>
              <div className="space-y-2">
                {rightItems.map(renderItem)}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            onClick={() => onStartBlindReview(Array.from(selectedQids))}
            disabled={selectedQids.size === 0}
            size="lg"
          >
            Start Blind Review ({selectedQids.size})
          </Button>
          <Button variant="outline" onClick={onSkip} size="lg">
            Skip
          </Button>
        </div>
      </Card>
    </div>
  );
}
