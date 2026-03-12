import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, ArrowLeft, XCircle } from 'lucide-react';
import { HighlightedText } from './HighlightedText';
import { HighlightToolbar } from './HighlightToolbar';
import { questionBank } from '@/lib/questionLoader';
import { normalizeText, cn } from '@/lib/utils';
import { QuestionTimer } from '@/lib/questionTimer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { DrillSession, BlindReviewResult } from '@/types/drill';
import type { Highlight, HighlightColor } from '@/lib/highlightUtils';

interface EnhancedBlindReviewProps {
  session: DrillSession;
  reviewQids: string[];
  onComplete: (results: BlindReviewResult[]) => void;
  onBack: () => void;
}

export function EnhancedBlindReview({ session, reviewQids, onComplete, onBack }: EnhancedBlindReviewProps) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [brAnswers, setBrAnswers] = React.useState<Map<string, string>>(new Map());
  const [brRationales, setBrRationales] = React.useState<Map<string, string>>(new Map());
  const [eliminatedAnswers, setEliminatedAnswers] = React.useState<Map<string, Set<string>>>(new Map());
  const [highlightMode, setHighlightMode] = React.useState<'none' | 'yellow' | 'pink' | 'orange' | 'underline' | 'erase'>('none');
  const [highlights, setHighlights] = React.useState<Map<string, Highlight[]>>(new Map());
  const [highlightHistory, setHighlightHistory] = React.useState<Map<string, Highlight[]>[]>([]);
  const [flaggedQuestions, setFlaggedQuestions] = React.useState<Set<string>>(new Set());
  const [jumpToInput, setJumpToInput] = React.useState('');
  const timerRef = React.useRef(new QuestionTimer());
  const [longPressTimer, setLongPressTimer] = React.useState<ReturnType<typeof setTimeout> | null>(null);

  const currentQid = reviewQids[currentIndex];
  const currentQuestion = questionBank.getQuestion(currentQid);
  const previousAttempt = session.attempts.get(currentQid);
  const progress = ((currentIndex + 1) / reviewQids.length) * 100;

  const currentAnswer = brAnswers.get(currentQid) || '';
  const currentRationale = brRationales.get(currentQid) || '';

  // Load flagged questions on mount
  React.useEffect(() => {
    const loadFlaggedQuestions = async () => {
      if (!user) return;
      
      try {
        const { data } = await supabase
          .from('flagged_questions')
          .select('qid')
          .eq('user_id', user.id)
          .in('qid', reviewQids);
        
        if (data) {
          setFlaggedQuestions(new Set(data.map(d => d.qid)));
        }
      } catch (err) {
        console.error('Error loading flagged questions:', err);
      }
    };
    
    loadFlaggedQuestions();
  }, [user, reviewQids]);

  // Start timing when question changes
  React.useEffect(() => {
    timerRef.current.start(currentQid);
    
    return () => {
      timerRef.current.pause();
    };
  }, [currentIndex, currentQid]);

  const handleAnswerSelect = (answer: string) => {
    // Toggle behavior: clicking same answer deselects it
    const newAnswer = brAnswers.get(currentQid) === answer ? '' : answer;
    const newMap = new Map(brAnswers);
    newMap.set(currentQid, newAnswer);
    setBrAnswers(newMap);
    timerRef.current.recordAnswer(currentQid, newAnswer);
  };

  const handleRationaleChange = (rationale: string) => {
    setBrRationales(new Map(brRationales.set(currentQid, rationale)));
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      timerRef.current.pause();
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < reviewQids.length - 1) {
      timerRef.current.pause();
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleJumpTo = () => {
    const num = parseInt(jumpToInput);
    if (num >= 1 && num <= reviewQids.length) {
      timerRef.current.pause();
      setCurrentIndex(num - 1);
      setJumpToInput('');
    }
  };

  const handleFinish = () => {
    timerRef.current.pause();
    
    const results: BlindReviewResult[] = reviewQids.map(qid => {
      const question = questionBank.getQuestion(qid);
      const previousAttempt = session.attempts.get(qid);
      const brAnswer = brAnswers.get(qid) || '';
      const brRationale = brRationales.get(qid) || '';
      const metrics = timerRef.current.getMetrics(qid);
      
      if (!question) return null;

      // Handle unanswered questions (no previous attempt)
      const preAnswer = previousAttempt?.selectedAnswer || '';
      const preCorrect = previousAttempt?.correct || false;

      return {
        qid,
        preAnswer,
        brAnswer,
        brRationale,
        brTimeMs: metrics.totalTimeMs,
        brChanged: brAnswer !== preAnswer,
        correct: brAnswer === question.correctAnswer,
        preCorrect,
        switchCount: metrics.answerSwitchCount,
        revisitCount: metrics.revisitCount,
      };
    }).filter(Boolean) as BlindReviewResult[];

    onComplete(results);
  };

  const handleEliminateAnswer = (answer: string) => {
    const qidEliminated = eliminatedAnswers.get(currentQid) || new Set<string>();
    const newQidEliminated = new Set(qidEliminated);
    
    if (newQidEliminated.has(answer)) {
      newQidEliminated.delete(answer);
    } else {
      newQidEliminated.add(answer);
      // Deselect if currently selected
      if (brAnswers.get(currentQid) === answer) {
        setBrAnswers(new Map(brAnswers.set(currentQid, '')));
        timerRef.current.recordAnswer(currentQid, '');
      }
    }
    
    setEliminatedAnswers(new Map(eliminatedAnswers.set(currentQid, newQidEliminated)));
  };

  const handleToggleFlag = async () => {
    if (!user || !currentQuestion) return;
    
    const isCurrentlyFlagged = flaggedQuestions.has(currentQid);
    
    try {
      if (isCurrentlyFlagged) {
        await supabase
          .from('flagged_questions')
          .delete()
          .eq('qid', currentQid)
          .eq('user_id', user.id);
        
        setFlaggedQuestions(prev => {
          const next = new Set(prev);
          next.delete(currentQid);
          return next;
        });
      } else {
        await supabase
          .from('flagged_questions')
          .insert({
            qid: currentQid,
            user_id: user.id,
            pt: currentQuestion.pt,
            section: currentQuestion.section,
            qnum: currentQuestion.qnum,
            class_id: user.user_metadata?.class_id || '',
          });
        
        setFlaggedQuestions(prev => new Set([...prev, currentQid]));
      }
    } catch (err) {
      console.error('Error toggling flag:', err);
    }
  };

  const handleUndo = () => {
    if (highlightHistory.length === 0) return;
    
    const previous = highlightHistory[highlightHistory.length - 1];
    setHighlights(new Map(previous));
    setHighlightHistory(highlightHistory.slice(0, -1));
  };

  const handleLongPressStart = (answer: string) => {
    const timer = setTimeout(() => {
      handleEliminateAnswer(answer);
    }, 500); // 500ms for long press
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  if (!currentQuestion) {
    return <div>Loading...</div>;
  }

  const questionHighlights = highlights.get(currentQid) || [];
  const currentEliminated = eliminatedAnswers.get(currentQid) || new Set<string>();
  const isFlagged = flaggedQuestions.has(currentQid);

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
            onUndo={handleUndo}
            canUndo={highlightHistory.length > 0}
            onToggleFlag={handleToggleFlag}
            isFlagged={isFlagged}
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
                const isEliminated = currentEliminated.has(key);
                
                return (
                  <div
                    key={key}
                    className={cn(
                      "flex items-start gap-4 py-4 px-4 rounded-lg border",
                      "transition-all duration-[120ms] ease-out",
                      "hover:bg-accent/30 cursor-pointer",
                      currentAnswer === key && "bg-primary/5 border-primary/50",
                      isEliminated && "opacity-55"
                    )}
                    onClick={() => !isEliminated && handleAnswerSelect(key)}
                    onMouseDown={() => handleLongPressStart(key)}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    onTouchStart={() => handleLongPressStart(key)}
                    onTouchEnd={handleLongPressEnd}
                    onTouchCancel={handleLongPressEnd}
                  >
                    <RadioGroupItem 
                      value={key} 
                      id={`answer-${key}`} 
                      disabled={isEliminated}
                      className="mt-1"
                    />
                    <Label
                      htmlFor={`answer-${key}`}
                      className={cn(
                        "flex-1 cursor-pointer leading-relaxed select-none",
                        "transition-all duration-[120ms]",
                        isEliminated && "line-through decoration-2 decoration-muted-foreground"
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
                      className={cn(
                        "shrink-0 flex items-center justify-center",
                        "w-11 h-11 -my-2 -mr-2",
                        "rounded-md transition-all duration-[120ms]",
                        "hover:bg-accent/50 active:scale-95",
                        "text-muted-foreground hover:text-foreground"
                      )}
                      aria-pressed={isEliminated}
                      aria-label={`Cross out choice ${key}`}
                      title={isEliminated ? `Restore choice ${key}` : `Cross out choice ${key}`}
                    >
                      <XCircle 
                        className={cn(
                          "w-5 h-5 transition-all duration-[120ms]",
                          isEliminated ? "fill-current" : "fill-none"
                        )} 
                      />
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
                    timerRef.current.pause();
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
