import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface SectionRecord {
  id: string;
  pt: number;
  section: number;
  initial_score: number;
  initial_total: number;
  initial_percent: number;
  br_score: number | null;
  br_percent: number | null;
  created_at: string;
  total_time_ms: number;
}

export function RecentPerformanceWidget() {
  const { user } = useAuth();
  const [records, setRecords] = useState<SectionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentPerformance();
  }, [user]);

  const fetchRecentPerformance = async () => {
    if (!user) return;
    
    try {
      const classId = (user as any).user_metadata?.class_id || '';
      
      const { data, error } = await supabase
        .from('section_history')
        .select('id, pt, section, initial_score, initial_total, initial_percent, br_score, br_percent, created_at, total_time_ms')
        .eq('class_id', classId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching recent performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <Card className="p-6 bg-surface-elevated/40 backdrop-blur-sm border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-accent-bronze" />
          <h3 className="text-sm font-semibold text-text-primary">Recent Performance</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-accent/5 rounded-lg animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (records.length === 0) {
    return (
      <Card className="p-6 bg-surface-elevated/40 backdrop-blur-sm border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-accent-bronze" />
          <h3 className="text-sm font-semibold text-text-primary">Recent Performance</h3>
        </div>
        <div className="text-center py-8 text-text-tertiary text-sm">
          No practice sessions yet. Start drilling to see your performance!
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-surface-elevated/40 backdrop-blur-sm border-border/50 hover:border-accent-bronze/30 transition-all duration-150">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent-bronze" />
          <h3 className="text-sm font-semibold text-text-primary">Recent Performance</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          Last {records.length}
        </Badge>
      </div>

      <div className="space-y-2">
        {records.map((record, idx) => {
          const finalScore = record.br_score !== null ? record.br_score : record.initial_score;
          const finalPercent = record.br_percent !== null ? record.br_percent : record.initial_percent;
          const improved = record.br_score !== null && record.br_score > record.initial_score;
          
          return (
            <div
              key={record.id}
              className={cn(
                "group relative p-3 rounded-lg border transition-all duration-150",
                idx === 0 
                  ? "bg-accent-bronze/5 border-accent-bronze/20 hover:border-accent-bronze/40" 
                  : "bg-surface/40 border-border/30 hover:border-accent-bronze/20"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {idx === 0 && (
                    <Trophy className="w-4 h-4 text-accent-bronze flex-shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary font-mono">
                        PT{record.pt}-S{record.section}
                      </span>
                      {improved && (
                        <Badge variant="default" className="text-xs px-1.5 py-0 h-5">
                          +{record.br_score! - record.initial_score}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-tertiary mt-0.5">
                      <Clock className="w-3 h-3" />
                      {formatTime(record.total_time_ms)}
                      <span>•</span>
                      <span>{formatDate(record.created_at)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-lg font-bold text-text-primary font-mono">
                      {finalScore}/{record.initial_total}
                    </div>
                    <div className={cn(
                      "text-xs font-medium",
                      finalPercent >= 70 ? "text-green-600" : 
                      finalPercent >= 50 ? "text-yellow-600" : 
                      "text-red-600"
                    )}>
                      {finalPercent}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
