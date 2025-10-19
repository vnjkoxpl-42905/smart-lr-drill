import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Clock, Filter, Sparkles } from 'lucide-react';
import type { DrillMode } from '@/types/drill';
import { templateService, type DrillTemplate } from '@/lib/templateService';
import { TemplateCard } from './TemplateCard';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ModeSelectorProps {
  onSelectMode: (mode: DrillMode) => void;
}

export function ModeSelector({ onSelectMode }: ModeSelectorProps) {
  const [templates, setTemplates] = useState<DrillTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const loadTemplates = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch class_id from students table
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('class_id')
          .eq('id', user.id)
          .maybeSingle();

        if (studentError) throw studentError;
        
        if (student?.class_id) {
          const data = await templateService.getTemplates(student.class_id);
          setTemplates(data);
        }
      } catch (err) {
        console.error('Failed to load templates:', err);
        toast({
          title: "Failed to load templates",
          description: "Could not load your saved drills.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadTemplates();
  }, [user, toast]);

  const handleStartTemplate = (template: DrillTemplate) => {
    // Will pass template data to the drill mode
    onSelectMode('type-drill');
    // TODO: Need to pass template config to parent
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await templateService.deleteTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast({ title: "Template deleted" });
    } catch (err) {
      toast({ 
        title: "Failed to delete", 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Saved Templates Section */}
      {templates.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Saved Drills</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onStart={handleStartTemplate}
                onDelete={handleDeleteTemplate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Mode Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="p-6 flex flex-col min-h-[280px]">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-8 h-8 text-primary" />
            <h3 className="text-xl font-semibold">Drill</h3>
          </div>
          <p className="text-muted-foreground">
            Let the LSAT coach choose a question for you
          </p>
        </div>
        <Button onClick={() => onSelectMode('adaptive')} size="lg" className="w-full mt-6">
          Start drill
        </Button>
      </Card>

      <Card className="p-6 flex flex-col min-h-[280px]">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-8 h-8 text-primary" />
            <h3 className="text-xl font-semibold">Full section</h3>
          </div>
          <p className="text-muted-foreground">
            Section mode with standard or custom time.
          </p>
        </div>
        <Button onClick={() => onSelectMode('full-section')} size="lg" className="w-full mt-6">
          Start section
        </Button>
      </Card>

      <Card className="p-6 flex flex-col min-h-[280px] bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-purple-400" />
            <h3 className="text-xl font-semibold">AI Drill Creator</h3>
          </div>
          <p className="text-muted-foreground">
            Describe what you want to practice in plain English
          </p>
        </div>
        <Button onClick={() => onSelectMode('natural-drill')} size="lg" className="w-full mt-6 bg-purple-600 hover:bg-purple-700">
          Create with AI
        </Button>
      </Card>

      <Card className="p-6 flex flex-col min-h-[280px]">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-8 h-8 text-primary" />
            <h3 className="text-xl font-semibold">Build a set</h3>
          </div>
          <p className="text-muted-foreground">
            Build a set by type, difficulty, or PT/section.
          </p>
        </div>
        <Button onClick={() => onSelectMode('type-drill')} size="lg" className="w-full mt-6">
          Build drill
        </Button>
      </Card>
      </div>
    </div>
  );
}
