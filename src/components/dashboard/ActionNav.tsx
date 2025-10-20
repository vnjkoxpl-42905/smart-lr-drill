import { Target, BookOpen, Sparkles, Grid3x3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionNavProps {
  onSelectAction: (action: 'adaptive' | 'full-section' | 'natural-drill' | 'type-drill') => void;
  selectedAction?: string | null;
}

const actions = [
  {
    id: 'adaptive' as const,
    icon: Target,
    label: 'Drill',
    description: 'Adaptive practice'
  },
  {
    id: 'full-section' as const,
    icon: BookOpen,
    label: 'Full Section',
    description: 'Timed practice'
  },
  {
    id: 'natural-drill' as const,
    icon: Sparkles,
    label: 'Smart Builder',
    description: 'Natural language'
  },
  {
    id: 'type-drill' as const,
    icon: Grid3x3,
    label: 'Build a Set',
    description: 'Custom drill'
  },
];

export function ActionNav({ onSelectAction, selectedAction }: ActionNavProps) {
  return (
    <nav className="space-y-1">
      <div className="px-3 mb-4">
        <p className="text-xs font-medium uppercase tracking-widest text-text-tertiary">
          Practice Modes
        </p>
      </div>
      
      {actions.map((action) => {
        const Icon = action.icon;
        const isActive = selectedAction === action.id;
        
        return (
          <button
            key={action.id}
            onClick={() => onSelectAction(action.id)}
            className={cn(
              "group relative w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-150",
              "hover:bg-secondary/50 hover:scale-[1.02]",
              isActive && "bg-secondary"
            )}
          >
            <div className={cn(
              "rounded-md bg-background p-2 transition-colors duration-150",
              isActive && "bg-primary/5"
            )}>
              <Icon className={cn(
                "w-4 h-4 transition-colors duration-150",
                isActive ? "text-primary" : "text-text-secondary group-hover:text-text-primary"
              )} />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium transition-colors duration-150",
                isActive ? "text-text-primary" : "text-text-primary group-hover:text-text-primary"
              )}>
                {action.label}
              </p>
              <p className={cn(
                "text-xs transition-colors duration-150",
                isActive ? "text-text-secondary" : "text-text-tertiary group-hover:text-text-secondary"
              )}>
                {action.description}
              </p>
            </div>
          </button>
        );
      })}
    </nav>
  );
}
