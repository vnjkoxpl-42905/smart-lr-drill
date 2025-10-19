import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, LogOut, User, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProfileData {
  id: string;
  username: string;
  display_name?: string;
  email?: string;
  xp_total?: number;
  streak_current?: number;
  overall_answered?: number;
  overall_correct?: number;
  created_at?: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { settings, updateSettings } = useUserSettings();
  const [profile, setProfile] = React.useState<ProfileData | null>(null);
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
      const { data } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        setProfile(data);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  const initials = profile.username?.slice(0, 2).toUpperCase() || 'U';

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
            <CardTitle className="text-2xl">{profile.display_name || profile.username}</CardTitle>
            <CardDescription>@{profile.username}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Email</div>
                  <div className="font-medium">{profile.email}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-primary/10 text-center">
                  <div className="text-3xl font-bold text-primary">{profile.xp_total || 0}</div>
                  <div className="text-sm text-muted-foreground mt-1">Total XP</div>
                </div>
                <div className="p-4 rounded-lg bg-primary/10 text-center">
                  <div className="text-3xl font-bold text-primary">{profile.streak_current || 0}</div>
                  <div className="text-sm text-muted-foreground mt-1">Day Streak</div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-sm text-muted-foreground mb-2">Overall Performance</div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Questions Answered</span>
                  <span className="text-lg font-bold">{profile.overall_answered || 0}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-medium">Accuracy</span>
                  <span className="text-lg font-bold text-primary">
                    {profile.overall_answered && profile.overall_answered > 0 
                      ? Math.round((profile.overall_correct || 0) / profile.overall_answered * 100)
                      : 0}%
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Settings
                </div>
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
              </div>

              {profile.created_at && (
                <div className="text-center text-sm text-muted-foreground">
                  Member since {new Date(profile.created_at).toLocaleDateString('en-US', {
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
      </div>
    </div>
  );
}
