import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { TypeDrillConfig } from '@/types/drill';

interface NaturalDrillCreatorProps {
  onStartDrill: (config: TypeDrillConfig) => void;
  onCancel: () => void;
}

export function NaturalDrillCreator({ onStartDrill, onCancel }: NaturalDrillCreatorProps) {
  const [request, setRequest] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!request.trim()) {
      toast({
        title: "Please enter a request",
        description: "Describe what you want to practice",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('parse-drill-request', {
        body: { request: request.trim() }
      });

      if (error) {
        console.error('Function error:', error);
        
        if (error.message?.includes('Rate limit')) {
          toast({
            title: "Rate limit reached",
            description: "Please wait a moment and try again.",
            variant: "destructive",
          });
          return;
        }
        
        if (error.message?.includes('credits')) {
          toast({
            title: "AI credits depleted",
            description: "Please add credits to continue using this feature.",
            variant: "destructive",
          });
          return;
        }
        
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from parsing');
      }

      // Show what was parsed
      toast({
        title: "✨ Drill created!",
        description: data.explanation,
        duration: 4000,
      });

      // Start the drill with parsed config
      onStartDrill({
        qtypes: data.qtypes,
        difficulties: data.difficulties,
        pts: data.pts,
        count: data.set_size,
      });

    } catch (err) {
      console.error('Failed to parse drill request:', err);
      toast({
        title: "Failed to create drill",
        description: "Please try rephrasing your request or use the manual builder.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Natural Language Drill Creator</h1>
          <p className="text-muted-foreground mt-2">
            Describe what you want to practice and AI will create your drill
          </p>
        </div>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>

      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">What do you want to practice?</label>
          <Textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder="Examples:
• I want to practice flaw questions from PT 110-120
• Give me 20 hard strengthen and weaken questions
• Easy assumption questions for beginners
• Mix of inference and paradox from recent tests"
            className="min-h-[150px] resize-none"
            disabled={isProcessing}
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleSubmit}
            disabled={isProcessing || !request.trim()}
            className="flex-1"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating drill...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Create Drill
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-2 pt-4 border-t">
          <p className="font-medium">Tips for best results:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Mention specific question types (Flaw, Strengthen, Assumption, etc.)</li>
            <li>Specify difficulty level (easy, medium, hard) or numbers (1-5)</li>
            <li>Include PrepTest ranges if you want specific tests (e.g., PT 110-120)</li>
            <li>State how many questions you want (default is 10)</li>
          </ul>
        </div>
      </Card>

      <Card className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Powered by AI</p>
            <p className="text-xs text-muted-foreground">
              This feature uses natural language processing to understand your practice needs and automatically configure your drill settings.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
