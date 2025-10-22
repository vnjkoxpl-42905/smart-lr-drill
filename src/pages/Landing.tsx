import * as React from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuestionBank } from '@/contexts/QuestionBankContext';
import { ModeSelector } from '@/components/drill/ModeSelector';
import { SectionSelector } from '@/components/drill/SectionSelector';
import { QuestionPicker } from '@/components/drill/QuestionPicker';
import { NaturalDrillCreator } from '@/components/drill/NaturalDrillCreator';
import { LoginIntro } from '@/components/LoginIntro';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DrillMode, FullSectionConfig, TypeDrillConfig } from '@/types/drill';

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { manifest, isLoading, error } = useQuestionBank();
  const [selectedMode, setSelectedMode] = React.useState<DrillMode | null>(null);
  const [showIntro, setShowIntro] = React.useState(false);
  const [introComplete, setIntroComplete] = React.useState(false);

  // Redirect to auth if not logged in
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Show intro only once per session
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
    
    // Extract first name and capitalize
    const firstName = displayName.split(/[\s._-]/)[0].replace(/[^a-zA-Z]/g, '');
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase() || 'there';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Preparing your practice session...</p>
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

  const handleStartAdaptive = () => {
    navigate('/drill', { state: { mode: 'adaptive' } });
  };

  const handleStartSection = (config: FullSectionConfig) => {
    navigate('/drill', { state: { mode: 'full-section', config } });
  };

  const handleStartTypeDrill = (config: TypeDrillConfig) => {
    navigate('/drill', { state: { mode: 'type-drill', config } });
  };

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
          "min-h-screen p-8 transition-all duration-500",
          introComplete ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
      <div className="text-center mb-12 animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <Button 
            variant="ghost" 
            className="gap-2 transition-all duration-200 hover:scale-105"
            onClick={() => navigate('/profile')}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <span>Profile</span>
          </Button>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate('/analytics')}
              className="transition-all duration-200 hover:scale-105 hover:-translate-y-0.5"
            >
              Analytics
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/waj')}
              className="transition-all duration-200 hover:scale-105 hover:-translate-y-0.5"
            >
              Wrong Answer Journal
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="transition-all duration-200 hover:scale-105 hover:-translate-y-0.5"
            >
              Dashboard
            </Button>
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-4">LR Smart Drill</h1>
        <p className="text-lg text-muted-foreground">
          Welcome back! Ready to practice?
        </p>
      </div>

      {!selectedMode && manifest && (
        <ModeSelector onSelectMode={setSelectedMode} />
      )}

      {selectedMode === 'adaptive' && (
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-2xl font-bold">Start drill</h2>
          <div className="flex gap-3 justify-center">
            <Button onClick={handleStartAdaptive} size="lg">
              Begin
            </Button>
            <Button variant="outline" onClick={() => setSelectedMode(null)}>
              Back
            </Button>
          </div>
        </div>
      )}

      {selectedMode === 'full-section' && manifest && (
        <SectionSelector
          manifest={manifest}
          onStartSection={handleStartSection}
          onCancel={() => setSelectedMode(null)}
        />
      )}

      {selectedMode === 'type-drill' && manifest && (
        <QuestionPicker
          manifest={manifest}
          onStartDrill={handleStartTypeDrill}
          onCancel={() => setSelectedMode(null)}
        />
      )}

      {selectedMode === 'natural-drill' && (
        <NaturalDrillCreator
          onStartDrill={handleStartTypeDrill}
          onCancel={() => setSelectedMode(null)}
        />
      )}
      </div>
    </>
  );
}
