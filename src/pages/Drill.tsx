import * as React from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { TimerControls } from '@/components/drill/TimerControls';
import { TutorChatModal } from '@/components/drill/TutorChatModal';
import { ConfidenceSelector } from '@/components/drill/ConfidenceSelector';
import { ReviewModal } from '@/components/drill/ReviewModal';
import { VoiceCoachChip } from '@/components/drill/VoiceCoachChip';
import { VoiceCoachModal } from '@/components/drill/VoiceCoachModal';
import { HighlightToolbar } from '@/components/drill/HighlightToolbar';
import { HighlightedText } from '@/components/drill/HighlightedText';
import { BlindReviewSelection } from '@/components/drill/BlindReviewSelection';
import { BlindReviewFlow, type BlindReviewResult } from '@/components/drill/BlindReviewFlow';
import { BlindReviewResults } from '@/components/drill/BlindReviewResults';
import { SectionComplete } from '@/components/drill/SectionComplete';
import { ScoreReport } from '@/components/drill/ScoreReport';
import { LRSectionResults } from '@/components/drill/LRSectionResults';
import { EnhancedBlindReview } from '@/components/drill/EnhancedBlindReview';
import { PracticeSetResults } from '@/components/drill/PracticeSetResults';
import { TimerProvider, useTimerContextSafe } from '@/contexts/TimerContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { questionBank } from '@/lib/questionLoader';
import { AdaptiveEngine } from '@/lib/adaptiveEngine';
import { normalizeText } from '@/lib/utils';
import { captureTextSelection, replaceOverlappingHighlights, type Highlight, type HighlightColor } from '@/lib/highlightUtils';
import { ArrowLeft, CheckCircle, X, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { LRQuestion } from '@/lib/questionLoader';
import type { DrillMode, DrillSession, FullSectionConfig, TypeDrillConfig, TimerMode } from '@/types/drill';
import { QuestionPoolService } from '@/lib/questionPoolService';
import { QuestionPoolChip } from '@/components/drill/QuestionPoolChip';
import { QuestionPoolExhausted } from '@/components/drill/QuestionPoolExhausted';
import { AdaptiveExplanationPanel } from '@/components/drill/AdaptiveExplanationPanel';
import { toast } from 'sonner';
import { QuestionTimer } from '@/lib/questionTimer';

const adaptiveEngine = new AdaptiveEngine();

function DrillContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useUserSettings();
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
  const [suppressAutoSubmitOnce, setSuppressAutoSubmitOnce] = React.useState(false);
  const [tutorQuestionSnapshot, setTutorQuestionSnapshot] = React.useState<LRQuestion | null>(null);
  const [tutorAttemptNumber, setTutorAttemptNumber] = React.useState(1);
  const [advanceToken, setAdvanceToken] = React.useState(0);
  
  const [tutorMessages, setTutorMessages] = React.useState<Array<{role: 'user' | 'assistant'; content: string}>>([]);
  const [wajModalOpen, setWajModalOpen] = React.useState(false);
  const [voiceCoachOpen, setVoiceCoachOpen] = React.useState(false);
  const [showVoiceChip, setShowVoiceChip] = React.useState(false);
  const [questionStartTime, setQuestionStartTime] = React.useState(performance.now());
  const [hasTimer, setHasTimer] = React.useState(false);
  const [answerLocked, setAnswerLocked] = React.useState(false);
  const [eliminatedAnswers, setEliminatedAnswers] = React.useState<Set<string>>(new Set());
  const [highlightMode, setHighlightMode] = React.useState<'none' | 'yellow' | 'pink' | 'orange' | 'underline' | 'erase'>('none');
  const [highlights, setHighlights] = React.useState<Map<string, Highlight[]>>(new Map());
  const [highlightHistory, setHighlightHistory] = React.useState<Map<string, Highlight[]>[]>([]);
  const [isFlagged, setIsFlagged] = React.useState(false);
  const [showExitDialog, setShowExitDialog] = React.useState(false);
  const [exitDestination, setExitDestination] = React.useState<'/' | '/dashboard'>('/');
  const [brMarked, setBrMarked] = React.useState<Set<string>>(new Set());
  const [showBRSelection, setShowBRSelection] = React.useState(false);
  const [showBRFlow, setShowBRFlow] = React.useState(false);
  const [brSelectedQids, setBrSelectedQids] = React.useState<string[]>([]);
  const [brResults, setBrResults] = React.useState<any[]>([]);
  const [showBRResults, setShowBRResults] = React.useState(false);
  const [isRetryAfterWrong, setIsRetryAfterWrong] = React.useState(false);
  const [correctExplanation, setCorrectExplanation] = React.useState<string>('');
  const [showReviewButton, setShowReviewButton] = React.useState(false);
  const [isGrading, setIsGrading] = React.useState(false);
  const [hadWrongAttempt, setHadWrongAttempt] = React.useState(false); // Track if user had any wrong attempts
  
  // New post-section flow states
  const [postSectionScreen, setPostSectionScreen] = React.useState<'complete' | 'review' | 'score-report' | null>(null);
  const [autoReviewQids, setAutoReviewQids] = React.useState<string[]>([]);
  const [longPressTimer, setLongPressTimer] = React.useState<ReturnType<typeof setTimeout> | null>(null);
  
  // Question pool state
  const [poolStatus, setPoolStatus] = React.useState<string>('');
  const [totalPoolSize, setTotalPoolSize] = React.useState(0);
  const [availablePoolSize, setAvailablePoolSize] = React.useState(0);
  const [poolExhausted, setPoolExhausted] = React.useState(false);
  const [classId, setClassId] = React.useState<string>('');
  
  // Practice-set mode state
  const [isPracticeSetMode, setIsPracticeSetMode] = React.useState(false);
  const questionTimer = React.useRef(new QuestionTimer());
  const [hideTimer, setHideTimer] = React.useState(false);
  const [showAnswerRevealed, setShowAnswerRevealed] = React.useState<Map<string, boolean>>(new Map());
  
  const timer = useTimerContextSafe();

  // BR only for Full Section and Type Drill modes
  const brEnabled = session?.mode === 'full-section' || session?.mode === 'type-drill';

  // Get class_id for question pool tracking
  React.useEffect(() => {
    const fetchClassId = async () => {
      if (!user) return;
      
      const { data: student } = await supabase
        .from('students')
        .select('class_id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (student?.class_id) {
        setClassId(student.class_id);
      }
    };
    
    fetchClassId();
  }, [user]);

  // Initialize session with question pool filtering
  React.useEffect(() => {
    if (!state?.mode) {
      navigate('/');
      return;
    }

    const initializeSession = async () => {
      const mode = state.mode;
      let questionQueue: string[] = [];
      let rawQuestions: LRQuestion[] = [];

      if (mode === 'adaptive') {
        rawQuestions = questionBank.getAllQuestions();
      } else if (mode === 'full-section' && state.config) {
        const config = state.config as FullSectionConfig;
        rawQuestions = questionBank.getSection(config.pt, config.section);
        setHasTimer(config.timer.mode !== 'unlimited');
      } else if (mode === 'type-drill' && state.config) {
        const config = state.config as TypeDrillConfig;
        
        // Detect practice-set mode (Build-a-Set)
        if (config.selectedQids && config.selectedQids.length > 0) {
          setIsPracticeSetMode(true);
          setHasTimer(true); // Enable stopwatch timer
          rawQuestions = config.selectedQids
            .map(qid => questionBank.getQuestion(qid))
            .filter(Boolean) as LRQuestion[];
        } else {
          // Otherwise, filter by criteria
          rawQuestions = questionBank.getQuestionsByFilter({
            qtypes: config.qtypes.length > 0 ? config.qtypes : undefined,
            difficulties: config.difficulties.length > 0 ? config.difficulties : undefined,
            pts: config.pts.length > 0 ? config.pts : undefined,
          });
        }
      }

      // Apply question pool filtering only if classId is available
      let available = rawQuestions;
      let exhausted = false;
      
      if (classId) {
        const usage = await QuestionPoolService.getQuestionUsage(classId, mode);
        const poolSettings = {
          allowRepeats: settings.allowRepeats,
          preferUnseen: settings.preferUnseen,
          recycleAfterDays: settings.recycleAfterDays
        };
        
        const filtered = QuestionPoolService.filterQuestionPool(
          rawQuestions,
          usage,
          poolSettings
        );
        
        available = filtered.available;
        exhausted = filtered.exhausted;

        setTotalPoolSize(rawQuestions.length);
        setAvailablePoolSize(available.length);
        setPoolExhausted(exhausted);
        setPoolStatus(QuestionPoolService.getPoolStatus(rawQuestions.length, available.length, poolSettings));

        if (exhausted) {
          // Don't initialize session if pool is exhausted
          return;
        }
      }

      // For type-drill, apply balanced selection from available pool (only if not pre-selected)
      let finalQuestions = available;
      if (mode === 'type-drill' && state.config) {
        const config = state.config as TypeDrillConfig;
        
        // Skip pool filtering if questions were pre-selected
        if (config.selectedQids && config.selectedQids.length > 0) {
          finalQuestions = available; // Use them directly
        } else {
          // Balanced mix: group by type × level, round-robin select
          const groups = new Map<string, LRQuestion[]>();
          
          for (const q of available) {
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
          
          finalQuestions = selected;
        }
      }

      questionQueue = finalQuestions.map(q => q.qid);

      setSession({
        mode,
        fullSectionConfig: mode === 'full-section' ? (state.config as FullSectionConfig) : undefined,
        typeDrillConfig: mode === 'type-drill' ? (state.config as TypeDrillConfig) : undefined,
        questionQueue,
        currentIndex: 0,
        attempts: new Map(),
      });
    };

    initializeSession();
  }, [state, navigate, classId, settings.allowRepeats, settings.preferUnseen, settings.recycleAfterDays]);

  // Reset UI when currentQuestion changes
  const resetForNewQuestion = React.useCallback(() => {
    setSelectedAnswer('');
    setConfidence(null);
    setShowSolution(false);
    setTutorChatOpen(false);
    setTutorMessages([]);
    setVoiceCoachOpen(false);
    setShowVoiceChip(false);
    setAnswerLocked(false);
    setEliminatedAnswers(new Set());
    setQuestionStartTime(performance.now());
    setHighlightHistory([]);
    setIsRetryAfterWrong(false);
    setCorrectExplanation('');
    setShowReviewButton(false);
    setHadWrongAttempt(false);
    checkIfFlagged();
  }, []);

  // Run reset whenever currentQuestion changes
  React.useEffect(() => {
    if (currentQuestion) {
      resetForNewQuestion();
      
      // For section mode, restore the saved answer if navigating back
      if (session?.mode === 'full-section') {
        const savedAttempt = session.attempts.get(currentQuestion.qid);
        if (savedAttempt) {
          setSelectedAnswer(savedAttempt.selectedAnswer);
        }
      }
    }
  }, [currentQuestion, resetForNewQuestion, session?.mode, session?.attempts]);

  // Load current question (non-adaptive modes)
  React.useEffect(() => {
    if (!session) return;
    
    // Skip adaptive mode - handled by separate effect
    if (session.mode === 'adaptive') return;

    // Full Section or Type Drill: sequential
    if (session.currentIndex < session.questionQueue.length) {
      const qid = session.questionQueue[session.currentIndex];
      const question = questionBank.getQuestion(qid);
      console.debug('[Non-adaptive] set currentQuestion due to index', { index: session.currentIndex, qid });
      setCurrentQuestion(question || null);
    } else {
      // Finished
      setCurrentQuestion(null);
    }
  }, [session?.mode, session?.currentIndex, session?.questionQueue]);

  // Adaptive progression: only advance when advanceToken changes
  React.useEffect(() => {
    if (!session || session.mode !== 'adaptive') return;
    if (advanceToken === 0) return; // wait for initial kick-off
    
    const allQuestions = questionBank.getAllQuestions();
    
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
    
    console.debug('[Adaptive] set currentQuestion due to advanceToken', { advanceToken, qid: nextQuestion?.qid });
    setCurrentQuestion(nextQuestion || null);
  }, [advanceToken, session?.mode]);

  // Initial adaptive question kick-off
  React.useEffect(() => {
    if (session?.mode === 'adaptive' && advanceToken === 0 && !currentQuestion) {
      console.debug('[Adaptive] Initial kick-off, setting advanceToken to 1');
      setAdvanceToken(1);
    }
  }, [session?.mode, advanceToken, currentQuestion]);

  const checkIfFlagged = async () => {
    if (!currentQuestion || !user) {
      setIsFlagged(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('flagged_questions')
        .select('id')
        .eq('qid', currentQuestion.qid)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking flag status:', error);
      }
      
      setIsFlagged(!!data);
    } catch (err) {
      console.error('Error checking flag:', err);
      setIsFlagged(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    // Disable interactions while grading or when tutor is open
    if (isGrading || tutorChatOpen) return;

    // In practice-set mode, don't lock after answer selection
    // In adaptive mode after wrong answer, allow unlimited retries (don't lock)
    if (!isPracticeSetMode && !isRetryAfterWrong && confidence !== null) return;

    // Any new selection should hide any solution/journal UI until finished
    setShowSolution(false);
    setShowReviewButton(false);

    // Toggle behavior: clicking same answer deselects it
    if (selectedAnswer === answer) {
      setSelectedAnswer('');
      // For section/practice-set mode, clear the saved answer
      if ((session?.mode === 'full-section' || isPracticeSetMode) && currentQuestion) {
        const newAttempts = new Map(session.attempts);
        newAttempts.delete(currentQuestion.qid);
        setSession({ ...session, attempts: newAttempts });

        // Record answer change in practice-set mode
        if (isPracticeSetMode) {
          questionTimer.current.recordAnswer(currentQuestion.qid, '');
        }
      }
    } else {
      setSelectedAnswer(answer);
      // For section/practice-set mode, auto-save the answer
      if ((session?.mode === 'full-section' || isPracticeSetMode) && currentQuestion) {
        const newAttempts = new Map(session.attempts);
        const existingAttempt = newAttempts.get(currentQuestion.qid);

        newAttempts.set(currentQuestion.qid, {
          selectedAnswer: answer,
          correct: answer === currentQuestion.correctAnswer,
          timeMs: isPracticeSetMode ? questionTimer.current.getTotalTime(currentQuestion.qid) : 0,
          timestamp: Date.now(),
          confidence: existingAttempt?.confidence || null,
          reviewDone: false,
          answerRevealed: existingAttempt?.answerRevealed || false,
        });
        setSession({ ...session, attempts: newAttempts });

        // Record answer change in practice-set mode
        if (isPracticeSetMode) {
          questionTimer.current.recordAnswer(currentQuestion.qid, answer);
        }
      }

      // In adaptive retry mode, user must select confidence again for each attempt
      // No auto-submit - user controls when to submit
    }
  };

  const handleEliminateAnswer = (key: string) => {
    setEliminatedAnswers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
        // Deselect when eliminating if currently selected
        if (selectedAnswer === key) {
          setSelectedAnswer('');
          // Clear saved answer in section mode
          if (session?.mode === 'full-section' && currentQuestion) {
            const newAttempts = new Map(session.attempts);
            newAttempts.delete(currentQuestion.qid);
            setSession({ ...session, attempts: newAttempts });
          }
        }
      }
      return newSet;
    });
  };

  const handleLongPressStart = (key: string) => {
    const timer = setTimeout(() => {
      handleEliminateAnswer(key);
    }, 500); // 500ms for long press
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

// Auto-submit when confidence is selected (adaptive only)
React.useEffect(() => {
  if (session?.mode === 'adaptive') {
    // If we just closed the tutor, skip one auto-submit cycle
    if (suppressAutoSubmitOnce) {
      setSuppressAutoSubmitOnce(false);
      return;
    }
    // Adaptive: wait for confidence
    if (answerLocked && confidence !== null && !showSolution && !tutorChatOpen) {
      handleSubmit();
    }
  }
}, [confidence, answerLocked, showSolution, tutorChatOpen, session?.mode, suppressAutoSubmitOnce]);

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
    
    // Track question usage
    if (classId && session?.mode) {
      QuestionPoolService.markQuestionSeen(currentQuestion.qid, classId, session.mode);
    }
    
    // Stay on the same screen; user can press Next when ready
    // (Removed auto-advance)
  };

  const handleSubmitNonAdaptive = async () => {
    if (!currentQuestion || !selectedAnswer || !session) return;

    const correct = selectedAnswer === currentQuestion.correctAnswer;
    const timeMs = Math.floor(performance.now() - questionStartTime);

    // Save attempt to database (no confidence for non-adaptive)
    await saveAttemptToDatabase({
      qid: currentQuestion.qid,
      correct,
      time_ms: timeMs,
      qtype: currentQuestion.qtype,
      level: currentQuestion.difficulty,
      confidence: null,
      mode: session.mode,
    });

    const newAttempts = new Map(session.attempts);
    newAttempts.set(currentQuestion.qid, {
      selectedAnswer,
      correct,
      timeMs,
      timestamp: Date.now(),
      confidence: null,
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

    // Track question usage
    if (classId && session?.mode) {
      QuestionPoolService.markQuestionSeen(currentQuestion.qid, classId, session.mode);
    }

    setSession({ ...session, attempts: newAttempts });
    setShowSolution(true);
  };

  const handleSubmit = async () => {
    if (!currentQuestion || !selectedAnswer || confidence === null || !session) return;
    if (isGrading) return; // Prevent double-submit
    setIsGrading(true);
    // Capture immutable snapshot to avoid stale state
    const submittedAnswer = selectedAnswer;
    const submittedQuestion = currentQuestion;
    const submittedConfidence = confidence;

    console.debug('handleSubmit called', {
      mode: session.mode,
      qid: submittedQuestion.qid,
      selectedAnswer: submittedAnswer,
      correctAnswer: submittedQuestion.correctAnswer
    });

    const correct = selectedAnswer === currentQuestion.correctAnswer;
    const timeMs = Math.floor(performance.now() - questionStartTime);

    // Adaptive mode: Tutor-first flow
    if (session.mode === 'adaptive') {
      console.debug('Adaptive mode submit:', { correct, selectedAnswer });
      
      // Calculate attempt number for this question
      const attemptsForThisQuestion = Array.from(session.attempts.entries())
        .filter(([qid]) => qid === currentQuestion.qid);
      const currentAttemptNumber = attemptsForThisQuestion.length + 1;

      // SAVE ATTEMPT FIRST
      await saveAttemptToDatabase({
        qid: currentQuestion.qid,
        correct,
        time_ms: timeMs,
        qtype: currentQuestion.qtype,
        level: currentQuestion.difficulty,
        confidence,
        mode: session.mode,
      });

      // Update session
      const newAttempts = new Map(session.attempts);
      newAttempts.set(currentQuestion.qid, {
        selectedAnswer,
        correct,
        timeMs,
        timestamp: Date.now(),
        confidence,
        reviewDone: false,
      });

      // Record with adaptive engine
      adaptiveEngine.recordAttempt({
        qid: currentQuestion.qid,
        correct,
        time_ms: timeMs,
        qtype: currentQuestion.qtype,
        difficulty: currentQuestion.difficulty,
        timestamp: new Date(),
      });

      // Track question usage
      if (classId && session?.mode) {
        QuestionPoolService.markQuestionSeen(currentQuestion.qid, classId, session.mode);
      }

      setSession({ ...session, attempts: newAttempts });

      if (!correct) {
        // WRONG ANSWER: Show tutor ONLY, no solution reveal
        console.debug('Wrong answer - opening tutor:', {
          qid: currentQuestion.qid,
          attempt: currentAttemptNumber,
          answer: selectedAnswer
        });
        
        setIsRetryAfterWrong(true);
        setHadWrongAttempt(true); // Track that user had at least one wrong attempt
        // Make sure solution is hidden
        setShowSolution(false);
        setShowReviewButton(false);
        
        // Open tutor after brief delay
        setTimeout(() => {
          if (currentQuestion) {
            setTutorQuestionSnapshot(currentQuestion);
            setTutorAttemptNumber(currentAttemptNumber);
            setTutorChatOpen(true);
          }
        }, 150);
      } else {
        // CORRECT ANSWER: Log to WAJ and reveal solution with actions
        console.debug('Correct answer - showing solution');
        
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
        
        // If this is a retry after wrong answer, generate explanation
        if (isRetryAfterWrong) {
          await generateCorrectExplanation();
        }
        
        // Reveal solution with Next and optional journal button
        setShowSolution(true);
        setShowReviewButton(true);
      }
    } else {
      // Non-adaptive modes: original behavior
      const correct = selectedAnswer === currentQuestion.correctAnswer;
      const timeMs = Math.floor(performance.now() - questionStartTime);

      await saveAttemptToDatabase({
        qid: currentQuestion.qid,
        correct,
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

      if (classId && session?.mode) {
        QuestionPoolService.markQuestionSeen(currentQuestion.qid, classId, session.mode);
      }

      setSession({ ...session, attempts: newAttempts });
      setShowSolution(true);
    }
  };

  const generateCorrectExplanation = async () => {
    if (!currentQuestion) return;
    
    try {
      const questionData = {
        qid: currentQuestion.qid,
        pt: currentQuestion.pt,
        section: currentQuestion.section,
        qnum: currentQuestion.qnum,
        qtype: currentQuestion.qtype,
        level: currentQuestion.difficulty,
        stimulus: currentQuestion.stimulus,
        questionStem: currentQuestion.questionStem,
        answerChoices: currentQuestion.answerChoices,
        userAnswer: selectedAnswer,
        correctAnswer: currentQuestion.correctAnswer,
        breakdown: currentQuestion.breakdown,
        answerChoiceExplanations: currentQuestion.answerChoiceExplanations,
        reasoningType: currentQuestion.reasoningType,
      };

      const { data, error } = await supabase.functions.invoke('tutor-chat', {
        body: {
          question: questionData,
          messages: [{
            role: 'user',
            content: `I got this question correct on my second try! Can you give me a super specific explanation about why choice (${selectedAnswer}) is correct? Be very specific about how it relates to the question and provide a key insight. Keep it concise but insightful.`
          }]
        }
      });

      if (error) throw error;
      
      if (data?.content) {
        setCorrectExplanation(data.content);
      }
    } catch (err) {
      console.error('Error generating explanation:', err);
      setCorrectExplanation('Great job getting it right! The correct answer demonstrates your understanding of the key concept.');
    }
  };


  // Practice-set mode handlers
  const handleShowAnswer = () => {
    if (!currentQuestion || !isPracticeSetMode) return;
    
    // Mark answer as revealed
    setShowAnswerRevealed(prev => new Map(prev).set(currentQuestion.qid, true));
    
    // Update session to track revealed status
    if (session) {
      const newAttempts = new Map(session.attempts);
      const existingAttempt = newAttempts.get(currentQuestion.qid);
      if (existingAttempt) {
        newAttempts.set(currentQuestion.qid, {
          ...existingAttempt,
          answerRevealed: true,
        });
        setSession({ ...session, attempts: newAttempts });
      }
    }
    
    setShowSolution(true);
  };

  const handlePracticeSetNext = () => {
    if (!session) return;
    
    // Pause timer on current question
    if (currentQuestion) {
      questionTimer.current.pause();
    }
    
    // Move to next
    if (session.currentIndex < session.questionQueue.length - 1) {
      setSession({
        ...session,
        currentIndex: session.currentIndex + 1,
      });
    } else {
      // Finished
      handleFinishPracticeSet();
    }
  };

  const handlePracticeSetPrevious = () => {
    if (!session) return;
    
    // Pause timer on current question
    if (currentQuestion) {
      questionTimer.current.pause();
    }
    
    // Move to previous
    if (session.currentIndex > 0) {
      setSession({
        ...session,
        currentIndex: session.currentIndex - 1,
      });
    }
  };

  const handleFinishPracticeSet = async () => {
    if (!session || !user) return;
    
    // Pause timer
    if (timer) timer.pause();
    
    // Save all attempts with timing data
    for (const [qid, attempt] of session.attempts) {
      const question = questionBank.getQuestion(qid);
      if (!question || !attempt.selectedAnswer) continue;
      
      const timingMetrics = questionTimer.current.getMetrics(qid);
      
      await saveAttemptToDatabase({
        qid,
        correct: attempt.correct,
        time_ms: timingMetrics.totalTimeMs,
        qtype: question.qtype,
        level: question.difficulty,
        confidence: attempt.confidence || null,
        mode: 'practice-set',
      });
      
      // Log to WAJ if wrong
      if (!attempt.correct) {
        const { logWrongAnswer } = await import('@/lib/wajService');
        try {
          await logWrongAnswer({
            user_id: user.id,
            qid,
            pt: question.pt,
            section: question.section,
            qnum: question.qnum,
            qtype: question.qtype,
            level: question.difficulty,
            chosen_answer: attempt.selectedAnswer,
            correct_answer: question.correctAnswer,
            time_ms: timingMetrics.totalTimeMs,
            confidence_1_5: attempt.confidence || null,
          });
        } catch (error) {
          console.error('Failed to log to WAJ:', error);
        }
      }
    }
    
    // Show results
    setPostSectionScreen('score-report');
  };

  const handleConfidenceSelect = (level: number) => {
    if (!currentQuestion || !session || !isPracticeSetMode) return;
    
    setConfidence(level);
    
    // Update session with confidence
    const newAttempts = new Map(session.attempts);
    const existingAttempt = newAttempts.get(currentQuestion.qid);
    if (existingAttempt) {
      newAttempts.set(currentQuestion.qid, {
        ...existingAttempt,
        confidence: level,
      });
      setSession({ ...session, attempts: newAttempts });
    }
  };

  const handleNext = () => {
    if (!session) return;

    if (session.mode === 'adaptive') {
      // Increment advanceToken to trigger next question selection
      console.debug('[handleNext] Advancing adaptive question');
      setAdvanceToken(t => t + 1);
    } else {
      // Move to next in queue
      if (session.currentIndex < session.questionQueue.length - 1) {
        setSession({
          ...session,
          currentIndex: session.currentIndex + 1,
        });
      } else {
        // Reached the end - show results
        handleFinishSection();
      }
    }
  };

  const handlePrevious = () => {
    if (!session || session.mode === 'adaptive') return;
    
    // Move to previous in queue
    if (session.currentIndex > 0) {
      setSession({
        ...session,
        currentIndex: session.currentIndex - 1,
      });
    }
  };

  const handleFinishSection = () => {
    if (!session) return;
    
    // Evaluate correctness for all attempted questions
    const updatedAttempts = new Map(session.attempts);
    for (const [qid, attempt] of updatedAttempts) {
      const question = questionBank.getQuestion(qid);
      if (question) {
        // Update correctness based on actual answer
        updatedAttempts.set(qid, {
          ...attempt,
          correct: attempt.selectedAnswer === question.correctAnswer,
        });
      }
    }
    
    // Create updated session with evaluated attempts
    const updatedSession = {
      ...session,
      attempts: updatedAttempts,
    };
    
    // Build automatic review set based on rules (using updated session)
    const reviewSet = buildAutoReviewSet(updatedSession);
    setAutoReviewQids(reviewSet);
    
    // Update session state
    setSession(updatedSession);
    
    // Show section complete screen
    setPostSectionScreen('complete');
  };

  // Build automatic review set: all wrong + all flagged + all unanswered + 2 longest-time + 3 hard-right
  const buildAutoReviewSet = (session: DrillSession): string[] => {
    const qids: string[] = [];
    const wrongQids: string[] = [];
    const unansweredQids: string[] = [];
    const flaggedQids: string[] = [];
    const correctQids: { qid: string; timeMs: number; difficulty: number }[] = [];
    
    // Check all questions in the queue
    for (const qid of session.questionQueue) {
      const attempt = session.attempts.get(qid);
      
      if (!attempt) {
        // Unanswered questions are treated as wrong
        unansweredQids.push(qid);
      } else if (!attempt.correct) {
        wrongQids.push(qid);
      } else {
        const question = questionBank.getQuestion(qid);
        if (question) {
          correctQids.push({ qid, timeMs: attempt.timeMs, difficulty: question.difficulty });
        }
      }
      
      if (attempt?.brMarked) {
        flaggedQids.push(qid);
      }
    }
    
    // Add all wrong and unanswered
    qids.push(...wrongQids, ...unansweredQids);
    
    // Add all flagged (if not already added)
    for (const qid of flaggedQids) {
      if (!qids.includes(qid)) qids.push(qid);
    }
    
    // If no flagged, add 2 longest-time correct answers
    if (flaggedQids.length === 0) {
      const longestTime = [...correctQids]
        .filter(c => !qids.includes(c.qid))
        .sort((a, b) => b.timeMs - a.timeMs)
        .slice(0, 2);
      qids.push(...longestTime.map(c => c.qid));
    }
    
    // Add 3 hard-right (difficulty 4-5, correct)
    const hardRight = [...correctQids]
      .filter(c => !qids.includes(c.qid) && c.difficulty >= 4)
      .sort((a, b) => b.difficulty - a.difficulty)
      .slice(0, 3);
    qids.push(...hardRight.map(c => c.qid));
    
    return qids;
  };

  // Enhanced keyboard navigation for section mode
  React.useEffect(() => {
    if (session?.mode !== 'full-section' || !currentQuestion) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      // Arrow keys for navigation
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      }
      // Number keys 1-5 for selecting A-E
      else if (['1', '2', '3', '4', '5'].includes(e.key)) {
        if (tutorChatOpen || isGrading) return;
        e.preventDefault();
        const answerKeys = Object.keys(currentQuestion.answerChoices);
        const answerIndex = parseInt(e.key) - 1;
        if (answerIndex < answerKeys.length) {
          handleAnswerSelect(answerKeys[answerIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session, handleNext, handlePrevious, currentQuestion]);

  const handleTextSelection = (e: React.MouseEvent, section: 'stimulus' | 'stem') => {
    if (highlightMode === 'none') return;
    
    const container = e.currentTarget as HTMLElement;
    const selection = captureTextSelection(container);
    
    if (!selection || !currentQuestion) return;
    
    const currentHighlights = highlights.get(currentQuestion.qid) || [];
    
    // Save to history before making changes
    const MAX_HISTORY = 20;
    setHighlightHistory(prev => {
      const newHistory = [...prev, new Map(highlights)];
      return newHistory.slice(-MAX_HISTORY);
    });
    
    if (highlightMode === 'erase') {
      // Eraser mode: remove overlapping portions
      const updatedHighlights = currentHighlights.filter(h => {
        // Keep highlights from different sections
        if (h.section !== section) return true;
        
        // Check for overlap
        return h.end <= selection.start || h.start >= selection.end;
      }).concat(
        // Split and keep non-overlapping portions
        currentHighlights
          .filter(h => h.section === section && h.start < selection.end && h.end > selection.start)
          .flatMap(h => {
            const parts: Highlight[] = [];
            
            // Keep the part before the erased selection
            if (h.start < selection.start) {
              parts.push({
                ...h,
                id: `${h.id}-before`,
                end: selection.start,
                text: h.text.slice(0, selection.start - h.start)
              });
            }
            
            // Keep the part after the erased selection
            if (h.end > selection.end) {
              parts.push({
                ...h,
                id: `${h.id}-after`,
                start: selection.end,
                text: h.text.slice(selection.end - h.start)
              });
            }
            
            return parts;
          })
      );
      
      setHighlights(new Map(highlights.set(currentQuestion.qid, updatedHighlights)));
    } else {
      // Highlight mode: add new highlight
      const newHighlight: Highlight = {
        id: crypto.randomUUID(),
        start: selection.start,
        end: selection.end,
        text: selection.text,
        color: highlightMode as HighlightColor,
        section
      };
      
      // Use replaceOverlappingHighlights to implement "last action wins"
      const updatedHighlights = replaceOverlappingHighlights(currentHighlights, newHighlight);
      
      console.log('✓ Highlight created:', {
        color: highlightMode,
        text: selection.text.substring(0, 30) + '...',
        totalHighlights: updatedHighlights.length
      });
      
      setHighlights(new Map(highlights.set(currentQuestion.qid, updatedHighlights)));
    }
    
    // Clear selection
    window.getSelection()?.removeAllRanges();
  };

  const handleHighlightClick = (highlightId: string) => {
    if (highlightMode !== 'erase' || !currentQuestion) return;
    
    // Save to history before erasing
    setHighlightHistory(prev => {
      const newHistory = [...prev, new Map(highlights)];
      return newHistory.slice(-20);
    });
    
    const currentHighlights = highlights.get(currentQuestion.qid) || [];
    const updated = currentHighlights.filter(h => h.id !== highlightId);
    
    setHighlights(new Map(highlights.set(currentQuestion.qid, updated)));
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
        // Unflag
        const { error } = await supabase
          .from('flagged_questions')
          .delete()
          .eq('qid', currentQuestion.qid)
          .eq('user_id', user.id);
        
        if (error) throw error;
        setIsFlagged(false);
      } else {
        // Flag
        const { error } = await supabase
          .from('flagged_questions')
          .insert({
            qid: currentQuestion.qid,
            pt: currentQuestion.pt,
            section: currentQuestion.section,
            qnum: currentQuestion.qnum,
            user_id: user.id,
          } as any);
        
        if (error && error.code !== '23505') { // Ignore unique constraint violation
          throw error;
        }
        setIsFlagged(true);
      }
    } catch (err) {
      console.error('Error toggling flag:', err);
    }
  };

  const handleNavigation = (destination: '/' | '/dashboard') => {
    setExitDestination(destination);
    setShowExitDialog(true);
  };

  const confirmExit = () => {
    navigate(exitDestination);
  };

  const handleToggleBR = () => {
    if (!currentQuestion || !brEnabled) return;
    
    setBrMarked(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestion.qid)) {
        newSet.delete(currentQuestion.qid);
      } else {
        newSet.add(currentQuestion.qid);
      }
      return newSet;
    });
  };

  // Keyboard shortcut for BR marking
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'b' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Only trigger if not in an input field
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleToggleBR();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestion, brEnabled]);

  // Start timer on mount if applicable
  React.useEffect(() => {
    if (hasTimer && timer && !timer.running) {
      timer.start();
    }
  }, [hasTimer, timer]);

  // Handle session completion and post-section flow
  // Show post-section screens (must be BEFORE the session/currentQuestion check)
  if (postSectionScreen === 'complete') {
    return (
      <SectionComplete
        onBlindReview={() => setPostSectionScreen('review')}
        onSeeResults={() => setPostSectionScreen('score-report')}
      />
    );
  }
  
  if (postSectionScreen === 'review' && session) {
    return (
      <EnhancedBlindReview
        session={session}
        reviewQids={autoReviewQids}
        onComplete={async (results: BlindReviewResult[]) => {
          setBrResults(results);
          setPostSectionScreen('score-report');
          await saveBRResults(session, results);
        }}
        onBack={() => setPostSectionScreen('complete')}
      />
    );
  }
  
  if (postSectionScreen === 'score-report' && session) {
    // Use PracticeSetResults for practice-set mode
    if (isPracticeSetMode) {
      return (
        <PracticeSetResults
          session={session}
          onReviewWrong={() => {
            const wrongQids = session.questionQueue.filter(qid => {
              const attempt = session.attempts.get(qid);
              return attempt && !attempt.correct;
            });
            setAutoReviewQids(wrongQids);
            setPostSectionScreen('review');
          }}
          onReviewAll={() => {
            setAutoReviewQids(session.questionQueue);
            setPostSectionScreen('review');
          }}
          onBack={() => navigate('/')}
        />
      );
    }
    
    // Use new LR Section Results for full-section mode
    if (session.mode === 'full-section') {
      return (
        <LRSectionResults
          session={session}
          brResults={brResults}
          onBack={() => navigate('/')}
        />
      );
    }
    
    // Fall back to old ScoreReport for other modes
    return (
      <ScoreReport
        session={session}
        onStartReview={() => setPostSectionScreen('review')}
        onFullReview={() => {
          setAutoReviewQids(session.questionQueue);
          setPostSectionScreen('review');
        }}
        onBack={() => navigate('/')}
      />
    );
  }

  // Handle session completion with BR (old flow)
  if (!session || !currentQuestion) {
    // Check if we should show BR selection
    if (session && brEnabled && brMarked.size > 0 && !showBRSelection && !showBRFlow && !showBRResults) {
      setShowBRSelection(true);
    }

    // Show BR Selection screen
    if (showBRSelection) {
      return (
        <BlindReviewSelection
          session={{
            ...session!,
            attempts: new Map(
              Array.from(session!.attempts.entries()).map(([qid, attempt]) => [
                qid,
                { ...attempt, brMarked: brMarked.has(qid) }
              ])
            )
          }}
          onStartBlindReview={(selectedQids) => {
            setBrSelectedQids(selectedQids);
            setShowBRSelection(false);
            setShowBRFlow(true);
          }}
          onSkip={() => {
            navigate('/');
          }}
        />
      );
    }

    // Show BR Flow
    if (showBRFlow) {
      return (
        <BlindReviewFlow
          session={session!}
          selectedQids={brSelectedQids}
          onComplete={async (results: BlindReviewResult[]) => {
            setBrResults(results);
            setShowBRFlow(false);
            setShowBRResults(true);
            
            // Save BR results to database
            await saveBRResults(session!, results);
          }}
        />
      );
    }

    // Show BR Results
    if (showBRResults) {
      return (
        <BlindReviewResults
          session={session!}
          results={brResults}
          onFinish={() => navigate('/')}
        />
      );
    }

    // Regular session complete screen
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

  // Helper function to save BR results
  const saveBRResults = async (session: DrillSession, results: BlindReviewResult[]) => {
    if (!user) return;

    try {
      const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Calculate summary stats
      const correctedCount = results.filter(r => !session.attempts.get(r.qid)?.correct && r.correct).length;
      const stuckCount = results.filter(r => !session.attempts.get(r.qid)?.correct && !r.correct).length;
      const regretCount = results.filter(r => session.attempts.get(r.qid)?.correct && !r.correct).length;
      const confirmedCount = results.filter(r => session.attempts.get(r.qid)?.correct && r.correct).length;
      
      const times = results.map(r => r.brTimeMs).sort((a, b) => a - b);
      const medianTimeMs = times.length > 0 ? times[Math.floor(times.length / 2)] : 0;

      // Save BR session
      const classId = (user as any).user_metadata?.class_id || user.id;
      await supabase.from('blind_review_sessions').insert({
        class_id: classId,
        session_id: sessionId,
        br_items_count: results.length,
        br_corrected_count: correctedCount,
        br_stuck_count: stuckCount,
        br_regret_count: regretCount,
        br_confirmed_count: confirmedCount,
        br_median_time_ms: medianTimeMs,
      });

      // Update attempts with BR data
      for (const result of results) {
        const previousAttempt = session.attempts.get(result.qid);
        const preCorrect = previousAttempt?.correct || false;
        
        let brDelta: string;
        if (!preCorrect && result.correct) brDelta = 'corrected';
        else if (!preCorrect && !result.correct) brDelta = 'stuck';
        else if (preCorrect && !result.correct) brDelta = 'regret';
        else brDelta = 'confirmed';

        const question = questionBank.getQuestion(result.qid);
        if (!question) continue;

        await supabase.from('attempts').insert({
          user_id: user.id,
          class_id: classId,
          qid: result.qid,
          pt: question.pt,
          section: question.section,
          qnum: question.qnum,
          qtype: question.qtype,
          level: question.difficulty,
          correct: result.correct,
          time_ms: result.brTimeMs,
          mode: session.mode,
          br_marked: brMarked.has(result.qid),
          pre_answer: result.preAnswer,
          br_selected: true,
          br_answer: result.brAnswer,
          br_rationale: result.brRationale,
          br_time_ms: result.brTimeMs,
          br_changed: result.brChanged,
          br_outcome: result.correct ? 'correct' : 'incorrect',
          br_delta: brDelta,
        });
      }
    } catch (error) {
      console.error('Error saving BR results:', error);
    }
  };

  const progress = session.mode !== 'adaptive'
    ? (session.currentIndex / session.questionQueue.length) * 100
    : undefined;

  // Helper function to render a single answer choice
  const renderAnswerChoice = (
    key: string, 
    text: string, 
    options: {
      isSelected?: boolean;
      showRadio?: boolean;
      inFocusedMode?: boolean;
      isLast?: boolean;
    } = {}
  ) => {
    const { isSelected = false, showRadio = true, inFocusedMode = false } = options;
    const isCorrect = key === currentQuestion.correctAnswer;
    const isAdaptiveMode = session?.mode === 'adaptive';
    
    // For adaptive mode: show green ONLY on the selected answer when solution is shown (which means it's correct)
    // For other modes: show green on correct answer when solution is shown
    const showGreenHighlight = showSolution && (
      isAdaptiveMode 
        ? (isSelected && isCorrect) // Adaptive: green only on selected (which is correct)
        : isCorrect // Other modes: green on correct answer
    );

    const isSectionMode = session?.mode === 'full-section';
    const isEliminated = eliminatedAnswers.has(key);
    
    return (
      <div
        key={key}
        className={cn(
          "group relative flex items-start gap-3 py-2.5 px-4 -mx-4",
          "transition-all duration-[120ms] ease-out",
          "border-b border-border",
          isEliminated && "opacity-55",
          showGreenHighlight && "bg-green-50 dark:bg-green-900/20 border-l-4 border-l-green-500"
        )}
      >
        {/* Radio or selected indicator */}
        <div 
          onClick={() => !isEliminated && handleAnswerSelect(key)}
          className={cn(
            "flex items-center h-6 mt-0.5 shrink-0 cursor-pointer",
            isSectionMode && !isEliminated && "hover:opacity-70"
          )}
        >
          {inFocusedMode && isSelected ? (
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary-foreground" />
            </div>
          ) : showRadio ? (
            <RadioGroupItem value={key} id={`answer-${key}`} className="mt-0 pointer-events-none" />
          ) : (
            <div className="w-5 h-5" />
          )}
        </div>
        
        {/* Answer text - clickable for selection with long-press support */}
        <div 
          onClick={() => !isEliminated && handleAnswerSelect(key)}
          onMouseDown={() => isSectionMode && handleLongPressStart(key)}
          onMouseUp={handleLongPressEnd}
          onMouseLeave={handleLongPressEnd}
          onTouchStart={() => isSectionMode && handleLongPressStart(key)}
          onTouchEnd={handleLongPressEnd}
          onTouchCancel={handleLongPressEnd}
          className={cn(
            "flex items-start gap-3 flex-1 min-w-0 cursor-pointer touch-manipulation",
            // Section mode styles
            isSectionMode && !isEliminated && "hover:opacity-70 active:opacity-50",
            isSectionMode && isSelected && !isEliminated && "opacity-100"
          )}
        >
          <Label
            htmlFor={`answer-${key}`}
            className={cn(
              "flex-1 cursor-pointer",
              "text-[16px] leading-[1.6]",
              "font-normal text-foreground",
              "select-none",
              "transition-all duration-[120ms]",
              isEliminated && "line-through decoration-2 decoration-muted-foreground"
            )}
          >
            <span className="font-semibold mr-3 text-muted-foreground">({key})</span>
            <span>{text}</span>
          </Label>
        </div>
        
        {/* × elimination toggle - hide when solution is shown in adaptive mode */}
        {!(isAdaptiveMode && showSolution) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEliminateAnswer(key);
            }}
            className={cn(
              "shrink-0 flex items-center justify-center",
              "w-11 h-11 -my-3 -mr-3",
              "rounded-md transition-all duration-[120ms]",
              "hover:bg-accent/50 active:scale-95",
              "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={isEliminated}
            aria-label={`Cross out choice ${key}`}
            title={isEliminated ? `Restore choice ${key}` : `Cross out choice ${key}`}
          >
            <X 
              className={cn(
                "w-5 h-5 transition-all duration-[120ms]"
              )} 
            />
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave drill session?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave? Your progress in this session will be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit}>Yes, leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className={cn(
        "min-h-screen flex flex-col relative",
        session.mode === 'full-section' && "pb-20"
      )}>
        {/* Pause Overlay */}
        {timer?.isPaused && (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center animate-fade-in">
            <Card className="p-10 text-center shadow-lg border-border/50 rounded-lg">
              <h2 className="text-2xl font-semibold mb-3 text-foreground">Timer Paused</h2>
              <p className="text-muted-foreground mb-6">Click Resume to continue</p>
              <Button onClick={timer.resume} size="lg" className="min-w-[140px]">
                <Play className="w-4 h-4 mr-2" />
                Resume
              </Button>
            </Card>
          </div>
        )}

        {/* Header - Clean and minimal */}
        <div className="px-4 sm:px-8 py-3 sm:py-4 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex items-center justify-between max-w-[1800px] mx-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleNavigation('/')}
              className="text-muted-foreground hover:text-foreground min-h-[40px]"
            >
              <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="text-sm sm:text-base">Exit</span>
            </Button>

            {/* Question Metadata - Center */}
            {currentQuestion ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      const text = `PT${currentQuestion.pt}-S${currentQuestion.section}-Q${currentQuestion.qnum}`;
                      navigator.clipboard.writeText(text);
                      toast('Question ID copied to clipboard');
                    }}
                    className="px-3 py-1.5 rounded-md bg-accent/30 text-foreground border border-border/50 text-sm font-medium hover:bg-accent/40 transition-colors"
                  >
                    <span className="hidden sm:inline">
                      PT{currentQuestion.pt}-S{currentQuestion.section}-Q{currentQuestion.qnum}
                    </span>
                    <span className="sm:hidden">
                      Q{currentQuestion.qnum}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-semibold">PT{currentQuestion.pt}-S{currentQuestion.section}-Q{currentQuestion.qnum}</p>
                    <p className="text-xs text-muted-foreground">Type: {currentQuestion.qtype}</p>
                    <p className="text-xs text-muted-foreground">Difficulty: {currentQuestion.difficulty}/5</p>
                    <p className="text-xs text-muted-foreground mt-2">Click to copy ID</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="h-8" />
            )}

            <div className="flex items-center gap-2 sm:gap-6">
              {poolStatus && (
                <QuestionPoolChip
                  status={poolStatus}
                  totalQuestions={totalPoolSize}
                  availableQuestions={availablePoolSize}
                />
              )}
              
              {hasTimer && timer && (
                <div className="flex items-center gap-2 sm:gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={timer.isPaused ? timer.resume : timer.pause}
                    className="h-8 w-8 min-h-[40px] min-w-[40px] p-0"
                  >
                    {timer.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </Button>
                  <div className="text-base sm:text-lg font-mono font-semibold tabular-nums text-foreground">
                    {timer.label}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Compact toolbar - Available for all modes */}
      <div className="px-4 sm:px-8 py-2 border-b border-border/50 bg-background/60">
        <div className="flex items-center justify-end max-w-[1800px] mx-auto">
          <HighlightToolbar 
            mode={highlightMode} 
            onModeChange={setHighlightMode}
            isFlagged={isFlagged}
            onToggleFlag={handleToggleFlag}
            onUndo={handleUndo}
            canUndo={highlightHistory.length > 0}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {poolExhausted ? (
          <div className="flex-1 overflow-y-auto p-8">
            <QuestionPoolExhausted
              onReset={async () => {
                if (classId) {
                  await QuestionPoolService.resetPool(classId, session?.mode);
                  toast.success('Question pool reset');
                  window.location.reload();
                }
              }}
              onExpandCriteria={() => {
                navigate('/');
              }}
              onSettings={() => {
                navigate('/profile');
              }}
              mode={session?.mode || 'drill'}
            />
          </div>
        ) : (
          <>
        {/* Left Panel - Stimulus */}
        <div className="flex-1 overflow-y-auto lg:max-h-full">
          <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-4">
            {currentQuestion.stimulus && (() => {
              const fullText = normalizeText(currentQuestion.stimulus);
              const stimulusHighlights = highlights.get(currentQuestion.qid)?.filter(h => h.section === 'stimulus') || [];
              
              return (
                <div 
                  className={cn(
                    "prose prose-lg max-w-none",
                    "text-[15px] leading-[1.6] text-foreground",
                    highlightMode !== 'none' ? 'select-text cursor-text' : 'select-none cursor-default'
                  )}
                  onMouseUp={(e) => handleTextSelection(e, 'stimulus')}
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

            {/* Voice Coach & Tutor */}
            {showVoiceChip && (
              <div className="mt-6 flex justify-center">
                <VoiceCoachChip
                  onActivate={() => {
                    setShowVoiceChip(false);
                    setVoiceCoachOpen(true);
                  }}
                />
              </div>
            )}

            {tutorChatOpen && tutorQuestionSnapshot && (
              <div className="mt-6">
                <ErrorBoundary
                  onReset={() => {
                    setTutorChatOpen(false);
                    setTutorQuestionSnapshot(null);
                    setAnswerLocked(false);
                  }}
                >
                  <TutorChatModal
                    open={tutorChatOpen}
                    question={tutorQuestionSnapshot}
                    userAnswer={selectedAnswer}
                    attemptNumber={tutorAttemptNumber}
                    mode={session?.mode}
                onClose={() => {
                  console.debug('Tutor closed, returning to', { qid: currentQuestion?.qid });
                  // Prevent unintended auto-submit right after closing tutor
                  setSuppressAutoSubmitOnce(true);
                  setTutorChatOpen(false);
                  setTutorQuestionSnapshot(null);
                  setAnswerLocked(false); // Clear red state, re-enable choices
                  // Clear previous selection to allow fresh retry (adaptive mode only)
                  if (session?.mode === 'adaptive') {
                    setSelectedAnswer('');
                    setConfidence(null);
                    setEliminatedAnswers(new Set()); // Clear eliminated choices for fresh retry
                    setShowSolution(false); // Ensure solution stays hidden
                    setShowReviewButton(false); // Hide review button
                  }
                }}
                  />
                </ErrorBoundary>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Question & Answers */}
        <div className="flex-1 overflow-y-auto lg:border-l border-border lg:max-h-full">
          <div className="p-4 sm:p-6 max-w-3xl pb-4">
            {/* Question Stem - Large and confident */}
            <div className="mb-5">
              <div 
                className={cn(
                  "text-[19px] font-semibold text-foreground leading-[1.5] tracking-tight",
                  highlightMode !== 'none' ? 'select-text cursor-text' : 'select-none cursor-default'
                )}
                onMouseUp={(e) => handleTextSelection(e, 'stem')}
              >
                <HighlightedText
                  text={currentQuestion.questionStem}
                  highlights={highlights.get(currentQuestion.qid)?.filter(h => h.section === 'stem') || []}
                  onHighlightClick={handleHighlightClick}
                  eraserMode={highlightMode === 'erase'}
                />
              </div>
            </div>

            {/* Answer choices */}
            {tutorChatOpen ? (
              // When tutor is open: show all choices visible (no blur) but not clickable
              // Only the currently selected answer is highlighted
              <div className="space-y-0 pointer-events-none">
                {Object.entries(currentQuestion.answerChoices).map(([key, text]) => 
                  renderAnswerChoice(key, text, { 
                    isSelected: key === selectedAnswer,
                    showRadio: true,
                    inFocusedMode: false
                  })
                )}
              </div>
            ) : (
              <RadioGroup
                value={selectedAnswer}
                onValueChange={handleAnswerSelect}
                className="space-y-0 -mx-5"
              >
                {Object.entries(currentQuestion.answerChoices).map(([key, text]) => 
                  renderAnswerChoice(key, text, { 
                    isSelected: key === selectedAnswer,
                    showRadio: true
                  })
                )}
              </RadioGroup>
            )}

            {/* Confidence selector - for adaptive and practice-set modes */}
            {(session.mode === 'adaptive' || isPracticeSetMode) && selectedAnswer && !tutorChatOpen && (
              <div className="space-y-3 pt-8">
                <Label className="text-sm font-medium">Confidence (1–5)</Label>
                <ConfidenceSelector
                  value={confidence}
                  onChange={(level) => {
                    if (isPracticeSetMode) {
                      handleConfidenceSelect(level);
                    } else {
                      setConfidence(level);
                      setAnswerLocked(true);
                    }
                  }}
                  disabled={!isPracticeSetMode && !isRetryAfterWrong && showSolution}
                />
              </div>
            )}
            
            {/* Show Answer button for practice-set mode */}
            {isPracticeSetMode && selectedAnswer && !showSolution && (
              <div className="flex justify-center pt-6">
                <Button
                  onClick={handleShowAnswer}
                  variant="outline"
                  size="lg"
                >
                  Show Answer
                </Button>
              </div>
            )}

            {/* Submit button for non-adaptive, non-section, non-practice-set modes */}
            {session.mode !== 'adaptive' && session.mode !== 'full-section' && !isPracticeSetMode && selectedAnswer && !showSolution && (
              <div className="flex justify-end gap-3 pt-6 mt-2">
                <Button
                  onClick={handleSubmitNonAdaptive}
                  size="lg"
                  disabled={timer?.isPaused}
                >
                  Check Answer
                </Button>
              </div>
            )}

            {/* Solution - Adaptive mode: clean success state */}
            {showSolution && session.mode === 'adaptive' && (
              <div className="mt-6 space-y-4">
                {/* Auto-reveal explanation panel */}
                <AdaptiveExplanationPanel
                  question={currentQuestion}
                  selectedAnswer={selectedAnswer}
                  isVisible={true}
                />

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
                  <Button
                    onClick={handleNext}
                    size="lg"
                    className="flex-1 min-w-[140px]"
                  >
                    Next Question
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Toggle full explanation visibility (could expand inline or open modal)
                      toast.info('Full explanation shown above');
                    }}
                    className="flex-1 min-w-[140px]"
                  >
                    View Full Explanation
                  </Button>
                  
                  {/* Only show WAJ button if user had wrong attempts */}
                  {hadWrongAttempt && (
                    <Button
                      variant="outline"
                      onClick={() => setWajModalOpen(true)}
                      className="flex-1 min-w-[140px]"
                    >
                      Wrong Answer Journal
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Solution - Non-adaptive modes */}
            {showSolution && session.mode !== 'adaptive' && (
              <div className="mt-6 p-6 border-t space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className={cn(
                    "w-5 h-5",
                    selectedAnswer === currentQuestion.correctAnswer 
                      ? "text-green-500" 
                      : "text-muted-foreground"
                  )} />
                  <span className="font-semibold text-lg">
                    {selectedAnswer === currentQuestion.correctAnswer
                      ? 'Correct!'
                      : `The correct answer is (${currentQuestion.correctAnswer}).`}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        </>
        )}
      </div>

      {/* Sticky Bottom Navigation Bar - Section & Practice-Set Modes */}
      {(session.mode === 'full-section' || isPracticeSetMode) && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/98 backdrop-blur-sm border-t border-border shadow-lg z-50 animate-slide-up">
          <div className="px-6 py-3 flex items-center justify-between gap-6 max-w-[1800px] mx-auto">
            {/* Previous Button */}
            <Button
              variant="ghost"
              size="lg"
              onClick={isPracticeSetMode ? handlePracticeSetPrevious : handlePrevious}
              disabled={session.currentIndex === 0 || timer?.isPaused}
              className={cn(
                "rounded-lg transition-all duration-150 min-w-[100px]",
                session.currentIndex === 0 && "invisible"
              )}
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              <span className="font-medium">Prev</span>
            </Button>

            {/* Question Circles with Progress */}
            <div className="flex-1 flex items-center justify-center gap-1 overflow-x-auto py-1 scrollbar-hide">
              <div className="flex items-center gap-1">
                {session.questionQueue.map((qid, index) => {
                  const isAnswered = session.attempts.has(qid);
                  const isCurrent = index === session.currentIndex;
                  const isFlaggedQ = isFlagged && isCurrent;
                  
                  return (
                    <button
                      key={qid}
                      onClick={() => {
                        if (!timer?.isPaused) {
                          // Pause timer on current question before switching
                          if (isPracticeSetMode && currentQuestion) {
                            questionTimer.current.pause();
                          }
                          setSession({ ...session, currentIndex: index });
                        }
                      }}
                      disabled={timer?.isPaused}
                      className={cn(
                        "flex items-center justify-center rounded-full transition-all duration-150",
                        "text-xs font-semibold tabular-nums",
                        "hover:scale-110 active:scale-95",
                        isCurrent && "w-9 h-9 bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20",
                        !isCurrent && isAnswered && "w-7 h-7 bg-accent text-foreground",
                        !isCurrent && !isAnswered && "w-7 h-7 border border-border text-muted-foreground hover:bg-accent/50"
                      )}
                      title={`Question ${index + 1}${isAnswered ? ' (answered)' : ''}`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Next Button */}
            <Button
              variant="default"
              size="lg"
              onClick={isPracticeSetMode ? handlePracticeSetNext : handleNext}
              disabled={timer?.isPaused}
              className="rounded-lg shadow-md min-w-[100px] font-medium transition-all duration-150 hover:shadow-lg"
            >
              {session.currentIndex < session.questionQueue.length - 1 ? (
                <>
                  <span>Next</span>
                  <ChevronRight className="w-5 h-5 ml-1" />
                </>
              ) : (
                <span>Finish</span>
              )}
            </Button>
          </div>
        </div>
      )}

      <ReviewModal
        open={wajModalOpen}
        onSave={handleWAJSave}
      />

      <VoiceCoachModal
        open={voiceCoachOpen}
        question={currentQuestion}
        selectedAnswer={selectedAnswer}
        onTryAgain={() => {
          // For adaptive mode: close and allow retry
          setVoiceCoachOpen(false);
        }}
        onMicroDrill={(questions) => {
          // Navigate to micro-drill with the 2 generated questions
          navigate('/drill', {
            state: {
              mode: 'type-drill',
              config: {
                qtypes: [currentQuestion.qtype],
                difficulties: [currentQuestion.difficulty],
                pts: questions.map(q => q.pt),
                count: 2
              }
            }
          });
        }}
        onSaveToJournal={() => {
          // Open WAJ modal
          setVoiceCoachOpen(false);
          setWajModalOpen(true);
        }}
        onClose={() => setVoiceCoachOpen(false)}
        showContrast={settings.showContrast}
      />
    </div>
    </>
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
    // Practice-set mode (type-drill with selectedQids) uses stopwatch
    if (state?.mode === 'type-drill' && state.config) {
      const config = state.config as TypeDrillConfig;
      if (config.selectedQids && config.selectedQids.length > 0) {
        return { mode: 'stopwatch' };
      }
    }
    
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

