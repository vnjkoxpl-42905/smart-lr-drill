import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Trophy, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CelebrationModalProps {
  open: boolean;
  onClose: () => void;
  type: "levelup" | "achievement" | "xp" | "streak";
  data?: {
    level?: number;
    achievement?: {
      name: string;
      description: string;
      icon: string;
      xp_reward: number;
    };
    xpGained?: number;
    streakDays?: number;
  };
}

export function CelebrationModal({ open, onClose, type, data }: CelebrationModalProps) {
  const renderContent = () => {
    switch (type) {
      case "levelup":
        return (
          <div className="text-center space-y-6 py-8">
            <div className="relative mx-auto w-32 h-32">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full animate-pulse" />
              <div className="absolute inset-4 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center">
                <Trophy className="w-16 h-16 text-primary-foreground" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-2">Level Up!</h2>
              <p className="text-5xl font-bold text-primary mb-4">Level {data?.level}</p>
              <p className="text-muted-foreground">
                You're getting stronger! Keep up the great work.
              </p>
            </div>
          </div>
        );
      
      case "achievement":
        return (
          <div className="text-center space-y-6 py-8">
            <div className="text-7xl mb-4">{data?.achievement?.icon}</div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Badge Earned!</h2>
              <p className="text-3xl font-bold text-primary mb-2">
                {data?.achievement?.name}
              </p>
              <p className="text-muted-foreground mb-4">
                {data?.achievement?.description}
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-semibold">+{data?.achievement?.xp_reward} XP</span>
              </div>
            </div>
          </div>
        );
      
      case "streak":
        return (
          <div className="text-center space-y-6 py-8">
            <div className="relative mx-auto w-32 h-32">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/30 to-red-500/30 rounded-full animate-pulse" />
              <div className="absolute inset-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <span className="text-5xl">🔥</span>
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-2">On Fire!</h2>
              <p className="text-4xl font-bold text-orange-500 mb-4">
                {data?.streakDays} Day Streak
              </p>
              <p className="text-muted-foreground">
                Your dedication is inspiring! Keep the momentum going.
              </p>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        {renderContent()}
        <Button onClick={onClose} size="lg" className="w-full">
          Continue
        </Button>
      </DialogContent>
    </Dialog>
  );
}
