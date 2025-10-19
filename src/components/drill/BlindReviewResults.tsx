import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { questionBank } from '@/lib/questionLoader';
import type { BlindReviewResult } from './BlindReviewFlow';
import type { DrillSession } from '@/types/drill';

interface BlindReviewResultsProps {
  session: DrillSession;
  results: BlindReviewResult[];
  onFinish: () => void;
}

type BRDelta = 'corrected' | 'stuck' | 'regret' | 'confirmed';

interface ProcessedResult extends BlindReviewResult {
  delta: BRDelta;
  preCorrect: boolean;
}

export function BlindReviewResults({ session, results, onFinish }: BlindReviewResultsProps) {
  const processedResults: ProcessedResult[] = results.map(result => {
    const previousAttempt = session.attempts.get(result.qid);
    const preCorrect = previousAttempt?.correct || false;

    let delta: BRDelta;
    if (!preCorrect && result.correct) {
      delta = 'corrected';
    } else if (!preCorrect && !result.correct) {
      delta = 'stuck';
    } else if (preCorrect && !result.correct) {
      delta = 'regret';
    } else {
      delta = 'confirmed';
    }

    return {
      ...result,
      delta,
      preCorrect,
    };
  });

  const correctedCount = processedResults.filter(r => r.delta === 'corrected').length;
  const stuckCount = processedResults.filter(r => r.delta === 'stuck').length;
  const regretCount = processedResults.filter(r => r.delta === 'regret').length;
  const confirmedCount = processedResults.filter(r => r.delta === 'confirmed').length;

  const getDeltaBadge = (delta: BRDelta) => {
    const configs: Record<BRDelta, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline'; className?: string }> = {
      corrected: { label: 'Corrected', variant: 'default', className: 'bg-green-600' },
      stuck: { label: 'Stuck', variant: 'destructive' },
      regret: { label: 'Regret', variant: 'secondary', className: 'bg-orange-600' },
      confirmed: { label: 'Confirmed', variant: 'outline', className: 'bg-blue-600 text-white' },
    };
    const config = configs[delta];
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Summary */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Blind Review Results</h2>
          <p className="text-lg">
            {correctedCount > 0 && <span className="text-green-600 font-semibold">{correctedCount} corrected</span>}
            {correctedCount > 0 && (stuckCount > 0 || regretCount > 0) && ' · '}
            {stuckCount > 0 && <span className="text-destructive font-semibold">{stuckCount} stuck</span>}
            {stuckCount > 0 && regretCount > 0 && ' · '}
            {regretCount > 0 && <span className="text-orange-600 font-semibold">{regretCount} regret</span>}
            {(correctedCount > 0 || stuckCount > 0 || regretCount > 0) && confirmedCount > 0 && ' · '}
            {confirmedCount > 0 && <span className="text-blue-600 font-semibold">{confirmedCount} confirmed</span>}
          </p>
        </Card>

        {/* Detailed Results */}
        <div className="space-y-4">
          {processedResults.map(result => {
            const question = questionBank.getQuestion(result.qid);
            if (!question) return null;

            return (
              <Card key={result.qid} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">
                      PT{question.pt}-S{question.section}-Q{question.qnum}
                    </h3>
                    <p className="text-sm text-muted-foreground">{question.qtype}</p>
                  </div>
                  {getDeltaBadge(result.delta)}
                </div>

                {/* Answer Comparison */}
                <div className="flex items-center gap-4 py-3 px-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Before:</span>
                    <Badge variant={result.preCorrect ? 'default' : 'destructive'}>
                      ({result.preAnswer})
                    </Badge>
                  </div>
                  
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">After:</span>
                    <Badge variant={result.correct ? 'default' : 'destructive'}>
                      ({result.brAnswer})
                    </Badge>
                  </div>
                  
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Correct:</span>
                    <Badge variant="outline">
                      ({question.correctAnswer})
                    </Badge>
                  </div>
                </div>

                {/* Rationale */}
                {result.brRationale && (
                  <div className="mt-3 p-3 bg-accent/30 rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium">Your rationale: </span>
                      {result.brRationale}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex justify-center pt-4">
          <Button onClick={onFinish} size="lg">
            Return Home
          </Button>
        </div>
      </div>
    </div>
  );
}
