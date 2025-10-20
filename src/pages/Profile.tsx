import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, LogOut, User, MessageSquare, Award, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { XPBar } from '@/components/gamification/XPBar';
import { BadgeGallery } from '@/components/gamification/BadgeGallery';

interface StatsData {
  xp_total?: number;
  streak_current?: number;
  overall_answered?: number;
  overall_correct?: number;
  class_id?: string;
  level?: number;
  longest_streak?: number;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { settings, updateSettings } = useUserSettings();
  const [stats, setStats] = React.useState<StatsData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    loadProfile();
  }, [user, navigate]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      // First get class_id from students table
      const { data: student } = await supabase
        .from('students')
        .select('class_id')
        .eq('id', user.id)
        .maybeSingle();

      if (student?.class_id) {
        // Then get stats from profiles table using class_id
        const { data: profileStats } = await supabase
          .from('profiles')
          .select('xp_total, streak_current, overall_answered, overall_correct, class_id, level, longest_streak')
          .eq('class_id', student.class_id)
          .maybeSingle();

        if (profileStats) {
          setStats(profileStats);
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  const email = user?.email ?? 'user@example.com';
  const displayName = email.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase() || 'U';
  const memberSince = user?.created_at || stats?.class_id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="text-3xl">{initials}</AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-2xl">{displayName}</CardTitle>
            <CardDescription>{email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Email</div>
                  <div className="font-medium">{email}</div>
                </div>
              </div>

              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="pt-6">
                  <XPBar 
                    level={stats?.level || 1} 
                    totalXP={stats?.xp_total || 0} 
                    showDetails={true}
                  />
                </CardContent>
              </Card>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <div className="text-2xl font-bold">{stats?.streak_current || 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">Current Streak</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <div className="text-2xl font-bold">{stats?.longest_streak || 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">Best Streak</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <Award className="w-6 h-6 mx-auto mb-1 text-primary" />
                  <div className="text-xs text-muted-foreground">Badges</div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-sm text-muted-foreground mb-2">Overall Performance</div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Questions Answered</span>
                  <span className="text-lg font-bold">{stats?.overall_answered || 0}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-medium">Accuracy</span>
                  <span className="text-lg font-bold text-primary">
                    {stats?.overall_answered && stats.overall_answered > 0 
                      ? Math.round((stats.overall_correct || 0) / stats.overall_answered * 100)
                      : 0}%
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Practice Settings
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div className="font-medium">Default Timing Mode</div>
                    </div>
                    <Select
                      value={settings.defaultTimingMode}
                      onValueChange={(value) => updateSettings({ defaultTimingMode: value as '35' | '52.5' | '70' | 'unlimited' })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="35">35:00 - Standard</SelectItem>
                        <SelectItem value="52.5">52:30 - 1.5× Speed</SelectItem>
                        <SelectItem value="70">70:00 - 2× Speed</SelectItem>
                        <SelectItem value="unlimited">Stopwatch - No Timer</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Used when selecting "Standard" timing in Full Section mode
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  AI Features
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">AI Tutor "Joshua"</div>
                      <div className="text-sm text-muted-foreground">Enable real-time tutoring assistance</div>
                    </div>
                    <Switch 
                      checked={settings.tutorEnabled} 
                      onCheckedChange={(checked) => updateSettings({ tutorEnabled: checked })}
                    />
                  </div>

                  <div className="pt-3 border-t border-border/50">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <div className="font-medium">Voice Coach</div>
                        <div className="text-sm text-muted-foreground">Speak your reasoning, get targeted feedback</div>
                      </div>
                      <Switch 
                        checked={settings.voiceCoachEnabled} 
                        onCheckedChange={(checked) => updateSettings({ voiceCoachEnabled: checked })}
                      />
                    </div>

                    {settings.voiceCoachEnabled && (
                      <div className="ml-4 space-y-3 mt-3 pt-3 border-t border-border/30">
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-muted-foreground">Show answer contrast</div>
                          <Switch 
                            checked={settings.showContrast} 
                            onCheckedChange={(checked) => updateSettings({ showContrast: checked })}
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-muted-foreground">Teach-back on correct</div>
                          <Switch 
                            checked={settings.teachBackOnCorrect} 
                            onCheckedChange={(checked) => updateSettings({ teachBackOnCorrect: checked })}
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-muted-foreground">Section debrief</div>
                          <Switch 
                            checked={settings.sectionDebriefEnabled} 
                            onCheckedChange={(checked) => updateSettings({ sectionDebriefEnabled: checked })}
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-muted-foreground">Store full transcripts</div>
                          <Switch 
                            checked={settings.storeFullTranscript} 
                            onCheckedChange={(checked) => updateSettings({ storeFullTranscript: checked })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {memberSince && (
                <div className="text-center text-sm text-muted-foreground">
                  Member since {new Date(memberSince).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              )}
            </div>

            <Button
              variant="destructive"
              onClick={handleSignOut}
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        <div className="mt-8">
          <BadgeGallery />
        </div>
      </div>
    </div>
  );
}
