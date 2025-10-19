import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { X, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { LRQuestion } from '@/lib/questionLoader';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface TalkModeModalProps {
  open: boolean;
  question: LRQuestion | null;
  userAnswer: string;
  existingMessages: Message[];
  onClose: () => void;
  onMessagesUpdate: (messages: Message[]) => void;
  inlineMode?: boolean;
}

export function TalkModeModal({ 
  open, 
  question, 
  userAnswer, 
  existingMessages,
  onClose,
  onMessagesUpdate,
  inlineMode = false,
}: TalkModeModalProps) {
  const [messages, setMessages] = React.useState<Message[]>(existingMessages);
  const [isRecording, setIsRecording] = React.useState(false);
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [userTranscript, setUserTranscript] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [recordingError, setRecordingError] = React.useState<string | null>(null);
  const [supportsSpeech, setSupportsSpeech] = React.useState(false);
  const [hasGreeted, setHasGreeted] = React.useState(false);
  
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const recognitionRef = React.useRef<any>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);
  const currentTranscriptRef = React.useRef<string>('');
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  // Helper to extract detailed error from Supabase Edge Function responses
  const extractFunctionError = async (err: any): Promise<string> => {
    try {
      const ctx = (err as any)?.context;
      if (ctx && typeof (ctx as any).text === 'function') {
        const status = (ctx as any).status;
        const raw = await (ctx as any).text();
        try {
          const json = JSON.parse(raw);
          const msg = json.error || json.message || raw;
          return status ? `${msg} (HTTP ${status})` : msg;
        } catch {
          return status ? `${raw} (HTTP ${status})` : raw;
        }
      }
      return (err as any)?.message || 'Unexpected error from coaching service.';
    } catch {
      return (err as any)?.message || 'Unexpected error from coaching service.';
    }
  };

  // Sync messages with parent
  React.useEffect(() => {
    setMessages(existingMessages);
    if (existingMessages && existingMessages.length > 0) setHasGreeted(true);
  }, [existingMessages]);
  // Initialize speech recognition
  React.useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      setSupportsSpeech(false);
      setRecordingError('Voice recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }
    setSupportsSpeech(true);
    const SR = (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SR();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';
    recognitionRef.current.maxAlternatives = 1;
    
    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      
      const fullTranscript = finalTranscript || interimTranscript;
      setUserTranscript(fullTranscript);
      currentTranscriptRef.current = fullTranscript;
    };
    
    recognitionRef.current.onend = async () => {
      setIsRecording(false);
      const transcript = currentTranscriptRef.current.trim();
      
      if (transcript) {
        await sendVoiceMessage(transcript);
        currentTranscriptRef.current = '';
      } else {
        setRecordingError('No speech detected. Please try again.');
        toast.error('No speech detected. Please speak clearly.');
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      
      let errorMessage = 'Voice recognition error. Please try again.';
      if (event.error === 'no-speech') {
        errorMessage = 'No speech detected. Please try speaking again.';
      } else if (event.error === 'audio-capture') {
        errorMessage = 'Microphone access denied. Please allow microphone access.';
      } else if (event.error === 'not-allowed') {
        errorMessage = 'Microphone permission denied. Please enable microphone access in your browser settings.';
      } else if (event.error === 'network') {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      setRecordingError(errorMessage);
      toast.error(errorMessage);
    };
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error('Error stopping recognition:', e);
        }
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  // Initialize audio visualization or visibility observer based on mode
  React.useEffect(() => {
    if (!open) return;

    // In inline mode, set up an IntersectionObserver to stop recording when panel is out of view
    if (inlineMode) {
      const el = panelRef.current;
      if (!el) return;
      const observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting && isRecording) {
          stopRecording();
        }
      }, { threshold: 0 });
      observer.observe(el);
      return () => observer.disconnect();
    }

    // Dialog mode: set up audio visualization (kept for fallback)
    const setupAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        analyserRef.current.fftSize = 256;
        drawWaveform();
      } catch (err) {
        console.error('Audio setup failed:', err);
        toast.error('Microphone access denied. Please enable microphone permissions.');
      }
    };
    setupAudio();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [open, inlineMode, isRecording]);

  // Initial assistant greeting when modal opens
  React.useEffect(() => {
    if (!open || !question || hasGreeted) return;
    const run = async () => {
      try {
        const questionData = {
          qid: question.qid,
          pt: question.pt,
          section: question.section,
          qnum: question.qnum,
          qtype: question.qtype,
          level: question.difficulty,
          stimulus: question.stimulus,
          questionStem: question.questionStem,
          answerChoices: question.answerChoices,
          userAnswer,
          correctAnswer: question.correctAnswer,
          breakdown: question.breakdown,
          answerChoiceExplanations: question.answerChoiceExplanations,
          reasoningType: question.reasoningType,
        };
        const { data, error } = await supabase.functions.invoke('tutor-chat', {
          body: { question: questionData, messages: [] },
        });
        if (error) throw error;
        const assistantMessage: Message = { role: 'assistant', content: data.content };
        const finalMessages = [assistantMessage];
        setMessages(finalMessages);
        onMessagesUpdate(finalMessages);
        setHasGreeted(true);
        speakResponse(data.content);
      } catch (e: any) {
        console.error('Failed to start talk mode:', e);
        const msg = await extractFunctionError(e);
        toast.error(msg);
      }
    };
    run();
  }, [open, question, hasGreeted]);

  // Wavelength visualization
  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      
      analyserRef.current!.getByteTimeDomainData(dataArray);
      
      // Clear canvas
      ctx.fillStyle = 'rgb(15, 23, 42)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw waveform
      ctx.lineWidth = 3;
      ctx.strokeStyle = isRecording 
        ? 'rgb(6, 182, 212)' 
        : isSpeaking 
        ? 'rgb(168, 85, 247)' 
        : 'rgb(71, 85, 105)';
      
      ctx.beginPath();
      
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      
      // Add glow effect
      if (isRecording || isSpeaking) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = isRecording ? 'rgba(6, 182, 212, 0.8)' : 'rgba(168, 85, 247, 0.8)';
      }
    };
    
    draw();
  };

  const startRecording = () => {
    if (!recognitionRef.current) {
      const errorMsg = 'Voice recognition is not supported in your browser. Please use Chrome, Edge, or Safari.';
      setRecordingError(errorMsg);
      toast.error(errorMsg);
      return;
    }
    
    if (isProcessing || isSpeaking) {
      toast.error('Please wait for the current action to complete.');
      return;
    }
    
    setIsRecording(true);
    setUserTranscript('');
    setRecordingError(null);
    currentTranscriptRef.current = '';
    
    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting recognition:', error);
      setIsRecording(false);
      toast.error('Failed to start voice recognition. Please try again.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
        setIsRecording(false);
      }
    }
  };

  const sendVoiceMessage = async (transcript: string) => {
    if (!question || !transcript.trim()) return;
    
    setIsProcessing(true);
    const userMessage: Message = { role: 'user', content: transcript };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setUserTranscript('');
    
    try {
      const questionData = {
        qid: question.qid,
        pt: question.pt,
        section: question.section,
        qnum: question.qnum,
        qtype: question.qtype,
        level: question.difficulty,
        stimulus: question.stimulus,
        questionStem: question.questionStem,
        answerChoices: question.answerChoices,
        userAnswer,
        correctAnswer: question.correctAnswer,
        breakdown: question.breakdown,
        answerChoiceExplanations: question.answerChoiceExplanations,
        reasoningType: question.reasoningType,
      };

      const { data, error } = await supabase.functions.invoke('tutor-chat', {
        body: {
          question: questionData,
          messages: updatedMessages,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = { role: 'assistant', content: data.content };
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      onMessagesUpdate(finalMessages);
      
      speakResponse(data.content);
    } catch (e: any) {
      console.error('Failed to process voice message:', e);
      const msg = await extractFunctionError(e);
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const speakResponse = (text: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = 'en-US';
    
    utterance.onstart = () => {
      console.log('Speech started');
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      console.log('Speech ended');
      setIsSpeaking(false);
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
      toast.error('Failed to play audio response. Please check your device audio settings.');
    };
    
    // Small delay to ensure cancellation completed
    setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('Error speaking:', error);
        setIsSpeaking(false);
        toast.error('Failed to play audio response.');
      }
    }, 100);
  };

  if (!open) return null;

  // Inline mode: small tinted panel under the stimulus, keeping question in view
  if (inlineMode) {
    return (
      <div ref={panelRef} className="mt-4 ml-4 max-w-sm w-full rounded-md border bg-card shadow-md animate-fade-in">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-2.5 h-2.5 rounded-full',
              isRecording ? 'bg-[hsl(var(--primary))]' : isSpeaking ? 'bg-[hsl(var(--muted-foreground))]' : 'bg-[hsl(var(--muted))]'
            )} />
            <h3 className="text-sm font-medium">Talk Mode</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>

        {/* Vortex visualization */}
        <div className="p-4">
          <div className="w-full h-32 flex items-center justify-center">
            <div className="relative w-24 h-24">
              <div className={cn('absolute inset-0 rounded-full border', isRecording ? 'border-[hsl(var(--primary))] pulse' : 'border-[hsl(var(--muted-foreground))]')} />
              <div className="absolute inset-3 rounded-full border border-[hsl(var(--muted-foreground))]/40" />
              <div className="absolute inset-6 rounded-full border border-[hsl(var(--muted-foreground))]/30" />
            </div>
          </div>

          {/* Transcript */}
          {userTranscript && (
            <div className="mt-3 text-sm text-muted-foreground">
              <p className="text-xs">You're saying:</p>
              <p className="mt-1 text-foreground">{userTranscript}</p>
            </div>
          )}

          {isProcessing && (
            <div className="mt-2 text-xs text-muted-foreground animate-pulse">Processing your response...</div>
          )}

          {recordingError && !isRecording && (
            <div className="mt-2 text-xs text-destructive">{recordingError}</div>
          )}

          {/* Controls */}
          {supportsSpeech ? (
            <div className="mt-4 space-y-2">
              <Button onClick={() => (isRecording ? stopRecording() : startRecording())} disabled={isProcessing || isSpeaking} className="w-full h-10">
                <Mic className={cn('w-4 h-4 mr-2', isRecording && 'animate-pulse')} />
                {isRecording ? 'Stop and Send' : 'Speak now'}
              </Button>
              <Button onClick={onClose} variant="outline" className="w-full h-9">Return to Question</Button>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              <textarea
                value={userTranscript}
                onChange={(e) => setUserTranscript(e.target.value)}
                placeholder="Type your response..."
                className="w-full min-h-[48px] rounded-md border bg-background px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <Button onClick={() => sendVoiceMessage(userTranscript)} disabled={!userTranscript.trim() || isProcessing || isSpeaking} className="h-9 px-4">
                  Send
                </Button>
                <Button onClick={onClose} variant="outline" className="h-9">Return</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback: dialog mode (kept for other contexts). Includes a11y header.
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[80vh] bg-card border p-0 gap-0">
        <DialogHeader>
          <DialogTitle>Talk Mode</DialogTitle>
          <DialogDescription>Speak your reasoning and receive guidance.</DialogDescription>
        </DialogHeader>
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-3 h-3 rounded-full',
              isRecording ? 'bg-[hsl(var(--primary))]' : isSpeaking ? 'bg-[hsl(var(--muted-foreground))]' : 'bg-[hsl(var(--muted))]'
            )} />
            <h2 className="text-lg font-semibold">
              {isRecording ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Talk Mode'}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        {/* Keep previous dialog body minimal to reduce visual noise */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <canvas ref={canvasRef} width={600} height={200} className="rounded-lg border" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
