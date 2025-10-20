import * as React from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { TimerControls } from '@/components/drill/TimerControls';
import { TutorChatModal } from '@/components/drill/TutorChatModal';

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
import { TimerProvider, useTimerContext } from '@/contexts/TimerContext';
import { questionBank } from '@/lib/questionLoader';
import { AdaptiveEngine } from '@/lib/adaptiveEngine';
import { normalizeText } from '@/lib/utils';
import { captureTextSelection, replaceOverlappingHighlights, type Highlight, type HighlightColor } from '@/lib/highlightUtils';
import { ArrowLeft, CheckCircle, XCircle, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
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
import { toast } from 'sonner';

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
  
  // New post-section flow states
  const [postSectionScreen, setPostSectionScreen] = React.useState<'complete' | 'review' | 'score-report' | null>(null);
  const [autoReviewQids, setAutoReviewQids] = React.useState<string[]>([]);
  const [longPressTimer, setLongPressTimer] = React.useState<NodeJS.Timeout | null>(null);
  
  // Question pool state
  const [poolStatus, setPoolStatus] = React.useState<string>('');
  const [totalPoolSize, setTotalPoolSize] = React.useState(0);
  const [availablePoolSize, setAvailablePoolSize] = React.useState(0);
  const [poolExhausted, setPoolExhausted] = React.useState(false);
  const [classId, setClassId] = React.useState<string>('');
  
  const timer = hasTimer ? useTimerContext() : null;

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
    if (!state?.mode || !classId) {
      if (!state?.mode) navigate('/');
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
        rawQuestions = questionBank.getQuestionsByFilter({
          qtypes: config.qtypes.length > 0 ? config.qtypes : undefined,
          difficulties: config.difficulties.length > 0 ? config.difficulties : undefined,
          pts: config.pts.length > 0 ? config.pts : undefined,
        });
      }

      // Apply question pool filtering
      const usage = await QuestionPoolService.getQuestionUsage(classId, mode);
      const poolSettings = {
        allowRepeats: settings.allowRepeats,
        preferUnseen: settings.preferUnseen,
        recycleAfterDays: settings.recycleAfterDays
      };
      
      const { available, exhausted } = QuestionPoolService.filterQuestionPool(
        rawQuestions,
        usage,
        poolSettings
      );

      setTotalPoolSize(rawQuestions.length);
      setAvailablePoolSize(available.length);
      setPoolExhausted(exhausted);
      setPoolStatus(QuestionPoolService.getPoolStatus(rawQuestions.length, available.length, poolSettings));

      if (exhausted) {
        // Don't initialize session if pool is exhausted
        return;
      }

      // For type-drill, apply balanced selection from available pool
      let finalQuestions = available;
      if (mode === 'type-drill' && state.config) {
        const config = state.config as TypeDrillConfig;
        
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
    setTutorMessages([]);
    setVoiceCoachOpen(false);
    setShowVoiceChip(false);
    setAnswerLocked(false);
    setEliminatedAnswers(new Set());
    setQuestionStartTime(performance.now());
    setHighlightHistory([]);
    
    // For section mode, restore the saved answer if navigating back
    if (session?.mode === 'full-section' && currentQuestion) {
      const savedAttempt = session.attempts.get(currentQuestion.qid);
      if (savedAttempt) {
        setSelectedAnswer(savedAttempt.selectedAnswer);
      }
    }
    
    // Check if current question is flagged
    checkIfFlagged();
  }, [session]);

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
    // Prevent changes after confidence is selected (truly locked)
    if (confidence !== null) return;
    
    // Toggle behavior: clicking same answer deselects it
    if (selectedAnswer === answer) {
      setSelectedAnswer('');
      // For section mode, clear the saved answer
      if (session?.mode === 'full-section' && currentQuestion) {
        const newAttempts = new Map(session.attempts);
        newAttempts.delete(currentQuestion.qid);
        setSession({ ...session, attempts: newAttempts });
      }
    } else {
      setSelectedAnswer(answer);
      // For section mode, auto-save the answer (no feedback)
      if (session?.mode === 'full-section' && currentQuestion) {
        const newAttempts = new Map(session.attempts);
        newAttempts.set(currentQuestion.qid, {
          selectedAnswer: answer,
          correct: false, // Will be evaluated at the end
          timeMs: 0,
          timestamp: Date.now(),
          confidence: null,
          reviewDone: false,
        });
        setSession({ ...session, attempts: newAttempts });
      }
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
      // Adaptive: wait for confidence
      if (answerLocked && confidence !== null && !showSolution && !tutorChatOpen) {
        handleSubmit();
      }
    }
  }, [confidence, answerLocked, showSolution, tutorChatOpen, session?.mode]);

  const handleTryAgain = () => {
    setTutorChatOpen(false);
    setTutorMessages([]);
    setVoiceCoachOpen(false);
    setShowVoiceChip(false);
    setSelectedAnswer('');
    setConfidence(null);
    setAnswerLocked(false);
    setQuestionStartTime(performance.now());
  };

  const handleContinueToReview = () => {
    setTutorChatOpen(false);
    setTutorMessages([]);
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
    
    // Track question usage
    if (classId && session?.mode) {
      QuestionPoolService.markQuestionSeen(currentQuestion.qid, classId, session.mode);
    }
    
    // Auto-advance to next question after 1.5 seconds
    setTimeout(() => {
      handleNext();
    }, 1500);
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

    const correct = selectedAnswer === currentQuestion.correctAnswer;
    const timeMs = Math.floor(performance.now() - questionStartTime);

    // After wrong answer in adaptive mode, show Joshua's feedback automatically
    if (!correct && session.mode === 'adaptive') {
      // Open text tutor with specific feedback
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

      // Track question usage
      if (classId && session?.mode) {
        QuestionPoolService.markQuestionSeen(currentQuestion.qid, classId, session.mode);
      }

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
    
    // Build automatic review set based on rules
    const reviewSet = buildAutoReviewSet(session);
    setAutoReviewQids(reviewSet);
    
    // Show section complete screen
    setPostSectionScreen('complete');
  };

  // Build automatic review set: all wrong + all flagged + 2 longest-time + 3 hard-right
  const buildAutoReviewSet = (session: DrillSession): string[] => {
    const qids: string[] = [];
    const wrongQids: string[] = [];
    const flaggedQids: string[] = [];
    const correctQids: { qid: string; timeMs: number; difficulty: number }[] = [];
    
    for (const [qid, attempt] of session.attempts) {
      if (!attempt.correct) {
        wrongQids.push(qid);
      } else {
        const question = questionBank.getQuestion(qid);
        if (question) {
          correctQids.push({ qid, timeMs: attempt.timeMs, difficulty: question.difficulty });
        }
      }
      
      if (attempt.brMarked) {
        flaggedQids.push(qid);
      }
    }
    
    // Add all wrong
    qids.push(...wrongQids);
    
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
    if (session?.mode !== 'full-section') return;

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
    
    const currentHighlights = highlights.get(currentQuestion.qid) || [];
    
    // Save to history before making changes
    const MAX_HISTORY = 20;
    setHighlightHistory(prev => {
      const newHistory = [...prev, new Map(highlights)];
      return newHistory.slice(-MAX_HISTORY);
    });
    
    // Use replaceOverlappingHighlights to implement "last action wins"
    const updatedHighlights = replaceOverlappingHighlights(currentHighlights, newHighlight);
    
    setHighlights(new Map(highlights.set(currentQuestion.qid, updatedHighlights)));
    
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
    // Use new LR Section Results for full-section mode
    if (session.mode === 'full-section') {
      return (
        <LRSectionResults
          session={session}
          brResults={brResults}
          onBack={() => navigate('/dashboard')}
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
        onBack={() => setPostSectionScreen('complete')}
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
      isLast?: boolean;
    } = {}
  ) => {
    const { isSelected = false, showRadio = true, inFocusedMode = false } = options;
    const isCorrect = key === currentQuestion.correctAnswer;
    // Hide feedback during section mode
    const showFeedback = session?.mode !== 'full-section' && answerLocked && isSelected && confidence !== null;

    const isSectionMode = session?.mode === 'full-section';
    const isEliminated = eliminatedAnswers.has(key);
    
    return (
      <div
        key={key}
        className={cn(
          "group relative flex items-start gap-4 py-5 px-5 -mx-5",
          "transition-all duration-[120ms] ease-out",
          "border-b border-border",
          isEliminated && "opacity-55"
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
              "text-[18px] leading-[1.75]",
              "font-normal text-foreground",
              "select-none",
              "transition-all duration-[120ms]",
              isEliminated && "line-through decoration-2 decoration-muted-foreground"
            )}
          >
            <span className="font-semibold mr-3 text-muted-foreground">({key})</span>
            <span>{text}</span>
            {!isSectionMode && showFeedback && (
              <Badge
                variant={isCorrect ? 'default' : 'destructive'}
                className="ml-2"
              >
                {isCorrect ? 'Correct' : 'Wrong'}
              </Badge>
            )}
          </Label>
        </div>
        
        {/* × elimination toggle - only in section mode */}
        {isSectionMode && (
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
            <XCircle 
              className={cn(
                "w-5 h-5 transition-all duration-[120ms]",
                isEliminated ? "fill-current" : "fill-none"
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
        <div className="px-8 py-4 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex items-center justify-between max-w-[1800px] mx-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleNavigation('/')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Exit
            </Button>

            <div className="flex items-center gap-6">
              {poolStatus && (
                <QuestionPoolChip
                  status={poolStatus}
                  totalQuestions={totalPoolSize}
                  availableQuestions={availablePoolSize}
                />
              )}
              
              {hasTimer && timer && (
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={timer.isPaused ? timer.resume : timer.pause}
                    className="h-8 w-8 p-0"
                  >
                    {timer.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </Button>
                  <div className="text-lg font-mono font-semibold tabular-nums text-foreground">
                    {timer.label}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Compact toolbar - icon-only */}
      {session.mode === 'full-section' && (
        <div className="px-8 py-2 border-b border-border/50 bg-background/60">
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
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
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
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-4xl mx-auto pb-32">
            {currentQuestion.stimulus && (() => {
              const fullText = normalizeText(currentQuestion.stimulus);
              const stimulusHighlights = highlights.get(currentQuestion.qid)?.filter(h => h.section === 'stimulus') || [];
              
              return (
                <div 
                  className={cn(
                    "prose prose-lg max-w-none",
                    "text-[17px] leading-[1.8] text-foreground",
                    (highlightMode !== 'none' && highlightMode !== 'erase') ? 'select-text cursor-text' : 'select-none cursor-default'
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

            {tutorChatOpen && (
              <div className="mt-6">
                <TutorChatModal
                  open={tutorChatOpen}
                  question={currentQuestion}
                  userAnswer={selectedAnswer}
                  onClose={handleContinueToReview}
                  onTryAgain={handleTryAgain}
                />
              </div>
            )}
          </div>
          
          {/* Question metadata */}
          <div className="absolute bottom-24 left-8 text-xs text-muted-foreground/60 font-medium select-none">
            PT{currentQuestion.pt}-S{currentQuestion.section}-Q{currentQuestion.qnum}
          </div>
        </div>

        {/* Right Panel - Question & Answers */}
        <div className="flex-1 overflow-y-auto border-l border-border">
          <div className="p-8 max-w-3xl pb-32">
            {/* Question Stem - Large and confident */}
            <div className="mb-10">
              <div 
                className={cn(
                  "text-[22px] font-semibold text-foreground leading-[1.65] tracking-tight",
                  (highlightMode !== 'none' && highlightMode !== 'erase') ? 'select-text cursor-text' : 'select-none cursor-default'
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
              <div className="space-y-0">
                {(() => {
                  const { before, selected, after } = getAnswerGroups();
                  
                  return (
                    <>
                      {before.length > 0 && (
                        <div className="opacity-20 blur-[1px] pointer-events-none">
                          {before.map(([key, text]) => renderAnswerChoice(key, text, { showRadio: false, inFocusedMode: true }))}
                        </div>
                      )}

                      <div className="relative my-4">
                        <div className="absolute -inset-2 bg-gradient-to-r from-primary/10 to-accent-bronze/10 rounded-lg blur-sm" />
                        <div className="relative">
                          {renderAnswerChoice(selected[0], selected[1], { 
                            isSelected: true, 
                            showRadio: false,
                            inFocusedMode: true
                          })}
                        </div>
                      </div>

                      {after.length > 0 && (
                        <div className="opacity-20 blur-[1px] pointer-events-none">
                          {after.map(([key, text]) => renderAnswerChoice(key, text, { showRadio: false, inFocusedMode: true }))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <RadioGroup
                value={selectedAnswer}
                onValueChange={handleAnswerSelect}
                disabled={confidence !== null}
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

            {/* Confidence selector - only for adaptive mode */}
            {session.mode === 'adaptive' && selectedAnswer && !tutorChatOpen && (
              <div className="space-y-3 pt-8">
                <Label className="text-sm font-medium">Confidence (1–5)</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <Button
                      key={level}
                      variant={confidence === level ? 'default' : 'outline'}
                      onClick={() => {
                        setConfidence(level);
                        setAnswerLocked(true);
                      }}
                      className="flex-1"
                      disabled={showSolution}
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Submit button for non-adaptive, non-section modes */}
            {session.mode !== 'adaptive' && session.mode !== 'full-section' && selectedAnswer && !showSolution && (
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

            {/* Solution */}
            {showSolution && (
              <div className="mt-6 p-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  {selectedAnswer === currentQuestion.correctAnswer ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive" />
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
        </div>
        </>
        )}
      </div>

      {/* Sticky Bottom Navigation Bar - Section Mode Only */}
      {session.mode === 'full-section' && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/98 backdrop-blur-sm border-t border-border shadow-lg z-50 animate-slide-up">
          <div className="px-6 py-3 flex items-center justify-between gap-6 max-w-[1800px] mx-auto">
            {/* Previous Button */}
            <Button
              variant="ghost"
              size="lg"
              onClick={handlePrevious}
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
              onClick={handleNext}
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
        onTryAgain={handleTryAgain}
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
        onSaveToJournal={handleContinueToReview}
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
