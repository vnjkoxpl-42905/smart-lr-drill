import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { questionBank } from '@/lib/questionLoader';
import type { BlindReviewResult } from '@/types/drill';
import type { DrillSession } from '@/types/drill';

interface BlindReviewResultsProps {
  session: DrillSession;
  results: BlindReviewResult[];
  onFinish: () => void;
}

type BRDelta = 'corrected' | 'stuck' | 'regret' | 'confirmed';

interface ProcessedResult extends BlindReviewResult {
  delta: BRDelta;
}

export function BlindReviewResults({ session, results, onFinish }: BlindReviewResultsProps) {
  const processedResults: ProcessedResult[] = results.map(result => {
    let delta: BRDelta;
    if (!result.preCorrect && result.correct) {
      delta = 'corrected';
    } else if (!result.preCorrect && !result.correct) {
      delta = 'stuck';
    } else if (result.preCorrect && !result.correct) {
      delta = 'regret';
    } else {
      delta = 'confirmed';
    }

    return {
      ...result,
      delta,
    };
  });

  const correctedCount = processedResults.filter(r => r.delta === 'corrected').length;
  const stuckCount = processedResults.filter(r => r.delta === 'stuck').length;
  const regretCount = processedResults.filter(r => r.delta === 'regret').length;
  const confirmedCount = processedResults.filter(r => r.delta === 'confirmed').length;

  const totalReviewed = processedResults.length;
  const brScore = processedResults.filter(r => r.correct).length;
  const brPercent = Math.round((brScore / totalReviewed) * 100);

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
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Summary */}
        <Card className="p-6 border rounded-xl">
          <h2 className="text-2xl font-bold mb-4">Blind Review Results</h2>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">BR Score</div>
              <div className="text-3xl font-bold">{brScore}/{totalReviewed}</div>
              <div className="text-sm text-muted-foreground">{brPercent}% correct</div>
            </div>
            <div className="space-y-2">
              {correctedCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-600" />
                  <span className="text-sm"><span className="font-semibold">{correctedCount}</span> corrected</span>
                </div>
              )}
              {stuckCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  <span className="text-sm"><span className="font-semibold">{stuckCount}</span> stuck</span>
                </div>
              )}
              {regretCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-600" />
                  <span className="text-sm"><span className="font-semibold">{regretCount}</span> regret</span>
                </div>
              )}
              {confirmedCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-600" />
                  <span className="text-sm"><span className="font-semibold">{confirmedCount}</span> confirmed</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Detailed Results */}
        <div className="space-y-2">
          {processedResults.map(result => {
            const question = questionBank.getQuestion(result.qid);
            if (!question) return null;

            return (
              <Card key={result.qid} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold font-mono text-sm">
                      PT{question.pt}-S{question.section}-Q{question.qnum}
                    </h3>
                    <p className="text-xs text-muted-foreground">{question.qtype}</p>
                  </div>
                  {getDeltaBadge(result.delta)}
                </div>

                {/* Answer Comparison */}
                <div className="flex items-center gap-4 py-3 px-4 bg-accent/20 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-12">Before</span>
                    <Badge variant={result.preCorrect ? 'default' : 'destructive'} className="font-mono">
                      ({result.preAnswer})
                    </Badge>
                  </div>
                  
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-10">After</span>
                    <Badge variant={result.correct ? 'default' : 'destructive'} className="font-mono">
                      ({result.brAnswer})
                    </Badge>
                  </div>
                  
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Correct</span>
                    <Badge variant="outline" className="font-mono">
                      ({question.correctAnswer})
                    </Badge>
                  </div>
                </div>

                {/* Rationale */}
                {result.brRationale && (
                  <div className="mt-3 p-3 bg-accent/20 rounded-lg border">
                    <p className="text-sm">
                      <span className="font-medium text-xs text-muted-foreground">Rationale: </span>
                      {result.brRationale}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4 pt-4">
          <Button onClick={onFinish} size="lg">
            Return Home
          </Button>
        </div>
      </div>
    </div>
  );
}
