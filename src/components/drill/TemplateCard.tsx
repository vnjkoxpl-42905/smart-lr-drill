import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Trash2 } from 'lucide-react';
import type { DrillTemplate } from '@/lib/templateService';

interface TemplateCardProps {
  template: DrillTemplate;
  onStart: (template: DrillTemplate) => void;
  onDelete: (id: string) => void;
}

export function TemplateCard({ template, onStart, onDelete }: TemplateCardProps) {
  return (
    <Card className="p-4 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold">{template.template_name}</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(template.id)}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex flex-wrap gap-1">
          {template.qtypes.slice(0, 3).map(qt => (
            <Badge key={qt} variant="secondary" className="text-xs">
              {qt}
            </Badge>
          ))}
          {template.qtypes.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{template.qtypes.length - 3} more
            </Badge>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Levels {Math.min(...template.difficulties)}-{Math.max(...template.difficulties)} • 
          {template.set_size} questions
        </p>
      </div>

      <Button
        onClick={() => onStart(template)}
        size="sm"
        className="w-full"
      >
        <Play className="w-3 h-3 mr-2" />
        Start Drill
      </Button>
    </Card>
  );
}
