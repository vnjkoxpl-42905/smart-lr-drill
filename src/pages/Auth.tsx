import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const navigate = useNavigate();
  const { user, signUp, signIn, resetPassword, updatePassword } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [showSignInPassword, setShowSignInPassword] = React.useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = React.useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = React.useState(false);
  const [resetEmail, setResetEmail] = React.useState('');
  const [isRecovery, setIsRecovery] = React.useState(false);
  const [recoveryEmail, setRecoveryEmail] = React.useState('');
  const [isInvalidToken, setIsInvalidToken] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState('');
  const [hasRecoverySession, setHasRecoverySession] = React.useState(false);

  // Redirect if already logged in (but never during recovery)
  React.useEffect(() => {
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
    const type = url.searchParams.get('type') || hashParams.get('type');
    const inRecoveryURL = type === 'recovery';
    if (user && !isRecovery && !inRecoveryURL) {
      navigate('/');
    }
  }, [user, navigate, isRecovery]);

  // Detect recovery mode from URL or auth event
  React.useEffect(() => {
    const checkRecoveryMode = async () => {
      try {
        const url = new URL(window.location.href);
        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
        const type = url.searchParams.get('type') || hashParams.get('type');
        
        if (type === 'recovery') {
          // Enter recovery mode immediately to prevent auto-redirect
          setIsRecovery(true);
          
          // First, try to get existing session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (session?.user?.email) {
            setRecoveryEmail(session.user.email);
            setHasRecoverySession(true);
          } else {
            // If no session, try to establish one from URL tokens
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            
            if (accessToken && refreshToken) {
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              
              if (error) {
                console.error('Failed to set recovery session:', error);
                setIsInvalidToken(true);
              } else if (data.session) {
                setRecoveryEmail(data.session.user.email || '');
                setHasRecoverySession(true);
              } else {
                setIsInvalidToken(true);
              }
            } else {
              // No tokens available, mark as invalid
              setIsInvalidToken(true);
            }
          }
        }
      } catch (err) {
        console.error('Recovery check error:', err);
        setIsInvalidToken(true);
      }
    };

    checkRecoveryMode();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
        if (session?.user?.email) {
          setRecoveryEmail(session.user.email);
          setHasRecoverySession(true);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('signup-email') as string;
    const password = formData.get('signup-password') as string;
    const username = formData.get('username') as string;
    const displayName = formData.get('display-name') as string;

    const { error } = await signUp(email, password, username, displayName);

    if (error) {
      toast({
        title: 'Sign up failed',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
    } else {
      toast({
        title: 'Welcome!',
        description: 'Your account has been created successfully.',
      });
      // Will auto-redirect via useEffect when user state updates
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('signin-email') as string;
    const password = formData.get('signin-password') as string;

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: 'Sign in failed',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
    } else {
      toast({
        title: 'Welcome back!',
        description: 'You have signed in successfully.',
      });
      // Will auto-redirect via useEffect when user state updates
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling to parent form
    setLoading(true);

    const { error } = await resetPassword(resetEmail);

    if (!error) {
      setForgotPasswordOpen(false);
      setResetEmail('');
    }
    setLoading(false);
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError('');
    setLoading(true);

    // Validation
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Update password
    const { error } = await updatePassword(newPassword);
    
    if (error) {
      // Handle specific error cases
      const errorMsg = error.message?.toLowerCase() || '';
      if (
        errorMsg.includes('auth session missing') ||
        errorMsg.includes('not authenticated') ||
        errorMsg.includes('session not found') ||
        errorMsg.includes('expired') ||
        errorMsg.includes('invalid')
      ) {
        setIsInvalidToken(true);
        toast({ 
          title: 'Session expired', 
          description: 'Please request a new password reset link.', 
          variant: 'destructive' 
        });
      } else {
        toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
      }
      setLoading(false);
      return;
    }

    // Password updated successfully - user is now authenticated
    toast({ 
      title: 'Password updated successfully', 
      description: 'Redirecting to dashboard...' 
    });
    
    // Clean URL and redirect to dashboard
    try {
      window.history.replaceState(null, '', '/');
    } catch {}
    
    setTimeout(() => {
      navigate('/');
    }, 500);
  };

  const handleResendResetLink = async () => {
    if (!recoveryEmail && !resetEmail) {
      toast({ 
        title: 'Email required', 
        description: 'Please enter your email address.', 
        variant: 'destructive' 
      });
      return;
    }
    
    setLoading(true);
    const email = recoveryEmail || resetEmail;
    const { error } = await resetPassword(email);
    
    if (!error) {
      setIsInvalidToken(false);
      setIsRecovery(false);
      toast({ 
        title: 'Reset link sent', 
        description: 'Check your email for the new password reset link.' 
      });
    }
    setLoading(false);
  };

  const handleBackToLogin = () => {
    setIsRecovery(false);
    setIsInvalidToken(false);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    try {
      window.history.replaceState(null, '', '/auth');
    } catch {}
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">
            {isRecovery ? (isInvalidToken ? 'Link Expired' : 'Create New Password') : 'LSAT Smart Drill'}
          </CardTitle>
          <CardDescription>
            {isRecovery 
              ? (isInvalidToken 
                  ? 'Request a new password reset link' 
                  : 'Choose a strong password for your account')
              : 'Sign in to track your progress'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isRecovery ? (
            isInvalidToken ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                  <p className="text-sm text-destructive font-medium">
                    This password reset link is invalid or has already been used.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resend-email">Email</Label>
                  <Input
                    id="resend-email"
                    type="email"
                    placeholder="you@example.com"
                    value={recoveryEmail || resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Button 
                    onClick={handleResendResetLink} 
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Resend Reset Link'}
                  </Button>
                  <Button 
                    onClick={handleBackToLogin} 
                    variant="outline"
                    className="w-full"
                    type="button"
                  >
                    Back to Login
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
                {!hasRecoverySession && (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm text-muted-foreground">
                      Securely connecting your reset link...
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      name="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setPasswordError('');
                      }}
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      name="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setPasswordError('');
                      }}
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                {passwordError && (
                  <p className="text-sm text-destructive">{passwordError}</p>
                )}
                <div className="space-y-2">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading || !hasRecoverySession}
                  >
                    {loading ? 'Updating...' : 'Save New Password'}
                  </Button>
                  <Button 
                    onClick={handleBackToLogin} 
                    variant="outline"
                    className="w-full"
                    type="button"
                  >
                    Back to Login
                  </Button>
                </div>
              </form>
            )
          ) : (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      name="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        name="signin-password"
                        type={showSignInPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showSignInPassword ? "Hide password" : "Show password"}
                      >
                        {showSignInPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-end">
                    <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="link" className="px-0 text-sm">
                          Forgot password?
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reset Password</DialogTitle>
                          <DialogDescription>
                            Enter your email address and we'll send you a link to reset your password.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleForgotPassword} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="reset-email">Email</Label>
                            <Input
                              id="reset-email"
                              type="email"
                              placeholder="you@example.com"
                              value={resetEmail}
                              onChange={(e) => setResetEmail(e.target.value)}
                              required
                            />
                          </div>
                          <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Sending...' : 'Send Reset Link'}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="johndoe"
                      required
                      minLength={3}
                      maxLength={30}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="display-name">Display Name</Label>
                    <Input
                      id="display-name"
                      name="display-name"
                      type="text"
                      placeholder="John Doe"
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email *</Label>
                    <Input
                      id="signup-email"
                      name="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        name="signup-password"
                        type={showSignUpPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showSignUpPassword ? "Hide password" : "Show password"}
                      >
                        {showSignUpPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
