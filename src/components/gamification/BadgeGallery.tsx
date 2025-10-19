import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Achievement {
  id: string;
  badge_id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xp_reward: number;
  tier: string;
  earned?: boolean;
  earned_at?: string;
}

export function BadgeGallery() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [classId, setClassId] = useState<string | null>(null);
  
  useEffect(() => {
    if (user) {
      loadClassId();
    }
  }, [user]);
  
  useEffect(() => {
    if (classId) {
      loadAchievements();
    }
  }, [classId]);
  
  const loadClassId = async () => {
    if (!user) return;
    
    try {
      const { data: student } = await supabase
        .from('students')
        .select('class_id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (student?.class_id) {
        setClassId(student.class_id);
      }
    } catch (error) {
      console.error('Failed to load class_id:', error);
    }
  };
  
  const loadAchievements = async () => {
    if (!classId) return;
    
    try {
      // Get all achievements
      const { data: allAchievements } = await supabase
        .from('achievements')
        .select('*')
        .order('category', { ascending: true });
      
      // Get user's earned achievements
      const { data: userAchievements } = await supabase
        .from('user_achievements')
        .select('achievement_id, earned_at')
        .eq('class_id', classId);
      
      const earnedIds = new Set(userAchievements?.map(ua => ua.achievement_id) || []);
      const earnedMap = new Map(userAchievements?.map(ua => [ua.achievement_id, ua.earned_at]) || []);
      
      const combined = allAchievements?.map(ach => ({
        ...ach,
        earned: earnedIds.has(ach.id),
        earned_at: earnedMap.get(ach.id)
      })) || [];
      
      setAchievements(combined);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const filteredAchievements = filter === "all" 
    ? achievements 
    : achievements.filter(a => a.category === filter);
  
  const earnedCount = achievements.filter(a => a.earned).length;
  const totalCount = achievements.length;
  
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'from-amber-700/20 to-amber-600/20 border-amber-600/40';
      case 'silver': return 'from-slate-400/20 to-slate-300/20 border-slate-400/40';
      case 'gold': return 'from-yellow-500/20 to-yellow-400/20 border-yellow-500/40';
      case 'platinum': return 'from-purple-500/20 to-purple-400/20 border-purple-500/40';
      default: return 'from-muted to-muted border-border';
    }
  };
  
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Badge Collection</h2>
          <p className="text-muted-foreground">
            {earnedCount} of {totalCount} badges earned
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {Math.round((earnedCount / totalCount) * 100)}%
        </Badge>
      </div>
      
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="milestone">Milestone</TabsTrigger>
          <TabsTrigger value="streak">Streak</TabsTrigger>
          <TabsTrigger value="accuracy">Accuracy</TabsTrigger>
          <TabsTrigger value="speed">Speed</TabsTrigger>
          <TabsTrigger value="mastery">Mastery</TabsTrigger>
        </TabsList>
        
        <TabsContent value={filter} className="mt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredAchievements.map((achievement) => (
              <Card
                key={achievement.id}
                className={cn(
                  "p-4 relative overflow-hidden transition-all",
                  achievement.earned 
                    ? `bg-gradient-to-br ${getTierColor(achievement.tier)} hover:scale-105`
                    : "opacity-60 hover:opacity-80"
                )}
              >
                {!achievement.earned && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                    <Lock className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                
                <div className="text-center space-y-2">
                  <div className="text-4xl">{achievement.icon}</div>
                  <div>
                    <div className="font-semibold">{achievement.name}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {achievement.description}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <Badge variant="outline" className="capitalize">
                      {achievement.tier}
                    </Badge>
                    <span className="text-muted-foreground">+{achievement.xp_reward} XP</span>
                  </div>
                  {achievement.earned && achievement.earned_at && (
                    <div className="text-xs text-muted-foreground">
                      Earned {new Date(achievement.earned_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
