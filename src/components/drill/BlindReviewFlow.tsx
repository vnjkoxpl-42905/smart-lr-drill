import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { HighlightedText } from './HighlightedText';
import { questionBank } from '@/lib/questionLoader';
import { normalizeText, cn } from '@/lib/utils';
import type { DrillSession } from '@/types/drill';

interface BlindReviewFlowProps {
  session: DrillSession;
  selectedQids: string[];
  onComplete: (results: BlindReviewResult[]) => void;
}

export interface BlindReviewResult {
  qid: string;
  preAnswer: string;
  brAnswer: string;
  brRationale: string;
  brTimeMs: number;
  brChanged: boolean;
  correct: boolean;
}

export function BlindReviewFlow({ session, selectedQids, onComplete }: BlindReviewFlowProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [brAnswer, setBrAnswer] = React.useState('');
  const [brRationale, setBrRationale] = React.useState('');
  const [startTime, setStartTime] = React.useState(performance.now());
  const [results, setResults] = React.useState<BlindReviewResult[]>([]);

  const currentQid = selectedQids[currentIndex];
  const currentQuestion = questionBank.getQuestion(currentQid);
  const previousAttempt = session.attempts.get(currentQid);
  const progress = ((currentIndex + 1) / selectedQids.length) * 100;
  const isLast = currentIndex === selectedQids.length - 1;

  React.useEffect(() => {
    setBrAnswer('');
    setBrRationale('');
    setStartTime(performance.now());
  }, [currentIndex]);

  const handleSaveAndNext = () => {
    if (!currentQuestion || !previousAttempt) return;

    const brTimeMs = Math.floor(performance.now() - startTime);
    const isCorrect = brAnswer === currentQuestion.correctAnswer;
    const hasChanged = brAnswer !== previousAttempt.selectedAnswer;

    const result: BlindReviewResult = {
      qid: currentQid,
      preAnswer: previousAttempt.selectedAnswer,
      brAnswer,
      brRationale,
      brTimeMs,
      brChanged: hasChanged,
      correct: isCorrect,
    };

    const newResults = [...results, result];
    setResults(newResults);

    if (isLast) {
      onComplete(newResults);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  if (!currentQuestion) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-card">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Blind Review</h2>
          <div className="text-sm text-muted-foreground">
            Question {currentIndex + 1} / {selectedQids.length}
          </div>
        </div>
        <Progress value={progress} className="h-2 mt-4" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Card className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Stimulus */}
          {currentQuestion.stimulus && (
            <div className="pl-4 py-2 border-l-2 border-muted">
              <HighlightedText
                text={normalizeText(currentQuestion.stimulus)}
                highlights={[]}
                onHighlightClick={() => {}}
                eraserMode={false}
              />
            </div>
          )}

          {/* Question Stem */}
          <div className="space-y-4">
            <div className="font-medium">
              <HighlightedText
                text={normalizeText(currentQuestion.questionStem)}
                highlights={[]}
                onHighlightClick={() => {}}
                eraserMode={false}
              />
            </div>

            {/* Answer Choices */}
            <RadioGroup value={brAnswer} onValueChange={setBrAnswer}>
              {Object.entries(currentQuestion.answerChoices).map(([key, text]) => (
                <div
                  key={key}
                  className={cn(
                    "flex items-start gap-4 py-3 px-4 rounded-lg border",
                    "hover:bg-accent/50 cursor-pointer transition-colors"
                  )}
                  onClick={() => setBrAnswer(key)}
                >
                  <RadioGroupItem value={key} id={`br-answer-${key}`} />
                  <Label
                    htmlFor={`br-answer-${key}`}
                    className="flex-1 cursor-pointer"
                  >
                    <span className="font-semibold mr-2">({key})</span>
                    {text}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {/* Rationale */}
            <div className="space-y-2">
              <Label htmlFor="rationale">Your rationale (one line)</Label>
              <Input
                id="rationale"
                value={brRationale}
                onChange={(e) => setBrRationale(e.target.value)}
                placeholder="Why did you choose this answer?"
                className="w-full"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSaveAndNext}
                disabled={!brAnswer || !brRationale.trim()}
                size="lg"
              >
                {isLast ? 'Finish & See Results' : 'Save & Next'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
