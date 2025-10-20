import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuestionBank } from '@/contexts/QuestionBankContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { QuickStart } from '@/components/dashboard/QuickStart';
import { InsightCard } from '@/components/dashboard/InsightCard';
import { ActionNav } from '@/components/dashboard/ActionNav';
import { SectionSelector } from '@/components/drill/SectionSelector';
import { TypeDrillPicker } from '@/components/drill/TypeDrillPicker';
import { NaturalDrillCreator } from '@/components/drill/NaturalDrillCreator';
import { LoginIntro } from '@/components/LoginIntro';
import { BookOpen, Target, Clock, Flag, XCircle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DrillMode, FullSectionConfig, TypeDrillConfig } from '@/types/drill';

export default function Home() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { manifest, isLoading, error } = useQuestionBank();
  const [selectedAction, setSelectedAction] = React.useState<DrillMode | null>(null);
  const [showIntro, setShowIntro] = React.useState(false);
  const [introComplete, setIntroComplete] = React.useState(false);
  const [stats, setStats] = React.useState({
    totalAttempted: 0,
    avgAccuracy: 0,
    recentStreak: 0,
  });

  // Redirect to auth if not logged in
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Show intro once per session
  React.useEffect(() => {
    if (!authLoading && user) {
      const introKey = `login_intro_shown_${user.id}`;
      const hasShownIntro = sessionStorage.getItem(introKey);
      
      if (!hasShownIntro) {
        setShowIntro(true);
        sessionStorage.setItem(introKey, Date.now().toString());
      } else {
        setIntroComplete(true);
      }
    }
  }, [user, authLoading]);

  // Load user stats
  React.useEffect(() => {
    if (!user) return;

    const loadStats = async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: attempts } = await supabase
        .from('attempts')
        .select('correct, timestamp_iso')
        .eq('class_id', user.id)
        .gte('timestamp_iso', thirtyDaysAgo.toISOString());

      if (attempts && attempts.length > 0) {
        const correct = attempts.filter((a) => a.correct).length;
        const accuracy = Math.round((correct / attempts.length) * 100);

        setStats({
          totalAttempted: attempts.length,
          avgAccuracy: accuracy,
          recentStreak: 0, // TODO: compute streak
        });
      }
    };

    loadStats();
  }, [user]);

  const handleIntroComplete = () => {
    setShowIntro(false);
    setIntroComplete(true);
  };

  const getFirstName = () => {
    if (!user) return 'there';
    const displayName = user.user_metadata?.display_name || 
                       user.user_metadata?.username || 
                       user.email?.split('@')[0] || 
                       'there';
    const firstName = displayName.split(/[\s._-]/)[0].replace(/[^a-zA-Z]/g, '');
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase() || 'there';
  };

  const handleStartAdaptive = () => {
    navigate('/drill', { state: { mode: 'adaptive' } });
  };

  const handleStartSection = (config: FullSectionConfig) => {
    navigate('/drill', { state: { mode: 'full-section', config } });
  };

  const handleStartTypeDrill = (config: TypeDrillConfig) => {
    navigate('/drill', { state: { mode: 'type-drill', config } });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-text-secondary">Preparing your workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-destructive">{error}</p>
      </div>
    );
  }

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <>
      {showIntro && (
        <LoginIntro 
          firstName={getFirstName()} 
          onComplete={handleIntroComplete} 
        />
      )}
      
      <div 
        className={cn(
          "min-h-screen flex transition-opacity duration-300",
          !introComplete && "opacity-0"
        )}
      >
        {/* Sidebar */}
        <aside className="w-64 border-r border-border bg-card flex flex-col">
          <div className="p-6 border-b border-border">
            <h1 className="text-xl font-semibold text-text-primary">LR Smart Drill</h1>
            <p className="text-xs text-text-tertiary mt-1">Command Center</p>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            <ActionNav 
              onSelectAction={setSelectedAction} 
              selectedAction={selectedAction} 
            />
          </div>

        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          {/* Header */}
          <header className="border-b border-border bg-surface-elevated/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="px-8 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-text-primary">
                  Welcome back, {getFirstName()}
                </h2>
                <p className="text-xs text-text-tertiary mt-0.5">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/analytics')}
                >
                  View Analytics
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="gap-2"
                  onClick={() => navigate('/profile')}
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                  </Avatar>
                  Profile
                </Button>
              </div>
            </div>
          </header>

          <div className="p-8 space-y-8 max-w-7xl mx-auto animate-fade-in">
            {!selectedAction && (
              <>
                {/* Hero Quick Start */}
                <QuickStart onStart={handleStartAdaptive} />

                {/* Insights Grid */}
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-widest text-text-tertiary mb-4">
                    At a Glance
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InsightCard
                      icon={BookOpen}
                      label="Questions Practiced"
                      value={stats.totalAttempted}
                      sublabel="Last 30 days"
                    />
                    <InsightCard
                      icon={Target}
                      label="Accuracy"
                      value={stats.totalAttempted > 0 ? `${stats.avgAccuracy}%` : '0%'}
                      sublabel="Average performance"
                    />
                    <InsightCard
                      icon={TrendingUp}
                      label="Opportunities"
                      value="—"
                      sublabel="Top improvement areas"
                      onClick={() => navigate('/analytics')}
                    />
                  </div>
                </div>

                {/* Quick Access */}
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-widest text-text-tertiary mb-4">
                    Quick Access
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => navigate('/waj')}
                      className="group flex items-start gap-4 p-6 rounded-lg bg-card border border-border text-left transition-all duration-200 hover:shadow-md hover:shadow-glow-sm hover:border-accent-bronze/30 hover:-translate-y-0.5"
                    >
                      <div className="rounded-lg bg-secondary/50 p-3 transition-all duration-200 group-hover:bg-accent-bronze/10 group-hover:shadow-glow-sm">
                        <XCircle className="w-5 h-5 text-primary transition-colors duration-200 group-hover:text-accent-bronze" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary mb-1">Wrong Answer Journal</p>
                        <p className="text-xs text-text-secondary">Review and learn from mistakes</p>
                      </div>
                    </button>

                    <button
                      onClick={() => navigate('/flagged')}
                      className="group flex items-start gap-4 p-6 rounded-lg bg-card border border-border text-left transition-all duration-200 hover:shadow-md hover:shadow-glow-sm hover:border-accent-bronze/30 hover:-translate-y-0.5"
                    >
                      <div className="rounded-lg bg-secondary/50 p-3 transition-all duration-200 group-hover:bg-accent-bronze/10 group-hover:shadow-glow-sm">
                        <Flag className="w-5 h-5 text-primary transition-colors duration-200 group-hover:text-accent-bronze" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary mb-1">Flagged Questions</p>
                        <p className="text-xs text-text-secondary">Questions marked for review</p>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Action-specific content */}
            {selectedAction === 'adaptive' && (
              <div className="max-w-2xl mx-auto text-center space-y-6 animate-slide-up">
                <h2 className="text-2xl font-semibold">Start Adaptive Drill</h2>
                <div className="flex gap-3 justify-center">
                  <Button onClick={handleStartAdaptive} size="lg">
                    Begin Practice
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedAction(null)}>
                    Back
                  </Button>
                </div>
              </div>
            )}

            {selectedAction === 'full-section' && manifest && (
              <div className="animate-slide-up">
                <SectionSelector
                  manifest={manifest}
                  onStartSection={handleStartSection}
                  onCancel={() => setSelectedAction(null)}
                />
              </div>
            )}

            {selectedAction === 'type-drill' && manifest && (
              <div className="animate-slide-up">
                <TypeDrillPicker
                  manifest={manifest}
                  onStartDrill={handleStartTypeDrill}
                  onCancel={() => setSelectedAction(null)}
                />
              </div>
            )}

            {selectedAction === 'natural-drill' && (
              <div className="animate-slide-up">
                <NaturalDrillCreator
                  onStartDrill={handleStartTypeDrill}
                  onCancel={() => setSelectedAction(null)}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
