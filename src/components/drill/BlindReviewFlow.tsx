import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { HighlightedText } from './HighlightedText';
import { HighlightToolbar } from './HighlightToolbar';
import { questionBank } from '@/lib/questionLoader';
import { normalizeText, cn } from '@/lib/utils';
import { captureTextSelection, replaceOverlappingHighlights, type Highlight, type HighlightColor } from '@/lib/highlightUtils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [brAnswer, setBrAnswer] = React.useState('');
  const [brRationale, setBrRationale] = React.useState('');
  const [startTime, setStartTime] = React.useState(performance.now());
  const [results, setResults] = React.useState<BlindReviewResult[]>([]);
  const [highlightMode, setHighlightMode] = React.useState<'none' | 'yellow' | 'pink' | 'orange' | 'underline' | 'erase'>('none');
  const [highlights, setHighlights] = React.useState<Map<string, Highlight[]>>(new Map());
  const [highlightHistory, setHighlightHistory] = React.useState<Map<string, Highlight[]>[]>([]);
  const [isFlagged, setIsFlagged] = React.useState(false);

  const currentQid = selectedQids[currentIndex];
  const currentQuestion = questionBank.getQuestion(currentQid);
  const previousAttempt = session.attempts.get(currentQid);
  const progress = ((currentIndex + 1) / selectedQids.length) * 100;
  const isLast = currentIndex === selectedQids.length - 1;

  React.useEffect(() => {
    setBrAnswer('');
    setBrRationale('');
    setStartTime(performance.now());
    setHighlightHistory([]);
    checkIfFlagged();
  }, [currentIndex]);

  const checkIfFlagged = async () => {
    if (!currentQuestion || !user) {
      setIsFlagged(false);
      return;
    }
    
    try {
      const { data } = await supabase
        .from('flagged_questions')
        .select('id')
        .eq('qid', currentQid)
        .eq('user_id', user.id)
        .maybeSingle();
      
      setIsFlagged(!!data);
    } catch (err) {
      console.error('Error checking flag:', err);
      setIsFlagged(false);
    }
  };

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

  const handleTextSelection = (e: React.MouseEvent, section: 'stimulus' | 'stem') => {
    if (highlightMode === 'none' || highlightMode === 'erase') return;
    
    const container = e.currentTarget as HTMLElement;
    const selection = captureTextSelection(container);
    
    if (!selection || !currentQuestion) return;
    
    const newHighlight: Highlight = {
      id: crypto.randomUUID(),
      start: selection.start,
      end: selection.end,
      text: selection.text,
      color: highlightMode as HighlightColor,
      section
    };
    
    const currentHighlights = highlights.get(currentQid) || [];
    
    const MAX_HISTORY = 20;
    setHighlightHistory(prev => {
      const newHistory = [...prev, new Map(highlights)];
      return newHistory.slice(-MAX_HISTORY);
    });
    
    const updatedHighlights = replaceOverlappingHighlights(currentHighlights, newHighlight);
    const newHighlights = new Map(highlights);
    newHighlights.set(currentQid, updatedHighlights);
    setHighlights(newHighlights);
    
    window.getSelection()?.removeAllRanges();
  };

  const handleHighlightClick = (highlightId: string) => {
    if (highlightMode !== 'erase' || !currentQuestion) return;
    
    setHighlightHistory(prev => {
      const newHistory = [...prev, new Map(highlights)];
      return newHistory.slice(-20);
    });
    
    const currentHighlights = highlights.get(currentQid) || [];
    const updated = currentHighlights.filter(h => h.id !== highlightId);
    const newHighlights = new Map(highlights);
    newHighlights.set(currentQid, updated);
    setHighlights(newHighlights);
  };

  const handleUndo = () => {
    if (highlightHistory.length === 0) return;
    
    const previousState = highlightHistory[highlightHistory.length - 1];
    setHighlights(new Map(previousState));
    setHighlightHistory(prev => prev.slice(0, -1));
  };

  const handleToggleFlag = async () => {
    if (!currentQuestion || !user) return;
    
    try {
      if (isFlagged) {
        await supabase
          .from('flagged_questions')
          .delete()
          .eq('qid', currentQid)
          .eq('user_id', user.id);
        setIsFlagged(false);
      } else {
        await supabase
          .from('flagged_questions')
          .insert({
            qid: currentQid,
            pt: currentQuestion.pt,
            section: currentQuestion.section,
            qnum: currentQuestion.qnum,
            user_id: user.id,
          });
        setIsFlagged(true);
      }
    } catch (err) {
      console.error('Error toggling flag:', err);
    }
  };

  if (!currentQuestion) {
    return <div>Loading...</div>;
  }

  const questionHighlights = highlights.get(currentQid) || [];

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
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Highlight Toolbar */}
          <HighlightToolbar
            mode={highlightMode}
            onModeChange={setHighlightMode}
            onUndo={handleUndo}
            canUndo={highlightHistory.length > 0}
            onToggleFlag={handleToggleFlag}
            isFlagged={isFlagged}
          />

          <Card className="p-6 space-y-6">
            {/* Stimulus */}
            {currentQuestion.stimulus && (
              <div 
                className={cn(
                  "pl-4 py-2 border-l-2 border-muted",
                  (highlightMode !== 'none' && highlightMode !== 'erase') ? 'select-text cursor-text' : 'select-none cursor-default'
                )}
                onMouseUp={(e) => handleTextSelection(e, 'stimulus')}
              >
                <HighlightedText
                  text={normalizeText(currentQuestion.stimulus)}
                  highlights={questionHighlights.filter(h => h.section === 'stimulus')}
                  onHighlightClick={handleHighlightClick}
                  eraserMode={highlightMode === 'erase'}
                />
              </div>
            )}

            {/* Question Stem */}
            <div className="space-y-4">
              <div 
                className={cn(
                  "font-medium",
                  (highlightMode !== 'none' && highlightMode !== 'erase') ? 'select-text cursor-text' : 'select-none cursor-default'
                )}
                onMouseUp={(e) => handleTextSelection(e, 'stem')}
              >
                <HighlightedText
                  text={normalizeText(currentQuestion.questionStem)}
                  highlights={questionHighlights.filter(h => h.section === 'stem')}
                  onHighlightClick={handleHighlightClick}
                  eraserMode={highlightMode === 'erase'}
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
    </div>
  );
}
