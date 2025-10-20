import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { HighlightedText } from './HighlightedText';
import { HighlightToolbar } from './HighlightToolbar';
import { questionBank } from '@/lib/questionLoader';
import { normalizeText, cn } from '@/lib/utils';
import type { DrillSession } from '@/types/drill';
import type { Highlight } from '@/lib/highlightUtils';

interface EnhancedBlindReviewProps {
  session: DrillSession;
  reviewQids: string[];
  onComplete: (results: BRResult[]) => void;
  onBack: () => void;
}

export interface BRResult {
  qid: string;
  preAnswer: string;
  brAnswer: string;
  brRationale: string;
  brTimeMs: number;
  brChanged: boolean;
  correct: boolean;
}

export function EnhancedBlindReview({ session, reviewQids, onComplete, onBack }: EnhancedBlindReviewProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [brAnswers, setBrAnswers] = React.useState<Map<string, string>>(new Map());
  const [brRationales, setBrRationales] = React.useState<Map<string, string>>(new Map());
  const [brTimes, setBrTimes] = React.useState<Map<string, number>>(new Map());
  const [questionStartTime, setQuestionStartTime] = React.useState(performance.now());
  const [eliminatedAnswers, setEliminatedAnswers] = React.useState<Set<string>>(new Set());
  const [highlightMode, setHighlightMode] = React.useState<'none' | 'yellow' | 'pink' | 'orange' | 'underline' | 'erase'>('none');
  const [highlights, setHighlights] = React.useState<Map<string, Highlight[]>>(new Map());
  const [jumpToInput, setJumpToInput] = React.useState('');

  const currentQid = reviewQids[currentIndex];
  const currentQuestion = questionBank.getQuestion(currentQid);
  const previousAttempt = session.attempts.get(currentQid);
  const progress = ((currentIndex + 1) / reviewQids.length) * 100;

  const currentAnswer = brAnswers.get(currentQid) || '';
  const currentRationale = brRationales.get(currentQid) || '';

  React.useEffect(() => {
    setQuestionStartTime(performance.now());
  }, [currentIndex]);

  const saveCurrentTime = () => {
    if (!brTimes.has(currentQid)) {
      const elapsed = Math.floor(performance.now() - questionStartTime);
      setBrTimes(new Map(brTimes.set(currentQid, elapsed)));
    }
  };

  const handleAnswerSelect = (answer: string) => {
    setBrAnswers(new Map(brAnswers.set(currentQid, answer)));
    saveCurrentTime();
  };

  const handleRationaleChange = (rationale: string) => {
    setBrRationales(new Map(brRationales.set(currentQid, rationale)));
  };

  const handlePrevious = () => {
    saveCurrentTime();
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    saveCurrentTime();
    if (currentIndex < reviewQids.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleJumpTo = () => {
    const num = parseInt(jumpToInput);
    if (num >= 1 && num <= reviewQids.length) {
      saveCurrentTime();
      setCurrentIndex(num - 1);
      setJumpToInput('');
    }
  };

  const handleFinish = () => {
    saveCurrentTime();
    
    const results: BRResult[] = reviewQids.map(qid => {
      const question = questionBank.getQuestion(qid);
      const previousAttempt = session.attempts.get(qid);
      const brAnswer = brAnswers.get(qid) || '';
      const brRationale = brRationales.get(qid) || '';
      const brTimeMs = brTimes.get(qid) || 0;
      
      if (!question || !previousAttempt) return null;

      return {
        qid,
        preAnswer: previousAttempt.selectedAnswer,
        brAnswer,
        brRationale,
        brTimeMs,
        brChanged: brAnswer !== previousAttempt.selectedAnswer,
        correct: brAnswer === question.correctAnswer,
      };
    }).filter(Boolean) as BRResult[];

    onComplete(results);
  };

  const handleEliminateAnswer = (answer: string) => {
    const newEliminated = new Set(eliminatedAnswers);
    if (newEliminated.has(answer)) {
      newEliminated.delete(answer);
    } else {
      newEliminated.add(answer);
    }
    setEliminatedAnswers(newEliminated);
  };

  if (!currentQuestion) {
    return <div>Loading...</div>;
  }

  const questionHighlights = highlights.get(currentQid) || [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h2 className="text-xl font-bold">Blind Review</h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="#"
                  value={jumpToInput}
                  onChange={(e) => setJumpToInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJumpTo()}
                  className="w-16 h-8"
                  min={1}
                  max={reviewQids.length}
                />
                <Button size="sm" onClick={handleJumpTo}>Go</Button>
              </div>

              <Button onClick={handleFinish} size="sm">
                Finish Review
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Question {currentIndex + 1} / {reviewQids.length}
            </div>
            <Progress value={progress} className="flex-1 h-1.5" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Toolbar */}
          <HighlightToolbar
            mode={highlightMode}
            onModeChange={setHighlightMode}
            onUndo={() => {}}
            canUndo={false}
            onToggleFlag={() => {}}
            isFlagged={false}
          />

          {/* Question Card */}
          <div className="bg-card border rounded-xl p-6 space-y-6">
            {/* Question ID */}
            <div className="text-sm text-muted-foreground font-mono">
              PT{currentQuestion.pt}-S{currentQuestion.section}-Q{currentQuestion.qnum} • {currentQuestion.qtype}
            </div>

            {/* Stimulus */}
            {currentQuestion.stimulus && (
              <div className="pl-4 py-2 border-l">
                <HighlightedText
                  text={normalizeText(currentQuestion.stimulus)}
                  highlights={questionHighlights.filter(h => h.section === 'stimulus')}
                  onHighlightClick={() => {}}
                  eraserMode={highlightMode === 'erase'}
                />
              </div>
            )}

            {/* Question Stem */}
            <div className="text-lg font-medium leading-relaxed">
              <HighlightedText
                text={normalizeText(currentQuestion.questionStem)}
                highlights={questionHighlights.filter(h => h.section === 'stem')}
                onHighlightClick={() => {}}
                eraserMode={highlightMode === 'erase'}
              />
            </div>

            {/* Answer Choices */}
            <RadioGroup value={currentAnswer} onValueChange={handleAnswerSelect}>
              {Object.entries(currentQuestion.answerChoices).map(([key, text]) => {
                const isEliminated = eliminatedAnswers.has(key);
                
                return (
                  <div
                    key={key}
                    className={cn(
                      "flex items-start gap-4 py-4 px-4 rounded-lg border transition-all duration-150",
                      "hover:bg-accent/30 cursor-pointer",
                      currentAnswer === key && "bg-primary/5 border-primary/50",
                      isEliminated && "opacity-40"
                    )}
                    onClick={() => !isEliminated && handleAnswerSelect(key)}
                  >
                    <RadioGroupItem value={key} id={`answer-${key}`} disabled={isEliminated} />
                    <Label
                      htmlFor={`answer-${key}`}
                      className={cn(
                        "flex-1 cursor-pointer leading-relaxed",
                        isEliminated && "line-through"
                      )}
                    >
                      <span className="font-semibold mr-3">({key})</span>
                      {text}
                    </Label>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEliminateAnswer(key);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isEliminated ? 'Restore' : 'Eliminate'}
                    </button>
                  </div>
                );
              })}
            </RadioGroup>

            {/* Rationale */}
            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="rationale" className="text-sm">
                Your rationale (one line)
              </Label>
              <Input
                id="rationale"
                value={currentRationale}
                onChange={(e) => handleRationaleChange(e.target.value)}
                placeholder="Why did you choose this answer?"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Footer Navigation */}
      <div className="sticky bottom-0 z-20 bg-card border-t">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            {reviewQids.map((qid, idx) => {
              const hasAnswer = brAnswers.has(qid);
              const hasRationale = (brRationales.get(qid) || '').trim().length > 0;
              
              return (
                <button
                  key={qid}
                  onClick={() => {
                    saveCurrentTime();
                    setCurrentIndex(idx);
                  }}
                  className={cn(
                    "w-8 h-8 rounded-full border text-xs font-medium transition-all duration-150",
                    idx === currentIndex && "ring-2 ring-primary ring-offset-2",
                    hasAnswer && hasRationale ? "bg-primary text-primary-foreground" : "bg-card",
                    "hover:scale-110"
                  )}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNext}
            disabled={currentIndex === reviewQids.length - 1}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
