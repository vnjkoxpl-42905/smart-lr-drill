import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ArrowLeft, Play } from 'lucide-react';
import { getWAJEntries, type WAJEntry, type WAJHistoryItem } from '@/lib/wajService';
import { questionBank } from '@/lib/questionLoader';
import { supabase } from '@/integrations/supabase/client';

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

export default function WrongAnswerJournal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entries, setEntries] = React.useState<WAJEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedEntry, setSelectedEntry] = React.useState<WAJEntry | null>(null);
  const [classId, setClassId] = React.useState<string>('');
  const [filters, setFilters] = React.useState<{
    qtype?: string;
    level?: number;
    pt?: number;
    last_status?: 'wrong' | 'right';
  }>({});

  React.useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  // Resolve class_id
  React.useEffect(() => {
    const fetchClassId = async () => {
      if (!user) return;
      const { data: student } = await supabase
        .from('students')
        .select('class_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (student?.class_id) setClassId(student.class_id);
    };
    fetchClassId();
  }, [user]);

  React.useEffect(() => {
    if (classId) loadEntries();
  }, [filters, classId]);

  const loadEntries = async () => {
    if (!classId) return;
    
    setLoading(true);
    try {
      const data = await getWAJEntries(classId, filters);
      setEntries(data);
    } catch (error) {
      console.error('Failed to load WAJ entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReattempt = (entry: WAJEntry) => {
    const question = questionBank.getQuestion(entry.qid);
    if (!question) return;

    navigate('/drill', {
      state: {
        mode: 'type-drill',
        config: {
          qtypes: [entry.qtype],
          difficulties: [entry.level],
          pts: [entry.pt],
          count: 1,
        },
      },
    });
  };

  const allQTypes = Array.from(new Set(questionBank.getAllQuestions().map(q => q.qtype)));
  const allLevels = [1, 2, 3, 4, 5];
  const allPTs = Array.from(new Set(questionBank.getAllQuestions().map(q => q.pt))).sort((a, b) => a - b);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Wrong Answer Journal</h1>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex gap-3 flex-wrap">
            <Select
              value={filters.qtype || 'all'}
              onValueChange={(v) => setFilters({ ...filters, qtype: v === 'all' ? undefined : v })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Question Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Question Types</SelectItem>
                {allQTypes.map((qt) => (
                  <SelectItem key={qt} value={qt}>
                    {qt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.level?.toString() || 'all'}
              onValueChange={(v) =>
                setFilters({ ...filters, level: v === 'all' ? undefined : parseInt(v) })
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {allLevels.map((l) => (
                  <SelectItem key={l} value={l.toString()}>
                    Level {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.pt?.toString() || 'all'}
              onValueChange={(v) =>
                setFilters({ ...filters, pt: v === 'all' ? undefined : parseInt(v) })
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All PTs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All PTs</SelectItem>
                {allPTs.map((pt) => (
                  <SelectItem key={pt} value={pt.toString()}>
                    PT {pt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.last_status || 'all'}
              onValueChange={(v) =>
                setFilters({ ...filters, last_status: v === 'all' ? undefined : (v as 'wrong' | 'right') })
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="wrong">Still Wrong</SelectItem>
                <SelectItem value="right">Now Correct</SelectItem>
              </SelectContent>
            </Select>

            {Object.keys(filters).length > 0 && (
              <Button variant="outline" onClick={() => setFilters({})}>
                Clear Filters
              </Button>
            )}
          </div>
        </Card>

        {/* Entries List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : entries.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No wrong answers yet. Keep practicing!</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <Card
                key={entry.id}
                className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setSelectedEntry(entry)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="font-mono text-sm">
                      PT{entry.pt}-S{entry.section}-Q{entry.qnum}
                    </div>
                    <Badge variant="secondary">{entry.qtype}</Badge>
                    <Badge>Level {entry.level}</Badge>
                    <Badge variant={entry.last_status === 'right' ? 'default' : 'destructive'}>
                      {entry.last_status === 'right' ? 'Now Correct' : 'Still Wrong'}
                    </Badge>
                    {entry.revisit_count > 0 && (
                      <span className="text-sm text-muted-foreground">
                        ({entry.revisit_count + 1} attempts)
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReattempt(entry);
                    }}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Reattempt
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedEntry && (
            <>
              <SheetHeader>
                <SheetTitle>
                  PT{selectedEntry.pt}-S{selectedEntry.section}-Q{selectedEntry.qnum} History
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="flex gap-2">
                  <Badge variant="secondary">{selectedEntry.qtype}</Badge>
                  <Badge>Level {selectedEntry.level}</Badge>
                </div>

                <div className="space-y-4">
                  {(selectedEntry.history_json as WAJHistoryItem[]).map((item, idx) => (
                    <Card key={idx} className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {new Date(item.attempt_at_iso).toLocaleString()}
                          </span>
                          <Badge variant={item.result === 1 ? 'default' : 'destructive'}>
                            {item.result === 1 ? 'Correct' : 'Wrong'}
                          </Badge>
                        </div>
                        <div className="text-sm">
                          <div>Chose: ({item.chosen_answer})</div>
                          <div>Correct: ({item.correct_answer})</div>
                          <div>Time: {formatTime(item.time_ms)}</div>
                          {item.confidence_1_5 && <div>Confidence: {item.confidence_1_5}/5</div>}
                        </div>
                        {item.review && (
                          <div className="mt-3 space-y-2 text-sm border-t pt-3">
                            <div>
                              <div className="font-semibold">Why I chose the wrong answer:</div>
                              <p className="text-muted-foreground">{item.review.q1}</p>
                            </div>
                            <div>
                              <div className="font-semibold">Why I eliminated the right answer:</div>
                              <p className="text-muted-foreground">{item.review.q2}</p>
                            </div>
                            <div>
                              <div className="font-semibold">Plan to avoid next time:</div>
                              <p className="text-muted-foreground">{item.review.q3}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
