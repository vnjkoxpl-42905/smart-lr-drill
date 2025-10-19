import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flag, Trash2, Play, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { questionBank } from '@/lib/questionLoader';

interface FlaggedQuestion {
  id: string;
  qid: string;
  pt: number;
  section: number;
  qnum: number;
  note?: string;
  flagged_at: string;
}

export default function FlaggedQuestions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [flaggedQuestions, setFlaggedQuestions] = React.useState<FlaggedQuestion[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadFlaggedQuestions();
  }, [user, navigate]);

  const loadFlaggedQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('flagged_questions')
        .select('*')
        .order('flagged_at', { ascending: false });

      if (error) throw error;
      setFlaggedQuestions(data || []);
    } catch (err) {
      console.error('Error loading flagged questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnflag = async (id: string) => {
    try {
      const { error } = await supabase
        .from('flagged_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setFlaggedQuestions(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      console.error('Error unflagging question:', err);
    }
  };

  const handlePracticeQuestion = (qid: string) => {
    const question = questionBank.getQuestion(qid);
    if (!question) return;

    navigate('/drill', {
      state: {
        mode: 'type-drill',
        config: {
          qtypes: [question.qtype],
          difficulties: [question.difficulty],
          pts: [question.pt],
          count: 1
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading flagged questions...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Flag className="w-6 h-6 text-blue-500" />
                  Flagged Questions
                </h1>
                <p className="text-sm text-muted-foreground">
                  {flaggedQuestions.length} question{flaggedQuestions.length !== 1 ? 's' : ''} marked for review
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {flaggedQuestions.length === 0 ? (
          <Card className="p-12 text-center">
            <Flag className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No Flagged Questions</h2>
            <p className="text-muted-foreground mb-6">
              Questions you flag during practice will appear here for easy review.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Start Practicing
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 max-w-4xl mx-auto">
            {flaggedQuestions.map((flagged) => {
              const question = questionBank.getQuestion(flagged.qid);
              
              return (
                <Card key={flagged.id} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Question Info */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">
                          PT{flagged.pt}-S{flagged.section}-Q{flagged.qnum}
                        </Badge>
                        {question && (
                          <>
                            <Badge variant="secondary">{question.qtype}</Badge>
                            <Badge>Difficulty {question.difficulty}</Badge>
                          </>
                        )}
                      </div>

                      {/* Question Stem Preview */}
                      {question && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {question.questionStem}
                        </p>
                      )}

                      {/* Flagged Date */}
                      <p className="text-xs text-muted-foreground">
                        Flagged {new Date(flagged.flagged_at).toLocaleDateString()}
                      </p>

                      {/* Note */}
                      {flagged.note && (
                        <div className="mt-2 p-3 bg-muted/50 rounded-md">
                          <p className="text-sm">{flagged.note}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => handlePracticeQuestion(flagged.qid)}
                        title="Practice this question"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Practice
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnflag(flagged.id)}
                        title="Remove flag"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Unflag
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
