import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react';
import type { DrillSession } from '@/types/drill';
import { questionBank } from '@/lib/questionLoader';
import { cn } from '@/lib/utils';

interface PracticeSetResultsProps {
  session: DrillSession;
  onReviewWrong: () => void;
  onReviewAll: () => void;
  onBack: () => void;
}

export function PracticeSetResults({ session, onReviewWrong, onReviewAll, onBack }: PracticeSetResultsProps) {
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());
  
  // Calculate stats
  const stats = React.useMemo(() => {
    const questionStats = session.questionQueue.map(qid => {
      const attempt = session.attempts.get(qid);
      const question = questionBank.getQuestion(qid);
      
      return {
        qid,
        question,
        attempt,
        answered: !!attempt?.selectedAnswer,
        correct: attempt?.correct || false,
      };
    });
    
    const answered = questionStats.filter(s => s.answered).length;
    const correct = questionStats.filter(s => s.correct).length;
    const totalTime = Array.from(session.attempts.values()).reduce((sum, a) => sum + (a.timeMs || 0), 0);
    const avgTime = answered > 0 ? Math.round(totalTime / answered) : 0;
    
    const times = Array.from(session.attempts.values())
      .map(a => a.timeMs || 0)
      .filter(t => t > 0)
      .sort((a, b) => a - b);
    const medianTime = times.length > 0 ? times[Math.floor(times.length / 2)] : 0;
    
    return {
      total: session.questionQueue.length,
      answered,
      correct,
      accuracy: answered > 0 ? Math.round((correct / answered) * 100) : 0,
      totalTime,
      avgTime,
      medianTime,
      questionStats,
    };
  }, [session]);
  
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  const toggleRow = (qid: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(qid)) {
        newSet.delete(qid);
      } else {
        newSet.add(qid);
      }
      return newSet;
    });
  };
  
  const wrongCount = stats.questionStats.filter(s => s.answered && !s.correct).length;
  
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Practice Set Results</h1>
          <div className="w-20" />
        </div>
        
        {/* Summary Stats */}
        <Card className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{stats.answered}</div>
              <div className="text-sm text-muted-foreground">Answered</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{stats.correct}</div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-destructive">{stats.answered - stats.correct}</div>
              <div className="text-sm text-muted-foreground">Incorrect</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{stats.accuracy}%</div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{formatTime(stats.totalTime)}</div>
              <div className="text-sm text-muted-foreground">Total Time</div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-xl font-semibold">{formatTime(stats.avgTime)}</div>
              <div className="text-xs text-muted-foreground">Avg Time/Question</div>
            </div>
            <div>
              <div className="text-xl font-semibold">{formatTime(stats.medianTime)}</div>
              <div className="text-xs text-muted-foreground">Median Time</div>
            </div>
          </div>
        </Card>
        
        {/* Review Actions */}
        <div className="flex gap-3 justify-center">
          <Button onClick={onReviewWrong} disabled={wrongCount === 0}>
            Review Wrong ({wrongCount})
          </Button>
          <Button variant="outline" onClick={onReviewAll}>
            Review All
          </Button>
        </div>
        
        {/* Question List */}
        <Card className="divide-y">
          {stats.questionStats.map((stat, index) => {
            if (!stat.question) return null;
            const isExpanded = expandedRows.has(stat.qid);
            
            return (
              <div key={stat.qid} className="p-4">
                <div 
                  className="flex items-center gap-4 cursor-pointer hover:bg-accent/50 -m-4 p-4 rounded-md transition-colors"
                  onClick={() => toggleRow(stat.qid)}
                >
                  {/* Question Number */}
                  <div className="text-sm font-mono text-muted-foreground w-8">
                    {index + 1}.
                  </div>
                  
                  {/* Status Icon */}
                  <div className="shrink-0">
                    {stat.correct ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : stat.answered ? (
                      <XCircle className="w-5 h-5 text-destructive" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
                    )}
                  </div>
                  
                  {/* Question Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        PT{stat.question.pt}-S{stat.question.section}-Q{stat.question.qnum}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {stat.question.qtype}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        L{stat.question.difficulty}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Answer & Time */}
                  <div className="flex items-center gap-4 text-sm">
                    {stat.attempt && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Your:</span>
                          <Badge variant={stat.correct ? "default" : "destructive"}>
                            {stat.attempt.selectedAnswer}
                          </Badge>
                        </div>
                        {!stat.correct && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Correct:</span>
                            <Badge variant="outline">
                              {stat.question.correctAnswer}
                            </Badge>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(stat.attempt.timeMs || 0)}</span>
                        </div>
                        {stat.attempt.confidence && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Confidence:</span>
                            <Badge variant="secondary" className="text-xs">
                              {stat.attempt.confidence}/5
                            </Badge>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Expand Icon */}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                
                {/* Expanded Details */}
                {isExpanded && stat.attempt && (
                  <div className="mt-4 pl-16 space-y-2 text-sm">
                    {stat.attempt.switchCount !== undefined && stat.attempt.switchCount > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Answer changes:</span>
                        <Badge variant="outline">{stat.attempt.switchCount}</Badge>
                      </div>
                    )}
                    {stat.attempt.revisitCount !== undefined && stat.attempt.revisitCount > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Times revisited:</span>
                        <Badge variant="outline">{stat.attempt.revisitCount}</Badge>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
