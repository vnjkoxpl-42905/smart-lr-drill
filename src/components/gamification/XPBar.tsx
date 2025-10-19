import { Progress } from "@/components/ui/progress";
import { Sparkles } from "lucide-react";
import { getLevelProgress } from "@/lib/gamification";

interface XPBarProps {
  level: number;
  totalXP: number;
  showDetails?: boolean;
  compact?: boolean;
}

export function XPBar({ level, totalXP, showDetails = true, compact = false }: XPBarProps) {
  const progress = getLevelProgress(totalXP, level);
  
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 min-w-[60px]">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Lv {level}</span>
        </div>
        <Progress value={progress.percentage} className="h-2 flex-1" />
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/40">
              <span className="text-sm font-bold">{level}</span>
            </div>
            <Sparkles className="w-3 h-3 text-primary absolute -top-1 -right-1" />
          </div>
          <div>
            <div className="text-sm font-semibold">Level {level}</div>
            {showDetails && (
              <div className="text-xs text-muted-foreground">
                {progress.current.toLocaleString()} / {progress.required.toLocaleString()} XP
              </div>
            )}
          </div>
        </div>
        {showDetails && (
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Total XP</div>
            <div className="text-sm font-semibold">{totalXP.toLocaleString()}</div>
          </div>
        )}
      </div>
      <Progress value={progress.percentage} className="h-2" />
    </div>
  );
}
