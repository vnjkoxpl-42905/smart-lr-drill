import * as React from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { TimerControls } from '@/components/drill/TimerControls';
import { questionBank } from '@/lib/questionLoader';
import { AdaptiveEngine } from '@/lib/adaptiveEngine';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import type { LRQuestion } from '@/lib/questionLoader';
import type { DrillMode, DrillSession, TimerConfig, FullSectionConfig, TypeDrillConfig } from '@/types/drill';

const adaptiveEngine = new AdaptiveEngine();

export default function Drill() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { 
    mode: DrillMode; 
    config?: FullSectionConfig | TypeDrillConfig;
  };

  const [session, setSession] = React.useState<DrillSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = React.useState<LRQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = React.useState<string>('');
  const [showSolution, setShowSolution] = React.useState(false);
  const [questionStartTime, setQuestionStartTime] = React.useState(Date.now());
  const [timerConfig, setTimerConfig] = React.useState<TimerConfig | null>(null);

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
      setTimerConfig(config.timer);
    } else if (mode === 'type-drill' && state.config) {
      const config = state.config as TypeDrillConfig;
      const filtered = questionBank.getQuestionsByFilter({
        qtypes: config.qtypes.length > 0 ? config.qtypes : undefined,
        difficulties: config.difficulties.length > 0 ? config.difficulties : undefined,
        pts: config.pts.length > 0 ? config.pts : undefined,
      });
      const shuffled = questionBank.shuffleQuestions(filtered);
      questionQueue = shuffled.slice(0, config.count).map(q => q.qid);
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
    setShowSolution(false);
    setQuestionStartTime(Date.now());
  }, [session]);

  const handleSubmit = () => {
    if (!currentQuestion || !selectedAnswer || !session) return;

    const timeMs = Date.now() - questionStartTime;
    const correct = selectedAnswer === currentQuestion.correctAnswer;

    // Record attempt
    const newAttempts = new Map(session.attempts);
    newAttempts.set(currentQuestion.qid, {
      selectedAnswer,
      correct,
      timeMs,
      timestamp: Date.now(),
    });

    adaptiveEngine.recordAttempt({
      qid: currentQuestion.qid,
      correct,
      time_ms: timeMs,
      qtype: currentQuestion.qtype,
      difficulty: currentQuestion.difficulty,
      timestamp: new Date(),
    });

    setSession({ ...session, attempts: newAttempts });
    setShowSolution(true);
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

  const handlePause = () => {
    if (!timerConfig) return;
    const elapsed = Date.now() - timerConfig.startedAt + timerConfig.elapsedMs;
    setTimerConfig({
      ...timerConfig,
      isPaused: true,
      elapsedMs: elapsed,
    });
  };

  const handleResume = () => {
    if (!timerConfig) return;
    setTimerConfig({
      ...timerConfig,
      isPaused: false,
      startedAt: Date.now(),
    });
  };

  const handleTimeUpdate = (elapsedMs: number) => {
    if (!timerConfig) return;
    setTimerConfig({
      ...timerConfig,
      elapsedMs,
    });
  };

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
            {timerConfig && (
              <TimerControls
                config={timerConfig}
                onPause={handlePause}
                onResume={handleResume}
                onTimeUpdate={handleTimeUpdate}
              />
            )}
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
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="whitespace-pre-wrap">{currentQuestion.stimulus}</p>
            </div>
          )}

          {/* Question stem */}
          <div className="text-lg font-semibold">
            {currentQuestion.questionStem}
          </div>

          {/* Answer choices */}
          <RadioGroup
            value={selectedAnswer}
            onValueChange={setSelectedAnswer}
            disabled={showSolution}
          >
            {Object.entries(currentQuestion.answerChoices).map(([key, text]) => (
              <div
                key={key}
                className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors ${
                  showSolution && key === currentQuestion.correctAnswer
                    ? 'border-green-500 bg-green-50'
                    : showSolution && key === selectedAnswer && key !== currentQuestion.correctAnswer
                    ? 'border-red-500 bg-red-50'
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
                </Label>
              </div>
            ))}
          </RadioGroup>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {!showSolution ? (
              <Button
                onClick={handleSubmit}
                disabled={!selectedAnswer || timerConfig?.isPaused}
                size="lg"
              >
                Submit Answer
              </Button>
            ) : (
              <Button onClick={handleNext} size="lg">
                Next Question
              </Button>
            )}
          </div>

          {/* Solution */}
          {showSolution && (
            <div className="mt-6 p-4 border-t">
              <div className="flex items-center gap-2 mb-2">
                {selectedAnswer === currentQuestion.correctAnswer ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className="font-semibold">
                  {selectedAnswer === currentQuestion.correctAnswer
                    ? 'Correct!'
                    : `Incorrect. The correct answer is (${currentQuestion.correctAnswer}).`}
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
