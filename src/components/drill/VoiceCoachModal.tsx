import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface VoiceCoachModalProps {
  open: boolean;
  question: any;
  selectedAnswer: string;
  onTryAgain: () => void;
  onMicroDrill: (questions: any[]) => void;
  onSaveToJournal: () => void;
  onClose: () => void;
  showContrast?: boolean;
}

type Phase = 'idle' | 'recording' | 'processing' | 'coach-response';

export function VoiceCoachModal({
  open,
  question,
  selectedAnswer,
  onTryAgain,
  onMicroDrill,
  onSaveToJournal,
  onClose,
  showContrast = false
}: VoiceCoachModalProps) {
  const { user } = useAuth();
  const [phase, setPhase] = React.useState<Phase>('idle');
  const [transcript, setTranscript] = React.useState('');
  const [coachReply, setCoachReply] = React.useState('');
  const [recordingDuration, setRecordingDuration] = React.useState(0);
  const [error, setError] = React.useState('');
  
  const recognitionRef = React.useRef<any>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = React.useRef<number>(0);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPiece + ' ';
          } else {
            interimTranscript += transcriptPiece;
          }
        }
        
        setTranscript(finalTranscript || interimTranscript);
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          setError('No speech detected. Please speak clearly and try again.');
        } else if (event.error === 'audio-capture') {
          setError('Microphone access denied. Please allow microphone access.');
        } else {
          setError('Voice recognition error. Please try again.');
        }
        stopRecording();
      };
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      setPhase('recording');
      setTranscript('');
      setError('');
      startTimeRef.current = Date.now();
      
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setRecordingDuration(Math.floor(elapsed / 1000));
        
        if (elapsed >= 20000) {
          stopRecording();
        }
      }, 100);
      
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (err) {
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    const duration = Date.now() - startTimeRef.current;
    
    if (duration < 2000) {
      setError('Recording too short. Please speak for at least 2 seconds.');
      setPhase('idle');
      return;
    }
    
    if (!transcript || transcript.trim().split(/\s+/).length < 3) {
      setError('Could not understand speech. Please speak more clearly.');
      setPhase('idle');
      return;
    }
    
    processTranscript(transcript, duration);
  };

  const processTranscript = async (text: string, durationMs: number) => {
    setPhase('processing');
    
    try {
      const { data, error } = await supabase.functions.invoke('voice-coach-respond', {
        body: {
          transcript: text,
          question,
          selectedAnswer,
          showContrast
        }
      });
      
      if (error) throw error;
      
      setCoachReply(data.coachReply);
      setPhase('coach-response');
      
      const classId = user?.user_metadata?.class_id;
      if (classId) {
        await supabase.from('voice_coaching_sessions').insert({
          class_id: classId,
          qid: question.qid,
          voice_duration_ms: durationMs,
          spoken_words: text,
          transcript_full: text,
          coach_reply_id: data.replyId,
          coach_reply_text: data.coachReply,
          action_taken: null
        });
      }
      
    } catch (err) {
      console.error('Error processing transcript:', err);
      setCoachReply('Your reasoning shows good effort. Look closely at what the stem is actually asking, then try the question again with fresh eyes.');
      setPhase('coach-response');
    }
  };

  const handleAction = async (action: 'try_again' | 'micro_drill' | 'save_journal') => {
    const classId = user?.user_metadata?.class_id;
    if (classId) {
      await supabase
        .from('voice_coaching_sessions')
        .update({ action_taken: action })
        .eq('class_id', classId)
        .eq('qid', question.qid)
        .order('created_at', { ascending: false })
        .limit(1);
    }
    
    if (action === 'try_again') {
      onTryAgain();
    } else if (action === 'micro_drill') {
      const { data } = await supabase.functions.invoke('generate-micro-drill', {
        body: { qtype: question.qtype, difficulty: question.difficulty, currentQid: question.qid }
      });
      onMicroDrill(data?.questions || []);
    } else if (action === 'save_journal') {
      onSaveToJournal();
    }
    
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg p-6 space-y-6 bg-card border-border">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">
            {phase === 'idle' && 'Explain your reasoning'}
            {phase === 'recording' && 'Listening...'}
            {phase === 'processing' && 'Processing...'}
            {phase === 'coach-response' && 'Coach feedback'}
          </h3>
        </div>

        {(phase === 'idle' || phase === 'recording') && (
          <div className="flex flex-col items-center gap-4">
            <Button
              size="lg"
              onClick={phase === 'idle' ? startRecording : stopRecording}
              className={cn(
                "w-20 h-20 rounded-full",
                "bg-muted-foreground hover:bg-muted-foreground/90"
              )}
            >
              {phase === 'recording' ? (
                <Square className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </Button>
            
            {phase === 'recording' && (
              <div className="text-center">
                <div className="text-2xl font-mono text-foreground">
                  {recordingDuration}s / 20s
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Speak naturally. Click to stop.
                </p>
              </div>
            )}
            
            {phase === 'idle' && (
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Click to start recording. Explain why you chose your answer.
              </p>
            )}
            
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </div>
        )}

        {phase === 'processing' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="w-12 h-12 text-muted-foreground animate-spin" />
            <p className="text-sm text-muted-foreground">Analyzing your reasoning...</p>
          </div>
        )}

        {phase === 'coach-response' && (
          <div className="space-y-6">
            <div className="p-4 bg-muted border border-border rounded-lg">
              <p className="text-base text-foreground leading-relaxed">
                {coachReply}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => handleAction('try_again')}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                Try again
              </Button>
              <Button
                onClick={() => handleAction('micro_drill')}
                variant="outline"
                className="flex-1"
              >
                1-min drill (2 Qs)
              </Button>
              <Button
                onClick={() => handleAction('save_journal')}
                variant="outline"
                className="flex-1"
              >
                Save to journal
              </Button>
            </div>
          </div>
        )}

        {phase !== 'processing' && (
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full"
          >
            Close
          </Button>
        )}
      </Card>
    </div>
  );
}
