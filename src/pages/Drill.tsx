import * as React from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { TimerControls } from '@/components/drill/TimerControls';
import { ReviewModal } from '@/components/drill/ReviewModal';
import { TimerProvider, useTimerContext } from '@/contexts/TimerContext';
import { questionBank } from '@/lib/questionLoader';
import { AdaptiveEngine } from '@/lib/adaptiveEngine';
import { normalizeText } from '@/lib/utils';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import type { LRQuestion } from '@/lib/questionLoader';
import type { DrillMode, DrillSession, FullSectionConfig, TypeDrillConfig, TimerMode } from '@/types/drill';

const adaptiveEngine = new AdaptiveEngine();

function DrillContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { 
    mode: DrillMode; 
    config?: FullSectionConfig | TypeDrillConfig;
  };

  const [session, setSession] = React.useState<DrillSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = React.useState<LRQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = React.useState<string>('');
  const [confidence, setConfidence] = React.useState<number | null>(null);
  const [showSolution, setShowSolution] = React.useState(false);
  const [showReviewModal, setShowReviewModal] = React.useState(false);
  const [questionStartTime, setQuestionStartTime] = React.useState(performance.now());
  const [hasTimer, setHasTimer] = React.useState(false);
  const [answerLocked, setAnswerLocked] = React.useState(false);
  
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
      
      let selected: LRQuestion[];
      if (config.balanced) {
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
        selected = [];
        const groupArrays = Array.from(groups.values());
        let roundIndex = 0;
        
        while (selected.length < config.count && groupArrays.some(g => g.length > 0)) {
          for (const group of groupArrays) {
            if (group.length > 0 && selected.length < config.count) {
              selected.push(group.shift()!);
            }
          }
          roundIndex++;
        }
        
        // Final shuffle for variety
        for (let i = selected.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [selected[i], selected[j]] = [selected[j], selected[i]];
        }
      } else {
        // Random selection
        const shuffled = questionBank.shuffleQuestions(filtered);
        selected = shuffled.slice(0, config.count);
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
    setShowReviewModal(false);
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
    if (answerLocked && confidence !== null && !showSolution && !showReviewModal) {
      handleSubmit();
    }
  }, [confidence, answerLocked, showSolution, showReviewModal]);

  const handleReviewSave = async (review: { whyWrong: string; whyEliminated: string; plan: string }) => {
    if (!currentQuestion || !selectedAnswer || !session || confidence === null) return;

    const timeMs = Math.floor(performance.now() - questionStartTime);
    const correct = selectedAnswer === currentQuestion.correctAnswer;

    const newAttempts = new Map(session.attempts);
    newAttempts.set(currentQuestion.qid, {
      selectedAnswer,
      correct,
      timeMs,
      timestamp: Date.now(),
      confidence,
      reviewDone: true,
    });

    adaptiveEngine.recordAttempt({
      qid: currentQuestion.qid,
      correct,
      time_ms: timeMs,
      qtype: currentQuestion.qtype,
      difficulty: currentQuestion.difficulty,
      timestamp: new Date(),
    });

    // Auto-log to WAJ
    const { logWrongAnswer } = await import('@/lib/wajService');
    try {
      await logWrongAnswer({
        class_id: 'demo-class', // TODO: get from auth context
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

    setSession({ ...session, attempts: newAttempts });
    setShowReviewModal(false);
    setShowSolution(true);
  };

  const handleSubmit = async () => {
    if (!currentQuestion || !selectedAnswer || confidence === null || !session) return;

    const correct = selectedAnswer === currentQuestion.correctAnswer;
    const timeMs = Math.floor(performance.now() - questionStartTime);

    if (!correct) {
      setShowReviewModal(true);
    } else {
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
          class_id: 'demo-class', // TODO: get from auth context
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

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
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
          <Progress value={progress} className="h-2" />
        )}
      </div>

      {/* Question */}
      <Card className="max-w-4xl mx-auto p-8">
        <div className="space-y-6">
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
          {currentQuestion.stimulus && (
            <div className="p-4 bg-muted/50 rounded-lg stimulus">
              {normalizeText(currentQuestion.stimulus).split('\n\n').map((para, i) => (
                <p key={i} style={{ margin: '0 0 12px', lineHeight: 1.6 }}>
                  {para}
                </p>
              ))}
            </div>
          )}

          {/* Question stem */}
          <div className="text-lg font-semibold question-stem" style={{ marginTop: '16px' }}>
            {normalizeText(currentQuestion.questionStem).split('\n\n').map((para, i) => (
              <p key={i} style={{ margin: '0 0 12px', lineHeight: 1.6 }}>
                {para}
              </p>
            ))}
          </div>

          {/* Answer choices */}
          <RadioGroup
            value={selectedAnswer}
            onValueChange={handleAnswerSelect}
            disabled={answerLocked}
          >
            {Object.entries(currentQuestion.answerChoices).map(([key, text]) => {
              const isCorrect = key === currentQuestion.correctAnswer;
              const isSelected = key === selectedAnswer;
              const showFeedback = answerLocked && isSelected && confidence !== null;

              return (
                <div
                  key={key}
                  className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors ${
                    showFeedback && isCorrect
                      ? 'border-[#16A34A] bg-[#16A34A]/10'
                      : showFeedback && !isCorrect
                      ? 'border-[#DC2626] bg-[#DC2626]/10'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value={key} id={`answer-${key}`} />
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
            })}
          </RadioGroup>

          {/* Confidence selector */}
          {answerLocked && (
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
        </div>
      </Card>

      <ReviewModal
        open={showReviewModal}
        onSave={handleReviewSave}
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
