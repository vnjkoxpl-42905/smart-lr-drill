import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
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
}

export function TutorChatModal({ open, question, userAnswer, onClose }: TutorChatModalProps) {
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

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Chat with Joshua - Your LSAT Coach</DialogTitle>
        </DialogHeader>

        <ScrollArea ref={scrollRef} className="flex-1 pr-4">
          <div className="space-y-4 py-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground ml-auto'
                      : 'bg-muted'
                  }`}
                >
                  <div className="text-sm font-semibold mb-1">
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
                <div className="bg-muted rounded-lg p-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="space-y-3 pt-4 border-t">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a follow-up question..."
            rows={2}
            disabled={isLoading}
          />
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
              Send
            </Button>
            <Button variant="outline" onClick={onClose}>
              Done
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
