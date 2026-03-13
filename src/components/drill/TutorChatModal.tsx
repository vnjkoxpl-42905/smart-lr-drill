import * as React from "react";
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sparkles } from 'lucide-react';
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
}

export function TutorChatModal({ 
  open, 
  question, 
  userAnswer, 
  onClose
}: TutorChatModalProps) {
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

  const loadInitialQuestion = async () => {
    if (!question) return;

    setIsLoading(true);
    console.debug('TutorChatModal: Loading initial Socratic question', { qid: question.qid });
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
    } catch (e: any) {
      console.error('Failed to load initial question:', e);
      const msg = await extractFunctionError(e);
      setMessages([
        {
          role: 'assistant',
          content: msg,
        },
      ]);
      setInitializing(false);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !question || isLoading) return;

    const userMessage = input.trim();
    console.debug('TutorChatModal: Sending user message', { qid: question.qid });
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
    } catch (e: any) {
      console.error('Failed to send message:', e);
      const msg = await extractFunctionError(e);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: msg,
        },
      ]);
      toast.error(msg);
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

  // Early return guards
  if (!open) return null;
  if (!question) {
    console.warn('TutorChatModal: opened without a valid question');
    return null;
  }

  return (
    <Card className="relative overflow-hidden rounded-lg border bg-card shadow-sm animate-in slide-in-from-top-2 duration-300">
      <CardHeader className="relative px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Joshua</h3>
        </div>
      </CardHeader>

      <CardContent className="relative p-0">
        <ScrollArea ref={scrollRef} className="h-[220px]">
          <div className="space-y-2.5 p-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-md p-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary/10 border border-primary/20'
                      : 'bg-muted border border-border'
                  }`}
                >
                  <div className="text-xs font-medium mb-1 text-muted-foreground">
                    {msg.role === 'user' ? 'You' : 'Joshua'}
                  </div>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted border border-border rounded-md p-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="relative p-3 border-t flex-col gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask a follow-up question..."
          rows={1}
          disabled={isLoading}
          className="resize-none text-sm"
        />
        
        <div className="flex gap-2 w-full">
          <Button 
            onClick={handleSend} 
            disabled={!input.trim() || isLoading} 
            className="flex-1"
            size="sm"
          >
            Send
          </Button>
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="flex-1"
            size="sm"
          >
            Return to question
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
