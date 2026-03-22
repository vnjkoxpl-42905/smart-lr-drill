import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle,
  Flag,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { questionBank } from '@/lib/questionLoader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { DrillSession, BlindReviewResult } from '@/types/drill';

interface LRSectionResultsProps {
  session: DrillSession;
  brResults?: BlindReviewResult[];
  classId: string;
  onBack: () => void;
}

interface QuestionStat {
  qid: string;
  qnum: number;
  qtype: string;
  difficulty: number;
  initialAnswer: string;
  correctAnswer: string;
  initialCorrect: boolean;
  brAnswer?: string;
  brCorrect?: boolean;
  brChanged?: boolean;
  timeMs: number;
  brTimeMs?: number;
  switchCount: number;
  flagged: boolean;
}

interface FocusArea {
  qtype: string;
  correct: number;
  total: number;
  accuracy: number;
}

export function LRSectionResults({ session, brResults, classId, onBack }: LRSectionResultsProps) {
  const { user } = useAuth();
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = React.useState<string | null>(null);
  const [savingToHistory, setSavingToHistory] = React.useState(false);

  // Build question stats
  const stats: QuestionStat[] = React.useMemo(() => {
    return session.questionQueue.map((qid, idx) => {
      const question = questionBank.getQuestion(qid);
      const attempt = session.attempts.get(qid);
      const brResult = brResults?.find(br => br.qid === qid);
      
      if (!question) return null;

      // Handle unanswered questions (no attempt = treated as wrong)
      return {
        qid,
        qnum: idx + 1,
        qtype: question.qtype,
        difficulty: question.difficulty,
        initialAnswer: attempt?.selectedAnswer || '—',
        correctAnswer: question.correctAnswer,
        initialCorrect: attempt?.correct || false,
        brAnswer: brResult?.brAnswer,
        brCorrect: brResult?.correct,
        brChanged: brResult?.brChanged,
        timeMs: attempt?.timeMs || 0,
        brTimeMs: brResult?.brTimeMs,
        switchCount: attempt?.switchCount || 0,
        flagged: attempt?.brMarked || false,
      };
    }).filter(Boolean) as QuestionStat[];
  }, [session, brResults]);

  // Calculate scores
  const initialScore = stats.filter(s => s.initialCorrect).length;
  const initialTotal = stats.length;
  const initialPercent = Math.round((initialScore / initialTotal) * 100);

  const brScore = brResults ? stats.filter(s => s.brCorrect).length : null;
  const brPercent = brScore !== null ? Math.round((brScore / initialTotal) * 100) : null;
  const delta = brScore !== null ? brScore - initialScore : null;

  // Calculate stats
  const totalTimeMs = stats.reduce((sum, s) => sum + s.timeMs, 0);
  const avgTimeMs = Math.round(totalTimeMs / stats.length);
  const unansweredCount = stats.filter(s => s.initialAnswer === '—').length;

  // Top 3 Focus Areas
  const focusAreas: FocusArea[] = React.useMemo(() => {
    const byType = new Map<string, { correct: number; total: number }>();
    
    stats.forEach(s => {
      if (!byType.has(s.qtype)) {
        byType.set(s.qtype, { correct: 0, total: 0 });
      }
      const data = byType.get(s.qtype)!;
      data.total++;
      if (s.initialCorrect) data.correct++;
    });

    const areas = Array.from(byType.entries())
      .map(([qtype, { correct, total }]) => ({
        qtype,
        correct,
        total,
        accuracy: Math.round((correct / total) * 100),
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);

    return areas;
  }, [stats]);

  // Difficulty distribution
  const difficultyDist = React.useMemo(() => {
    const dist = { easy: 0, medium: 0, hard: 0 };
    stats.forEach(s => {
      if (s.difficulty <= 2) dist.easy++;
      else if (s.difficulty <= 4) dist.medium++;
      else dist.hard++;
    });
    return dist;
  }, [stats]);

  // Save to database
  React.useEffect(() => {
    const saveHistory = async () => {
      if (!user || savingToHistory) return;
      setSavingToHistory(true);

      try {
        // Build by_qtype_json
        const byQtype: Record<string, { correct: number; total: number }> = {};
        stats.forEach(s => {
          if (!byQtype[s.qtype]) {
            byQtype[s.qtype] = { correct: 0, total: 0 };
          }
          byQtype[s.qtype].total++;
          if (s.initialCorrect) byQtype[s.qtype].correct++;
        });

        // Build by_difficulty_json
        const byDifficulty: Record<number, { correct: number; total: number }> = {};
        stats.forEach(s => {
          if (!byDifficulty[s.difficulty]) {
            byDifficulty[s.difficulty] = { correct: 0, total: 0 };
          }
          byDifficulty[s.difficulty].total++;
          if (s.initialCorrect) byDifficulty[s.difficulty].correct++;
        });

        const classId = (user as any).user_metadata?.class_id || '';
        const pt = session.fullSectionConfig?.pt || 0;
        const section = session.fullSectionConfig?.section || 0;

        await supabase.from('section_history').insert({
          class_id: classId,
          pt,
          section,
          section_mode: session.mode,
          initial_score: initialScore,
          initial_total: initialTotal,
          initial_percent: initialPercent,
          br_score: brScore,
          br_total: brScore !== null ? initialTotal : null,
          br_percent: brPercent,
          br_delta: delta,
          total_time_ms: totalTimeMs,
          avg_time_ms: avgTimeMs,
          unanswered_count: unansweredCount,
          by_qtype_json: byQtype,
          by_difficulty_json: byDifficulty,
          br_used: !!brResults,
        });

        // Add wrong answers to WAJ
        const { logWrongAnswer } = await import('@/lib/wajService');
        for (const stat of stats) {
          if (!stat.initialCorrect) {
            const question = questionBank.getQuestion(stat.qid);
            if (question) {
              await logWrongAnswer({
                user_id: user.id,
                qid: stat.qid,
                pt: question.pt,
                section: question.section,
                qnum: question.qnum,
                qtype: stat.qtype,
                level: stat.difficulty,
                chosen_answer: stat.initialAnswer,
                correct_answer: stat.correctAnswer,
                time_ms: stat.timeMs,
                confidence_1_5: null,
                review: {
                  q1: '',
                  q2: '',
                  q3: '',
                },
              });
            }
          }
        }
      } catch (error) {
        console.error('Failed to save section history:', error);
      }
    };

    saveHistory();
  }, []);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const toggleRow = (qid: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(qid)) {
      newExpanded.delete(qid);
    } else {
      newExpanded.add(qid);
    }
    setExpandedRows(newExpanded);
  };

  // Filter stats
  let displayStats = [...stats];
  if (activeFilter) {
    if (activeFilter.startsWith('qtype:')) {
      const qtype = activeFilter.split(':')[1];
      displayStats = displayStats.filter(s => s.qtype === qtype);
    } else if (activeFilter === 'easy') {
      displayStats = displayStats.filter(s => s.difficulty <= 2);
    } else if (activeFilter === 'medium') {
      displayStats = displayStats.filter(s => s.difficulty >= 3 && s.difficulty <= 4);
    } else if (activeFilter === 'hard') {
      displayStats = displayStats.filter(s => s.difficulty === 5);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <h1 className="text-2xl font-bold">Section Results</h1>
            <div className="w-24" />
          </div>

          {/* Rings */}
          <div className="flex items-center justify-center gap-12 mb-8">
            {/* Initial Score Ring */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - initialScore / initialTotal)}`}
                    className="text-primary transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-3xl font-bold">{initialScore}</div>
                  <div className="text-sm text-muted-foreground">/{initialTotal}</div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">{initialPercent}%</div>
                <div className="text-xs text-muted-foreground">Initial Score</div>
              </div>
            </div>

            {/* BR Score Ring (if BR was done) */}
            {brScore !== null && (
              <>
                <div className="w-px h-24 bg-border" />
                <div className="flex flex-col items-center gap-3">
                  <div className="relative w-32 h-32">
                    <svg className="w-32 h-32 -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-muted"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 56}`}
                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - brScore / initialTotal)}`}
                        className="text-primary transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-3xl font-bold">{brScore}</div>
                      <div className="text-sm text-muted-foreground">/{initialTotal}</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold">{brPercent}%</div>
                    <div className="text-xs text-muted-foreground">Blind Review</div>
                  </div>
                </div>

                {/* Delta Ring */}
                <div className="w-px h-24 bg-border" />
                <div className="flex flex-col items-center gap-3">
                  <div className="relative w-32 h-32">
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className={cn(
                        "text-3xl font-bold",
                        delta! > 0 ? "text-green-600" : delta! < 0 ? "text-destructive" : ""
                      )}>
                        {delta! > 0 ? '+' : ''}{delta}
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold">
                      {delta! > 0 ? '+' : ''}{delta}
                    </div>
                    <div className="text-xs text-muted-foreground">Delta</div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Stat Chips */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="text-center">
              <div className="text-sm font-medium">{formatTime(totalTimeMs)}</div>
              <div className="text-xs text-muted-foreground">Total Time</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="text-sm font-medium">{formatTime(avgTimeMs)}</div>
              <div className="text-xs text-muted-foreground">Avg per Q</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="text-sm font-medium">{unansweredCount}</div>
              <div className="text-xs text-muted-foreground">Unanswered</div>
            </div>
          </div>

          {/* Top 3 Focus Areas */}
          <div className="mb-6">
            <div className="text-xs text-muted-foreground mb-3 text-center">Top 3 Focus Areas</div>
            <div className="flex items-center justify-center gap-6">
              {focusAreas.map((area, idx) => (
                <button
                  key={area.qtype}
                  onClick={() => setActiveFilter(activeFilter === `qtype:${area.qtype}` ? null : `qtype:${area.qtype}`)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-lg transition-colors",
                    activeFilter === `qtype:${area.qtype}` 
                      ? "bg-primary/10 ring-2 ring-primary" 
                      : "hover:bg-accent/30"
                  )}
                >
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        className="text-muted"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        strokeDashoffset={`${2 * Math.PI * 28 * (1 - area.accuracy / 100)}`}
                        className={cn(
                          "transition-all duration-500",
                          area.accuracy < 50 ? "text-destructive" : "text-primary"
                        )}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-sm font-bold">{area.accuracy}%</div>
                    </div>
                  </div>
                  <div className="text-xs font-medium">{area.qtype}</div>
                  <div className="text-xs text-muted-foreground">{area.correct}/{area.total}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Distribution */}
          <div>
            <div className="text-xs text-muted-foreground mb-3 text-center">Difficulty Distribution</div>
            <div className="flex items-center gap-3 max-w-xl mx-auto">
              <button
                onClick={() => setActiveFilter(activeFilter === 'easy' ? null : 'easy')}
                className={cn(
                  "flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium",
                  activeFilter === 'easy' 
                    ? "bg-green-100 dark:bg-green-900/30 ring-2 ring-green-600" 
                    : "bg-muted hover:bg-accent"
                )}
              >
                Easy: {difficultyDist.easy}
              </button>
              <button
                onClick={() => setActiveFilter(activeFilter === 'medium' ? null : 'medium')}
                className={cn(
                  "flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium",
                  activeFilter === 'medium' 
                    ? "bg-yellow-100 dark:bg-yellow-900/30 ring-2 ring-yellow-600" 
                    : "bg-muted hover:bg-accent"
                )}
              >
                Medium: {difficultyDist.medium}
              </button>
              <button
                onClick={() => setActiveFilter(activeFilter === 'hard' ? null : 'hard')}
                className={cn(
                  "flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium",
                  activeFilter === 'hard' 
                    ? "bg-red-100 dark:bg-red-900/30 ring-2 ring-red-600" 
                    : "bg-muted hover:bg-accent"
                )}
              >
                Hard: {difficultyDist.hard}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Question Table */}
      <div className="max-w-7xl mx-auto px-6 mt-6 space-y-2">
        {displayStats.map((stat) => {
          const isExpanded = expandedRows.has(stat.qid);
          
          return (
            <Card
              key={stat.qid}
              className={cn(
                "overflow-hidden transition-all",
                isExpanded && "ring-2 ring-primary"
              )}
            >
              {/* Main Row */}
              <button
                onClick={() => toggleRow(stat.qid)}
                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-accent/30 transition-colors text-left"
              >
                {/* Q# */}
                <div className="w-12 flex-shrink-0 text-sm font-mono font-bold">
                  Q{stat.qnum}
                </div>

                {/* Type & Difficulty */}
                <div className="w-32 flex-shrink-0">
                  <div className="text-sm font-medium">{stat.qtype}</div>
                  <div className="text-xs text-muted-foreground">
                    Level {stat.difficulty}
                  </div>
                </div>

                {/* Initial Answer */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge
                    variant="outline"
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm",
                      stat.initialCorrect ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-600" : 
                      stat.initialAnswer === '—' ? "bg-muted" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-600"
                    )}
                  >
                    {stat.initialAnswer}
                  </Badge>
                </div>

                {/* Correct Answer */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge
                    variant="outline"
                    className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm bg-muted"
                  >
                    {stat.correctAnswer}
                  </Badge>
                </div>

                {/* Result */}
                <div className="flex-shrink-0">
                  {stat.initialCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive" />
                  )}
                </div>

                {/* Time */}
                <div className="flex-1 min-w-0 text-sm font-mono">
                  {formatTime(stat.timeMs)}
                </div>

                {/* Flag */}
                <div className="flex-shrink-0">
                  {stat.flagged && <Flag className="w-4 h-4 text-amber-600" />}
                </div>

                {/* Switches */}
                <div className="w-16 flex-shrink-0 text-sm text-muted-foreground text-right">
                  {stat.switchCount > 0 && `${stat.switchCount}×`}
                </div>

                {/* Expand Icon */}
                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* BR Sub-row (if answer changed) */}
              {stat.brChanged && stat.brAnswer && (
                <div className="px-4 py-2 bg-accent/20 border-t flex items-center gap-4 text-sm">
                  <div className="w-12 flex-shrink-0 text-xs text-muted-foreground">BR</div>
                  <div className="w-32 flex-shrink-0" />
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge
                      variant="outline"
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm",
                        stat.brCorrect ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-600" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-600"
                      )}
                    >
                      {stat.brAnswer}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge
                      variant="outline"
                      className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm bg-muted"
                    >
                      {stat.correctAnswer}
                    </Badge>
                  </div>

                  <div className="flex-shrink-0">
                    {stat.brCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 text-sm font-mono text-muted-foreground">
                    {stat.brTimeMs ? formatTime(stat.brTimeMs) : '—'}
                  </div>

                  <div className="flex-shrink-0 text-xs">
                    Changed: {stat.initialAnswer} → {stat.brAnswer}
                  </div>
                </div>
              )}

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 py-3 border-t bg-accent/10 text-xs space-y-1">
                  <div>Revisit count: —</div>
                  <div>Switch count: {stat.switchCount}</div>
                  <div>Timeline: {formatTime(stat.timeMs)} - Answer selected ({stat.initialAnswer})</div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}