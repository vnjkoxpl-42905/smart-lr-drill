import { Flame, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StreakWidgetProps {
  currentStreak: number;
  longestStreak: number;
  questionsToday: number;
  dailyGoal: number;
  atRisk?: boolean;
  compact?: boolean;
}

export function StreakWidget({
  currentStreak,
  longestStreak,
  questionsToday,
  dailyGoal,
  atRisk = false,
  compact = false
}: StreakWidgetProps) {
  const goalReached = questionsToday >= dailyGoal;
  const progress = Math.min((questionsToday / dailyGoal) * 100, 100);
  
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Flame className={cn(
          "w-5 h-5",
          currentStreak >= 7 ? "text-orange-500" :
          currentStreak >= 3 ? "text-amber-500" :
          "text-muted-foreground"
        )} />
        <div>
          <div className="text-sm font-semibold">{currentStreak} day{currentStreak !== 1 ? 's' : ''}</div>
          {atRisk && <div className="text-xs text-destructive">At risk!</div>}
        </div>
      </div>
    );
  }
  
  return (
    <Card className={cn(
      "p-4",
      atRisk && "border-destructive/50 bg-destructive/5"
    )}>
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              currentStreak >= 7 ? "bg-gradient-to-br from-orange-500/20 to-red-500/20" :
              currentStreak >= 3 ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20" :
              "bg-muted"
            )}>
              <Flame className={cn(
                "w-6 h-6",
                currentStreak >= 7 ? "text-orange-500" :
                currentStreak >= 3 ? "text-amber-500" :
                "text-muted-foreground"
              )} />
            </div>
            <div>
              <div className="text-2xl font-bold">{currentStreak}</div>
              <div className="text-sm text-muted-foreground">Day streak</div>
            </div>
          </div>
          
          {longestStreak > 0 && (
            <Badge variant="secondary" className="text-xs">
              Best: {longestStreak}
            </Badge>
          )}
        </div>
        
        {atRisk && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span>Practice today to keep your streak!</span>
          </div>
        )}
        
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Today's progress</span>
            <span className="font-medium">
              {questionsToday} / {dailyGoal} questions
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-500 rounded-full",
                goalReached ? "bg-gradient-to-r from-green-500 to-emerald-500" : "bg-gradient-to-r from-primary to-primary/60"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          {goalReached && (
            <div className="text-xs text-green-600 dark:text-green-400 font-medium">
              ✓ Daily goal reached!
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
