import * as React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
}

export function TalkModeModal({ 
  open, 
  question, 
  userAnswer, 
  existingMessages,
  onClose,
  onMessagesUpdate 
}: TalkModeModalProps) {
  const [messages, setMessages] = React.useState<Message[]>(existingMessages);
  const [isRecording, setIsRecording] = React.useState(false);
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [userTranscript, setUserTranscript] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [recordingError, setRecordingError] = React.useState<string | null>(null);
  
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const recognitionRef = React.useRef<any>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);
  const currentTranscriptRef = React.useRef<string>('');

  // Sync messages with parent
  React.useEffect(() => {
    setMessages(existingMessages);
  }, [existingMessages]);

  // Initialize speech recognition
  React.useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      setRecordingError('Voice recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }
    
    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
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

  // Initialize audio visualization
  React.useEffect(() => {
    if (!open) return;
    
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
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [open]);

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
    } catch (error) {
      console.error('Failed to process voice message:', error);
      toast.error('Failed to process your message. Please try again.');
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[80vh] bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 border border-cyan-500/30 p-0 gap-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-3 h-3 rounded-full animate-pulse",
              isRecording ? "bg-cyan-500" : isSpeaking ? "bg-purple-500" : "bg-slate-600"
            )} />
            <h2 className="text-lg font-semibold">
              {isRecording ? 'Listening...' : isSpeaking ? 'Joshua is speaking...' : 'Talk Mode'}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Wavelength Visualization */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            className="rounded-lg border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.15)]"
          />
          
          {/* Transcript Overlay */}
          {userTranscript && (
            <div className="mt-4 max-w-md text-center">
              <p className="text-sm text-cyan-400 opacity-70">You're saying:</p>
              <p className="text-base text-foreground mt-1">{userTranscript}</p>
            </div>
          )}
          
          {isProcessing && (
            <div className="mt-4 text-sm text-purple-400 animate-pulse">
              Processing your response...
            </div>
          )}
          
          {recordingError && !isRecording && (
            <div className="mt-4 max-w-md text-center">
              <p className="text-sm text-red-400">{recordingError}</p>
            </div>
          )}
          
          {/* Messages Display */}
          {messages.length > 0 && !isRecording && !userTranscript && (
            <div className="mt-6 max-w-lg max-h-40 overflow-y-auto space-y-3">
              {messages.slice(-3).map((msg, idx) => (
                <div key={idx} className={cn(
                  "p-3 rounded-lg text-sm",
                  msg.role === 'user' 
                    ? 'bg-cyan-500/20 text-cyan-100 ml-8' 
                    : 'bg-purple-500/20 text-purple-100 mr-8'
                )}>
                  <p className="font-medium text-xs mb-1 opacity-70">
                    {msg.role === 'user' ? 'You' : 'Joshua'}
                  </p>
                  <p>{msg.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Press & Hold Button */}
        <div className="px-6 py-4 border-t border-cyan-500/20">
          <Button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={isProcessing || isSpeaking}
            className={cn(
              "w-full h-16 text-lg font-semibold transition-all duration-200",
              isRecording 
                ? "bg-gradient-to-r from-red-500 to-red-600 shadow-[0_0_30px_rgba(239,68,68,0.5)]" 
                : "bg-gradient-to-r from-cyan-500 to-purple-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]"
            )}
          >
            <Mic className={cn("w-6 h-6 mr-2", isRecording && "animate-pulse")} />
            {isRecording ? 'Release to Send' : 'Press & Hold to Speak'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
