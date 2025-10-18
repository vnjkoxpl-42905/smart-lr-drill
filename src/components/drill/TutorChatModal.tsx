import * as React from "react";
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sparkles, RefreshCw } from 'lucide-react';
import type { LRQuestion } from '@/lib/questionLoader';

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
}

export function TutorChatModal({ open, question, userAnswer, onClose, onTryAgain }: TutorChatModalProps) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [initializing, setInitializing] = React.useState(true);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
        pt: question.pt,
        section: question.section,
        qnum: question.qnum,
        qtype: question.qtype,
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
        pt: question.pt,
        section: question.section,
        qnum: question.qnum,
        qtype: question.qtype,
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
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-semibold text-foreground">Joshua - Your LSAT Coach</h3>
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
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask a follow-up question..."
          rows={1}
          disabled={isLoading}
          className="resize-none border-cyan-500/30 focus-visible:ring-cyan-500/50 bg-slate-900/50 text-sm"
        />
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
