import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  ChevronUp, 
  Flag, 
  FileText, 
  CheckCircle2, 
  XCircle,
  ArrowLeft 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { questionBank } from '@/lib/questionLoader';
import type { DrillSession } from '@/types/drill';

interface ScoreReportProps {
  session: DrillSession;
  onStartReview: () => void;
  onFullReview: () => void;
  onBack: () => void;
}

interface QuestionStats {
  qid: string;
  pt: number;
  section: number;
  qnum: number;
  qtype: string;
  difficulty: number;
  timedAnswer: string;
  correctAnswer: string;
  timedCorrect: boolean;
  brAnswer?: string;
  brCorrect?: boolean;
  timedTimeMs: number;
  brTimeMs?: number;
  wasFlagged: boolean;
  hasNote: boolean;
  revisitCount: number;
  switchCount: number;
}

export function ScoreReport({ session, onStartReview, onFullReview, onBack }: ScoreReportProps) {
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());
  const [filterWrong, setFilterWrong] = React.useState(false);
  const [filterFlagged, setFilterFlagged] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<'order' | 'time' | 'switches'>('order');
  const [jumpToInput, setJumpToInput] = React.useState('');

  // Build question stats
  const stats: QuestionStats[] = React.useMemo(() => {
    return session.questionQueue.map(qid => {
      const question = questionBank.getQuestion(qid);
      const attempt = session.attempts.get(qid);
      
      if (!question || !attempt) return null;

      return {
        qid,
        pt: question.pt,
        section: question.section,
        qnum: question.qnum,
        qtype: question.qtype,
        difficulty: question.difficulty,
        timedAnswer: attempt.selectedAnswer,
        correctAnswer: question.correctAnswer,
        timedCorrect: attempt.correct,
        brAnswer: undefined, // TODO: get from BR results
        brCorrect: undefined,
        timedTimeMs: attempt.timeMs,
        brTimeMs: undefined,
        wasFlagged: attempt.brMarked || false,
        hasNote: false, // TODO: track notes
        revisitCount: 0, // TODO: track revisits
        switchCount: 0, // TODO: track switches
      };
    }).filter(Boolean) as QuestionStats[];
  }, [session]);

  // Calculate summary stats
  const totalQuestions = stats.length;
  const correctCount = stats.filter(s => s.timedCorrect).length;
  const percentCorrect = Math.round((correctCount / totalQuestions) * 100);
  const totalTimeMs = stats.reduce((sum, s) => sum + s.timedTimeMs, 0);
  const avgTimeMs = Math.round(totalTimeMs / totalQuestions);
  const medianTimeMs = React.useMemo(() => {
    if (stats.length === 0) return 0;
    const sorted = [...stats].sort((a, b) => a.timedTimeMs - b.timedTimeMs);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1].timedTimeMs + sorted[mid].timedTimeMs) / 2)
      : sorted[mid].timedTimeMs;
  }, [stats]);

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

  // Filter and sort
  let displayStats = [...stats];
  if (filterWrong) displayStats = displayStats.filter(s => !s.timedCorrect);
  if (filterFlagged) displayStats = displayStats.filter(s => s.wasFlagged);
  
  if (sortBy === 'time') {
    displayStats.sort((a, b) => b.timedTimeMs - a.timedTimeMs);
  } else if (sortBy === 'switches') {
    displayStats.sort((a, b) => b.switchCount - a.switchCount);
  }

  const handleJumpTo = () => {
    const num = parseInt(jumpToInput);
    if (num >= 1 && num <= totalQuestions) {
      const qid = session.questionQueue[num - 1];
      const element = document.getElementById(`row-${qid}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setExpandedRows(new Set([qid]));
    }
    setJumpToInput('');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-bold">Score Report</h1>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={onStartReview}>
                Start Review
              </Button>
              <Button variant="outline" size="sm" onClick={onFullReview}>
                Full Review
              </Button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-5 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Score</div>
              <div className="text-2xl font-bold">{correctCount}/{totalQuestions}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Accuracy</div>
              <div className="text-2xl font-bold">{percentCorrect}%</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Total Time</div>
              <div className="text-2xl font-bold">{formatTime(totalTimeMs)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Avg Time</div>
              <div className="text-2xl font-bold">{formatTime(avgTimeMs)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Median Time</div>
              <div className="text-2xl font-bold">{formatTime(medianTimeMs)}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 pt-2 border-t">
            <Button
              variant={filterWrong ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterWrong(!filterWrong)}
            >
              Wrong Only
            </Button>
            <Button
              variant={filterFlagged ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterFlagged(!filterFlagged)}
            >
              Flagged Only
            </Button>
            
            <div className="h-4 w-px bg-border" />
            
            <Button
              variant={sortBy === 'order' ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy('order')}
            >
              Order
            </Button>
            <Button
              variant={sortBy === 'time' ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy('time')}
            >
              Longest Time
            </Button>
            <Button
              variant={sortBy === 'switches' ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy('switches')}
            >
              Most Switches
            </Button>

            <div className="h-4 w-px bg-border" />

            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Go to #"
                value={jumpToInput}
                onChange={(e) => setJumpToInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJumpTo()}
                className="w-24 h-8"
                min={1}
                max={totalQuestions}
              />
              <Button size="sm" onClick={handleJumpTo}>Go</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Question Table */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-px">
        {displayStats.map((stat, idx) => {
          const isExpanded = expandedRows.has(stat.qid);
          
          return (
            <div
              key={stat.qid}
              id={`row-${stat.qid}`}
              className={cn(
                "bg-card border rounded-lg overflow-hidden transition-all duration-150",
                isExpanded && "ring-1 ring-primary"
              )}
            >
              {/* Main Row */}
              <button
                onClick={() => toggleRow(stat.qid)}
                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-accent/30 transition-colors text-left"
              >
                {/* Question ID */}
                <div className="w-32 flex-shrink-0">
                  <div className="text-sm font-mono">
                    PT{stat.pt}-S{stat.section}-Q{stat.qnum}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stat.qtype} • L{stat.difficulty}
                  </div>
                </div>

                {/* Timed Answer */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-xs text-muted-foreground w-12">Timed</div>
                  <Badge
                    variant={stat.timedCorrect ? "default" : "destructive"}
                    className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs"
                  >
                    {stat.timedAnswer}
                  </Badge>
                  {stat.timedCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                </div>

                {/* Correct Answer */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-xs text-muted-foreground w-16">Correct</div>
                  <Badge
                    variant="outline"
                    className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs"
                  >
                    {stat.correctAnswer}
                  </Badge>
                </div>

                {/* BR Answer (if exists) */}
                {stat.brAnswer && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-xs text-muted-foreground w-8">BR</div>
                    <Badge
                      variant={stat.brCorrect ? "default" : "destructive"}
                      className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs"
                    >
                      {stat.brAnswer}
                    </Badge>
                    {stat.brCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                )}

                {/* Time Bar */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-accent/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/60"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div className="text-xs font-mono text-muted-foreground w-16 text-right">
                      {formatTime(stat.timedTimeMs)}
                    </div>
                  </div>
                </div>

                {/* Icons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {stat.wasFlagged && (
                    <Flag className="w-3 h-3 text-muted-foreground" />
                  )}
                  {stat.hasNote && (
                    <FileText className="w-3 h-3 text-muted-foreground" />
                  )}
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

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 py-3 border-t bg-accent/10 space-y-3">
                  <div className="text-xs space-y-2">
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground w-24">Time to first:</span>
                      <span className="font-mono">0:00</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground w-24">Time to final:</span>
                      <span className="font-mono">{formatTime(stat.timedTimeMs)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground w-24">Revisit count:</span>
                      <span className="font-mono">{stat.revisitCount}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground w-24">Switch count:</span>
                      <span className="font-mono">{stat.switchCount}</span>
                    </div>
                  </div>

                  {/* Timeline placeholder */}
                  <div className="pt-2 border-t">
                    <div className="text-xs text-muted-foreground mb-2">Timeline</div>
                    <div className="space-y-1 text-xs font-mono">
                      <div>0:00 - Question viewed</div>
                      <div>{formatTime(stat.timedTimeMs)} - Answer selected ({stat.timedAnswer})</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
