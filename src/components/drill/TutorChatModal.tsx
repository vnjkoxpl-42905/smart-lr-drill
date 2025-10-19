import * as React from "react";
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sparkles, RefreshCw, Mic, Volume2, Waves } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LRQuestion } from '@/lib/questionLoader';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface TutorChatModalProps {
  open: boolean;
  question: LRQuestion | null;
  userAnswer: string;
  onClose: () => void;
  onTryAgain: () => void;
  onOpenTalkMode?: () => void;
  messages?: Message[];
  onMessagesUpdate?: (messages: Message[]) => void;
}

export function TutorChatModal({ 
  open, 
  question, 
  userAnswer, 
  onClose, 
  onTryAgain, 
  onOpenTalkMode,
  messages: externalMessages,
  onMessagesUpdate 
}: TutorChatModalProps) {
  const [messages, setMessages] = React.useState<Message[]>(externalMessages || []);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [initializing, setInitializing] = React.useState(true);
  const [voiceInputEnabled, setVoiceInputEnabled] = React.useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const recognitionRef = React.useRef<any>(null);
  const synthRef = React.useRef<SpeechSynthesisUtterance | null>(null);

  // Sync external messages
  React.useEffect(() => {
    if (externalMessages) {
      setMessages(externalMessages);
    }
  }, [externalMessages]);

  // Notify parent of message updates
  React.useEffect(() => {
    if (onMessagesUpdate) {
      onMessagesUpdate(messages);
    }
  }, [messages, onMessagesUpdate]);

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize speech recognition
  React.useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);
      };
      
      recognitionRef.current.onerror = () => {
        setIsRecording(false);
        toast.error('Voice input failed. Please try again.');
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  // Auto-speak assistant messages when voice output is enabled
  React.useEffect(() => {
    if (voiceOutputEnabled && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'assistant' && !isSpeaking) {
        speakMessage(lastMsg.content);
      }
    }
  }, [messages, voiceOutputEnabled]);

  const startRecording = () => {
    if (!recognitionRef.current) {
      toast.error('Voice input is not supported in your browser.');
      return;
    }
    if (voiceInputEnabled && !isRecording) {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const speakMessage = (text: string) => {
    if (!voiceOutputEnabled || !('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Initialize with Socratic question
  React.useEffect(() => {
    if (open && question && initializing) {
      loadInitialQuestion();
    }
  }, [open, question, initializing]);

  // Reset when modal closes
  React.useEffect(() => {
    if (!open) {
      setMessages([]);
      setInput('');
      setInitializing(true);
      setIsLoading(false);
    }
  }, [open]);

  const loadInitialQuestion = async () => {
    if (!question) return;

    setIsLoading(true);
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
          messages: [],
        },
      });

      if (error) throw error;

      setMessages([{ role: 'assistant', content: data.content }]);
      setInitializing(false);
    } catch (error) {
      console.error('Failed to load initial question:', error);
      setMessages([
        {
          role: 'assistant',
          content: "I'm having trouble connecting right now. Please try again.",
        },
      ]);
      setInitializing(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !question || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

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
          messages: [...messages, { role: 'user', content: userMessage }],
        },
      });

      if (error) throw error;

      setMessages((prev) => [...prev, { role: 'assistant', content: data.content }]);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm having trouble responding right now. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) return null;

  return (
    <Card className="relative overflow-hidden rounded-xl border border-cyan-500/30 bg-gradient-to-br from-slate-900/95 via-purple-900/30 to-slate-900/95 shadow-[0_0_30px_rgba(6,182,212,0.2)] animate-in slide-in-from-top-2 duration-500">
      {/* Subtle background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-purple-500/5 pointer-events-none" />
      
      <CardHeader className="relative px-4 py-3 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 to-purple-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-foreground">Joshua - Your LSAT Coach</h3>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Voice Input Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVoiceInputEnabled(!voiceInputEnabled)}
              className={cn(
                "transition-colors duration-200",
                voiceInputEnabled && "bg-cyan-500/20 text-cyan-400"
              )}
              title="Voice Input"
            >
              <Mic className={cn("w-4 h-4", isRecording && "animate-pulse")} />
            </Button>
            
            {/* Voice Output Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVoiceOutputEnabled(!voiceOutputEnabled)}
              className={cn(
                "transition-colors duration-200",
                voiceOutputEnabled && "bg-purple-500/20 text-purple-400"
              )}
              title="Voice Output"
            >
              <Volume2 className={cn("w-4 h-4", isSpeaking && "animate-pulse")} />
            </Button>
            
            {/* Talk Mode Button */}
            {onOpenTalkMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenTalkMode}
                className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                title="Switch to Talk Mode"
              >
                <Waves className="w-4 h-4 mr-1" />
                Talk Mode
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative p-0">
        <ScrollArea ref={scrollRef} className="h-[250px]">
          <div className="space-y-3 p-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] ml-auto'
                      : 'bg-purple-500/10 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                  }`}
                >
                  <div className="text-xs font-semibold mb-1 opacity-70">
                    {msg.role === 'user' ? 'You' : 'Joshua'}
                  </div>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="relative p-3 border-t border-cyan-500/20 bg-slate-900/50 flex-col gap-2">
        {!voiceInputEnabled ? (
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a follow-up question..."
            rows={1}
            disabled={isLoading}
            className="resize-none border-cyan-500/30 focus-visible:ring-cyan-500/50 bg-slate-900/50 text-sm"
          />
        ) : (
          <Button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={isLoading}
            className={cn(
              "w-full bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30",
              isRecording && "bg-red-500/20 border-red-500/50 animate-pulse"
            )}
            size="lg"
          >
            <Mic className="w-5 h-5 mr-2" />
            {isRecording ? 'Listening...' : 'Press & Hold to Speak'}
          </Button>
        )}
        
        {voiceInputEnabled && input && (
          <div className="text-xs text-cyan-400 bg-cyan-500/10 rounded p-2 border border-cyan-500/30">
            <strong>Transcribed:</strong> {input}
          </div>
        )}
        
        <div className="flex gap-2 w-full">
          <Button 
            onClick={handleSend} 
            disabled={!input.trim() || isLoading} 
            className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all duration-300"
            size="sm"
          >
            Send
          </Button>
          <Button 
            onClick={onTryAgain}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all duration-300"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Try Again
          </Button>
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="flex-1 border-cyan-500/30 hover:bg-cyan-500/10"
            size="sm"
          >
            Continue
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
