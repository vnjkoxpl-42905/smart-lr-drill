import * as React from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TimerControls } from '@/components/drill/TimerControls';
import { TutorChatModal } from '@/components/drill/TutorChatModal';
import { ReviewModal } from '@/components/drill/ReviewModal';
import { HighlightToolbar } from '@/components/drill/HighlightToolbar';
import { HighlightedText } from '@/components/drill/HighlightedText';
import { TimerProvider, useTimerContext } from '@/contexts/TimerContext';
import { questionBank } from '@/lib/questionLoader';
import { AdaptiveEngine } from '@/lib/adaptiveEngine';
import { normalizeText } from '@/lib/utils';
import { captureTextSelection, mergeOverlappingHighlights, type Highlight } from '@/lib/highlightUtils';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { LRQuestion } from '@/lib/questionLoader';
import type { DrillMode, DrillSession, FullSectionConfig, TypeDrillConfig, TimerMode } from '@/types/drill';

const adaptiveEngine = new AdaptiveEngine();

function DrillContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const state = location.state as { 
    mode: DrillMode; 
    config?: FullSectionConfig | TypeDrillConfig;
  };

  React.useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  const [session, setSession] = React.useState<DrillSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = React.useState<LRQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = React.useState<string>('');
  const [confidence, setConfidence] = React.useState<number | null>(null);
  const [showSolution, setShowSolution] = React.useState(false);
  const [tutorChatOpen, setTutorChatOpen] = React.useState(false);
  const [wajModalOpen, setWajModalOpen] = React.useState(false);
  const [questionStartTime, setQuestionStartTime] = React.useState(performance.now());
  const [hasTimer, setHasTimer] = React.useState(false);
  const [answerLocked, setAnswerLocked] = React.useState(false);
  const [highlightMode, setHighlightMode] = React.useState<'none' | 'highlight' | 'erase'>('none');
  const [highlights, setHighlights] = React.useState<Map<string, Highlight[]>>(new Map());
  
  const timer = hasTimer ? useTimerContext() : null;

  // Initialize session
  React.useEffect(() => {
    if (!state?.mode) {
      navigate('/');
      return;
    }

    const mode = state.mode;
    let questionQueue: string[] = [];

    if (mode === 'adaptive') {
      // Adaptive: start with random pool, engine will select
      const allQuestions = questionBank.getAllQuestions();
      questionQueue = allQuestions.map(q => q.qid);
    } else if (mode === 'full-section' && state.config) {
      const config = state.config as FullSectionConfig;
      const sectionQuestions = questionBank.getSection(config.pt, config.section);
      questionQueue = sectionQuestions.map(q => q.qid);
      setHasTimer(config.timer.mode !== 'unlimited');
    } else if (mode === 'type-drill' && state.config) {
      const config = state.config as TypeDrillConfig;
      const filtered = questionBank.getQuestionsByFilter({
        qtypes: config.qtypes.length > 0 ? config.qtypes : undefined,
        difficulties: config.difficulties.length > 0 ? config.difficulties : undefined,
        pts: config.pts.length > 0 ? config.pts : undefined,
      });
      
      // Balanced mix: group by type × level, round-robin select
      const groups = new Map<string, LRQuestion[]>();
      
      // Group questions by type-level combo
      for (const q of filtered) {
        const key = `${q.qtype}-${q.difficulty}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(q);
      }
      
      // Shuffle each group
      for (const [, questions] of groups) {
        for (let i = questions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [questions[i], questions[j]] = [questions[j], questions[i]];
        }
      }
      
      // Round-robin select
      let selected: LRQuestion[] = [];
      const groupArrays = Array.from(groups.values());
      
      while (selected.length < config.count && groupArrays.some(g => g.length > 0)) {
        for (const group of groupArrays) {
          if (group.length > 0 && selected.length < config.count) {
            selected.push(group.shift()!);
          }
        }
      }
      
      // Final shuffle for variety
      for (let i = selected.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [selected[i], selected[j]] = [selected[j], selected[i]];
      }
      
      questionQueue = selected.map(q => q.qid);
    }

    setSession({
      mode,
      fullSectionConfig: mode === 'full-section' ? (state.config as FullSectionConfig) : undefined,
      typeDrillConfig: mode === 'type-drill' ? (state.config as TypeDrillConfig) : undefined,
      questionQueue,
      currentIndex: 0,
      attempts: new Map(),
    });
  }, [state, navigate]);

  // Load current question
  React.useEffect(() => {
    if (!session) return;

    if (session.mode === 'adaptive') {
      // Adaptive mode: use engine to select
      const allQuestions = questionBank.getAllQuestions();
      const recentQids = new Set(
        Array.from(session.attempts.keys()).slice(-10)
      );
      
      // Calculate current ability from attempts
      const attemptRecords = Array.from(session.attempts.entries()).map(([qid, attempt]) => {
        const q = questionBank.getQuestion(qid)!;
        return {
          qid,
          correct: attempt.correct,
          time_ms: attempt.timeMs,
          qtype: q.qtype,
          difficulty: q.difficulty,
          timestamp: new Date(attempt.timestamp),
        };
      });
      
      const ability = adaptiveEngine.calculateAbility(attemptRecords);
      const nextQuestion = adaptiveEngine.selectNextQuestion(allQuestions, ability, 0.15);
      
      setCurrentQuestion(nextQuestion);
    } else {
      // Full Section or Type Drill: sequential
      if (session.currentIndex < session.questionQueue.length) {
        const qid = session.questionQueue[session.currentIndex];
        const question = questionBank.getQuestion(qid);
        setCurrentQuestion(question || null);
      } else {
        // Finished
        setCurrentQuestion(null);
      }
    }

    setSelectedAnswer('');
    setConfidence(null);
    setShowSolution(false);
    setTutorChatOpen(false);
    setAnswerLocked(false);
    setQuestionStartTime(performance.now());
  }, [session]);

  const handleAnswerSelect = (answer: string) => {
    if (answerLocked) return;
    setSelectedAnswer(answer);
    setAnswerLocked(true);
  };

  // Auto-submit when confidence is selected
  React.useEffect(() => {
    if (answerLocked && confidence !== null && !showSolution && !tutorChatOpen) {
      handleSubmit();
    }
  }, [confidence, answerLocked, showSolution, tutorChatOpen]);

  const handleTryAgain = () => {
    setTutorChatOpen(false);
    setSelectedAnswer('');
    setConfidence(null);
    setAnswerLocked(false);
    setQuestionStartTime(performance.now());
  };

  const handleContinueToReview = () => {
    setTutorChatOpen(false);
    setWajModalOpen(true);
  };

  const saveAttemptToDatabase = async (attemptData: {
    qid: string;
    correct: boolean;
    time_ms: number;
    qtype: string;
    level: number;
    confidence: number | null;
    mode: DrillMode;
  }) => {
    const question = questionBank.getQuestion(attemptData.qid);
    if (!question) return;
    
    try {
      const { error } = await (supabase as any).from('attempts').insert({
        user_id: user?.id,
        qid: attemptData.qid,
        pt: question.pt,
        section: question.section,
        qnum: question.qnum,
        qtype: attemptData.qtype,
        level: attemptData.level,
        correct: attemptData.correct,
        time_ms: attemptData.time_ms,
        confidence: attemptData.confidence,
        mode: attemptData.mode,
        timestamp_iso: new Date().toISOString(),
      });

      if (error) {
        console.error('Failed to save attempt to database:', error);
      }
    } catch (err) {
      console.error('Error saving attempt:', err);
    }
  };

  const handleWAJSave = async (review: { whyWrong: string; whyEliminated: string; plan: string }) => {
    if (!currentQuestion || !session) return;
    
    const timeMs = Math.floor(performance.now() - questionStartTime);
    
    // Save to attempts database (final attempt after review)
    await saveAttemptToDatabase({
      qid: currentQuestion.qid,
      correct: false,
      time_ms: timeMs,
      qtype: currentQuestion.qtype,
      level: currentQuestion.difficulty,
      confidence,
      mode: session.mode,
    });
    
    // Save to WAJ database with real review data
    const { logWrongAnswer } = await import('@/lib/wajService');
    try {
      await logWrongAnswer({
        user_id: user?.id || '',
        qid: currentQuestion.qid,
        pt: currentQuestion.pt,
        section: currentQuestion.section,
        qnum: currentQuestion.qnum,
        qtype: currentQuestion.qtype,
        level: currentQuestion.difficulty,
        chosen_answer: selectedAnswer,
        correct_answer: currentQuestion.correctAnswer,
        time_ms: timeMs,
        confidence_1_5: confidence,
        review: {
          q1: review.whyWrong,
          q2: review.whyEliminated,
          q3: review.plan,
        },
      });
    } catch (error) {
      console.error('Failed to log to WAJ:', error);
    }

    // Update session
    const newAttempts = new Map(session.attempts);
    newAttempts.set(currentQuestion.qid, {
      selectedAnswer,
      correct: false,
      timeMs,
      timestamp: Date.now(),
      confidence,
      reviewDone: true,
    });

    // Record with adaptive engine (in-memory)
    adaptiveEngine.recordAttempt({
      qid: currentQuestion.qid,
      correct: false,
      time_ms: timeMs,
      qtype: currentQuestion.qtype,
      difficulty: currentQuestion.difficulty,
      timestamp: new Date(),
    });

    setSession({ ...session, attempts: newAttempts });
    setWajModalOpen(false);
    setShowSolution(true);
    
    // Auto-advance to next question after 1.5 seconds
    setTimeout(() => {
      handleNext();
    }, 1500);
  };

  const handleSubmit = async () => {
    if (!currentQuestion || !selectedAnswer || confidence === null || !session) return;

    const correct = selectedAnswer === currentQuestion.correctAnswer;
    const timeMs = Math.floor(performance.now() - questionStartTime);

    if (!correct) {
      setTutorChatOpen(true);
    } else {
      // Save correct attempt to database
      await saveAttemptToDatabase({
        qid: currentQuestion.qid,
        correct: true,
        time_ms: timeMs,
        qtype: currentQuestion.qtype,
        level: currentQuestion.difficulty,
        confidence,
        mode: session.mode,
      });

      const newAttempts = new Map(session.attempts);
      newAttempts.set(currentQuestion.qid, {
        selectedAnswer,
        correct,
        timeMs,
        timestamp: Date.now(),
        confidence,
        reviewDone: false,
      });

      adaptiveEngine.recordAttempt({
        qid: currentQuestion.qid,
        correct,
        time_ms: timeMs,
        qtype: currentQuestion.qtype,
        difficulty: currentQuestion.difficulty,
        timestamp: new Date(),
      });

      // Log correct answer to WAJ if there's an existing wrong entry
      const { logCorrectAnswer } = await import('@/lib/wajService');
      try {
        await logCorrectAnswer({
          user_id: user?.id || '',
          qid: currentQuestion.qid,
          pt: currentQuestion.pt,
          section: currentQuestion.section,
          qnum: currentQuestion.qnum,
          qtype: currentQuestion.qtype,
          level: currentQuestion.difficulty,
          chosen_answer: selectedAnswer,
          correct_answer: currentQuestion.correctAnswer,
          time_ms: timeMs,
          confidence_1_5: confidence,
        });
      } catch (error) {
        console.error('Failed to log to WAJ:', error);
      }

      setSession({ ...session, attempts: newAttempts });
      setShowSolution(true);
    }
  };


  const handleNext = () => {
    if (!session) return;

    if (session.mode === 'adaptive') {
      // Just trigger re-render to get next question
      setSession({ ...session });
    } else {
      // Move to next in queue
      setSession({
        ...session,
        currentIndex: session.currentIndex + 1,
      });
    }
  };

  const handleTextSelection = (e: React.MouseEvent, section: 'stimulus' | 'stem') => {
    if (highlightMode !== 'highlight') return;
    
    const container = e.currentTarget as HTMLElement;
    const selection = captureTextSelection(container);
    
    if (!selection || !currentQuestion) return;
    
    const newHighlight: Highlight = {
      id: crypto.randomUUID(),
      start: selection.start,
      end: selection.end,
      text: selection.text,
      color: 'yellow',
      section
    };
    
    const currentHighlights = highlights.get(currentQuestion.qid) || [];
    const updatedHighlights = mergeOverlappingHighlights([...currentHighlights, newHighlight]);
    
    setHighlights(new Map(highlights.set(currentQuestion.qid, updatedHighlights)));
    
    // Clear selection
    window.getSelection()?.removeAllRanges();
  };

  const handleHighlightClick = (highlightId: string) => {
    if (highlightMode !== 'erase' || !currentQuestion) return;
    
    const currentHighlights = highlights.get(currentQuestion.qid) || [];
    const updated = currentHighlights.filter(h => h.id !== highlightId);
    
    setHighlights(new Map(highlights.set(currentQuestion.qid, updated)));
  };

  // Start timer on mount if applicable
  React.useEffect(() => {
    if (hasTimer && timer && !timer.running) {
      timer.start();
    }
  }, [hasTimer, timer]);

  if (!session || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-2xl">
          <h2 className="text-2xl font-bold mb-4">Session Complete</h2>
          <p className="text-muted-foreground mb-6">
            {session ? (
              <>
                You answered {session.attempts.size} questions.
                <br />
                Correct: {Array.from(session.attempts.values()).filter(a => a.correct).length} / {session.attempts.size}
              </>
            ) : (
              'Loading...'
            )}
          </p>
          <div className="flex gap-3">
            <Button onClick={() => navigate('/')}>
              Return Home
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              View Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const progress = session.mode !== 'adaptive'
    ? (session.currentIndex / session.questionQueue.length) * 100
    : undefined;

  const isAnswered = session.attempts.has(currentQuestion.qid);
  const previousAttempt = session.attempts.get(currentQuestion.qid);

  // Helper function to get answer groups split by selected answer
  const getAnswerGroups = () => {
    const answerEntries = Object.entries(currentQuestion.answerChoices);
    const selectedIndex = answerEntries.findIndex(([key]) => key === selectedAnswer);
    
    return {
      before: answerEntries.slice(0, selectedIndex),
      selected: answerEntries[selectedIndex],
      after: answerEntries.slice(selectedIndex + 1),
    };
  };

  // Helper function to render a single answer choice
  const renderAnswerChoice = (
    key: string, 
    text: string, 
    options: {
      isSelected?: boolean;
      showRadio?: boolean;
      inFocusedMode?: boolean;
    } = {}
  ) => {
    const { isSelected = false, showRadio = true, inFocusedMode = false } = options;
    const isCorrect = key === currentQuestion.correctAnswer;
    const showFeedback = answerLocked && isSelected && confidence !== null;

    return (
      <div
        key={key}
        className={cn(
          "flex items-start space-x-3 p-4 rounded-lg border transition-all duration-300",
          showFeedback && isCorrect && 'border-[#16A34A] bg-[#16A34A]/10',
          showFeedback && !isCorrect && 'border-[#DC2626] bg-[#DC2626]/10',
          !showFeedback && 'border-border hover:bg-muted/50',
          isSelected && tutorChatOpen && 'ring-2 ring-cyan-500/50 shadow-lg shadow-cyan-500/20',
        )}
      >
        {inFocusedMode && isSelected ? (
          <div className="w-4 h-4 mt-1 rounded-full bg-cyan-500 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>
        ) : showRadio ? (
          <RadioGroupItem value={key} id={`answer-${key}`} />
        ) : (
          <div className="w-4 h-4" />
        )}
        <Label
          htmlFor={`answer-${key}`}
          className="flex-1 cursor-pointer text-base leading-relaxed"
        >
          <span className="font-semibold mr-2">({key})</span>
          {text}
          {showFeedback && (
            <Badge
              variant={isCorrect ? 'default' : 'destructive'}
              className="ml-2"
            >
              {isCorrect ? 'Correct' : 'Wrong'}
            </Badge>
          )}
        </Label>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Exit
          </Button>

          <div className="flex items-center gap-6">
            {session.mode !== 'adaptive' && (
              <div className="text-sm text-muted-foreground">
                Question {session.currentIndex + 1} / {session.questionQueue.length}
              </div>
            )}
            {hasTimer && <TimerControls />}
          </div>
        </div>

        {progress !== undefined && (
          <Progress value={progress} className="h-2 mt-4" />
        )}
      </div>

      {/* Highlight Toolbar */}
      <div className="px-6 py-2 flex justify-end border-b">
        <HighlightToolbar mode={highlightMode} onModeChange={setHighlightMode} />
      </div>

      {/* Main Content - Resizable Panels */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Question and Stimulus */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* Question metadata */}
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="outline">
                    PT{currentQuestion.pt}-S{currentQuestion.section}-Q{currentQuestion.qnum}
                  </Badge>
                  <Badge variant="secondary">{currentQuestion.qtype}</Badge>
                  <Badge>Difficulty {currentQuestion.difficulty}</Badge>
                  {isAnswered && (
                    <Badge variant={previousAttempt?.correct ? 'default' : 'destructive'}>
                      {previousAttempt?.correct ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" /> Correct
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 mr-1" /> Incorrect
                        </>
                      )}
                    </Badge>
                  )}
                </div>

                {/* Stimulus */}
                {currentQuestion.stimulus && (() => {
                  const fullText = normalizeText(currentQuestion.stimulus);
                  const stimulusHighlights = highlights.get(currentQuestion.qid)?.filter(h => h.section === 'stimulus') || [];
                  
                  return (
                    <div 
                      className={`p-4 bg-muted/50 rounded-lg stimulus ${highlightMode === 'highlight' ? 'select-text' : 'select-none'}`}
                      contentEditable={false}
                      tabIndex={-1}
                      draggable={false}
                      onKeyDown={(e) => { if (highlightMode !== 'highlight') e.preventDefault(); }}
                      onDragStart={(e) => e.preventDefault()}
                      onDrop={(e) => e.preventDefault()}
                      onMouseDown={(e) => { if (highlightMode !== 'highlight') e.preventDefault(); }}
                      onTouchStart={(e) => { if (highlightMode !== 'highlight') e.preventDefault(); }}
                      onContextMenu={(e) => { if (highlightMode !== 'highlight') e.preventDefault(); }}
                      onMouseUp={(e) => handleTextSelection(e, 'stimulus')}
                      style={{ 
                        userSelect: highlightMode === 'highlight' ? 'text' : 'none',
                        WebkitUserSelect: highlightMode === 'highlight' ? 'text' : 'none',
                        WebkitTouchCallout: highlightMode === 'highlight' ? 'default' : 'none',
                        cursor: highlightMode === 'highlight' ? 'text' : 'default',
                        caretColor: highlightMode === 'highlight' ? 'auto' : 'transparent'
                      } as React.CSSProperties}
                    >
                      <HighlightedText
                        text={fullText}
                        highlights={stimulusHighlights}
                        onHighlightClick={handleHighlightClick}
                        eraserMode={highlightMode === 'erase'}
                      />
                    </div>
                  );
                })()}

                {/* Question stem */}
                {(() => {
                  const fullText = normalizeText(currentQuestion.questionStem);
                  const stemHighlights = highlights.get(currentQuestion.qid)?.filter(h => h.section === 'stem') || [];
                  
                  return (
                    <div 
                      className={`text-lg font-semibold question-stem ${highlightMode === 'highlight' ? 'select-text' : 'select-none'}`}
                      contentEditable={false}
                      tabIndex={-1}
                      draggable={false}
                      onKeyDown={(e) => { if (highlightMode !== 'highlight') e.preventDefault(); }}
                      onDragStart={(e) => e.preventDefault()}
                      onDrop={(e) => e.preventDefault()}
                      onMouseDown={(e) => { if (highlightMode !== 'highlight') e.preventDefault(); }}
                      onTouchStart={(e) => { if (highlightMode !== 'highlight') e.preventDefault(); }}
                      onContextMenu={(e) => { if (highlightMode !== 'highlight') e.preventDefault(); }}
                      style={{ 
                        marginTop: '16px',
                        userSelect: highlightMode === 'highlight' ? 'text' : 'none',
                        WebkitUserSelect: highlightMode === 'highlight' ? 'text' : 'none',
                        WebkitTouchCallout: highlightMode === 'highlight' ? 'default' : 'none',
                        cursor: highlightMode === 'highlight' ? 'text' : 'default',
                        caretColor: highlightMode === 'highlight' ? 'auto' : 'transparent'
                      } as React.CSSProperties}
                      onMouseUp={(e) => handleTextSelection(e, 'stem')}
                    >
                      <HighlightedText
                        text={fullText}
                        highlights={stemHighlights}
                        onHighlightClick={handleHighlightClick}
                        eraserMode={highlightMode === 'erase'}
                      />
                    </div>
                  );
                })()}
              </div>
            </ScrollArea>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Answer Choices */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <ScrollArea className="h-full">
              <div className="p-6">
                <Card className="p-6">
                  {/* Answer choices - Adaptive layout based on tutor state */}
                  {tutorChatOpen ? (
                    // FOCUSED LAYOUT: Highlight selected answer + Joshua
                    <div className="space-y-4">
                      {(() => {
                        const { before, selected, after } = getAnswerGroups();
                        
                        return (
                          <>
                            {/* Answers before selected - blurred */}
                            {before.length > 0 && (
                              <div className="space-y-2 blur-[2px] opacity-30 pointer-events-none transition-all duration-500">
                                {before.map(([key, text]) => renderAnswerChoice(key, text, { showRadio: false, inFocusedMode: true }))}
                              </div>
                            )}

                            {/* Selected answer - clear and prominent */}
                            <div className="relative">
                              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-lg blur-sm" />
                              <div className="relative">
                                {renderAnswerChoice(selected[0], selected[1], { 
                                  isSelected: true, 
                                  showRadio: false,
                                  inFocusedMode: true
                                })}
                              </div>
                            </div>

                            {/* Joshua chat - right below selected answer */}
                            <div className="pl-7">
                              <TutorChatModal
                                open={tutorChatOpen}
                                question={currentQuestion}
                                userAnswer={selectedAnswer}
                                onClose={handleContinueToReview}
                                onTryAgain={handleTryAgain}
                              />
                            </div>

                            {/* Answers after selected - blurred */}
                            {after.length > 0 && (
                              <div className="space-y-2 blur-[2px] opacity-30 pointer-events-none transition-all duration-500">
                                {after.map(([key, text]) => renderAnswerChoice(key, text, { showRadio: false, inFocusedMode: true }))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    // NORMAL LAYOUT: Standard RadioGroup
                    <RadioGroup
                      value={selectedAnswer}
                      onValueChange={handleAnswerSelect}
                      disabled={answerLocked}
                    >
                      {Object.entries(currentQuestion.answerChoices).map(([key, text]) => 
                        renderAnswerChoice(key, text, { 
                          isSelected: key === selectedAnswer,
                          showRadio: true 
                        })
                      )}
                    </RadioGroup>
                  )}

                  {/* Confidence selector */}
                  {answerLocked && !tutorChatOpen && (
                    <div className="space-y-3 pt-4">
                      <Label>Confidence (1–5)</Label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <Button
                            key={level}
                            variant={confidence === level ? 'default' : 'outline'}
                            onClick={() => setConfidence(level)}
                            className="flex-1"
                            disabled={showSolution}
                          >
                            {level}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handleNext}
                      disabled={!showSolution || timer?.isPaused}
                      size="lg"
                    >
                      Next question
                    </Button>
                  </div>

                  {/* Solution */}
                  {showSolution && (
                    <div className="mt-6 p-4 border-t">
                      <div className="flex items-center gap-2 mb-2">
                        {selectedAnswer === currentQuestion.correctAnswer ? (
                          <CheckCircle className="w-5 h-5 text-[#16A34A]" />
                        ) : (
                          <XCircle className="w-5 h-5 text-[#DC2626]" />
                        )}
                        <span className="font-semibold">
                          {selectedAnswer === currentQuestion.correctAnswer
                            ? 'Correct!'
                            : `The correct answer is (${currentQuestion.correctAnswer}).`}
                        </span>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </ScrollArea>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <ReviewModal
        open={wajModalOpen}
        onSave={handleWAJSave}
      />
    </div>
  );
}

export default function Drill() {
  const location = useLocation();
  const state = location.state as { 
    mode: DrillMode; 
    config?: FullSectionConfig | TypeDrillConfig;
  };

  // Calculate timer config
  const getTimerConfig = (): { mode: 'countdown' | 'stopwatch'; durationMs?: number } | null => {
    if (state?.mode === 'full-section' && state.config) {
      const config = state.config as FullSectionConfig;
      const timerMode = config.timer.mode;
      
      if (timerMode === 'unlimited') {
        return { mode: 'stopwatch' };
      }
      
      let durationMs: number;
      switch (timerMode) {
        case '35': durationMs = 35 * 60 * 1000; break;
        case '52.5': durationMs = 52.5 * 60 * 1000; break;
        case '70': durationMs = 70 * 60 * 1000; break;
        case 'custom': durationMs = (config.timer.customMinutes || 35) * 60 * 1000; break;
        default: durationMs = 35 * 60 * 1000;
      }
      
      return { mode: 'countdown', durationMs };
    }
    return null;
  };

  const timerConfig = getTimerConfig();

  if (timerConfig) {
    return (
      <TimerProvider mode={timerConfig.mode} durationMs={timerConfig.durationMs}>
        <DrillContent />
      </TimerProvider>
    );
  }

  return <DrillContent />;
}
