import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Package, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import TwoFactorVerification from '@/components/auth/TwoFactorVerification';

const emailSchema = z.string().email('Invalid email address').max(255);
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters').max(100);
const nameSchema = z.string().min(1, 'Name is required').max(100);

// Sanitize auth error messages to prevent information leakage
const sanitizeAuthError = (error: Error): string => {
  const message = error.message.toLowerCase();
  
  // Generic message for login failures (prevents email enumeration)
  if (message.includes('invalid login credentials') || 
      message.includes('invalid password') ||
      message.includes('user not found')) {
    return 'Invalid email or password';
  }
  
  // User already registered
  if (message.includes('already registered') || 
      message.includes('already exists') ||
      message.includes('duplicate')) {
    return 'An account with this email already exists';
  }
  
  // Rate limiting
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'Too many attempts. Please try again later.';
  }
  
  // Email confirmation
  if (message.includes('confirm') || message.includes('verify')) {
    return 'Please check your email to confirm your account';
  }
  
  // Password requirements
  if (message.includes('password')) {
    return 'Password does not meet requirements';
  }
  
  // Default generic message for unknown errors
  return 'Authentication failed. Please try again.';
};

const Auth: React.FC = () => {
  const { signIn, signUp, user, mfaRequired, clearMfaRequired, completeMfaLogin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpName, setSignUpName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) {
        toast({ title: 'Google Sign In Failed', description: sanitizeAuthError(error), variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Google Sign In Failed', description: 'An unexpected error occurred', variant: 'destructive' });
    } finally {
      setGoogleLoading(false);
    }
  };

  // Redirect if already logged in (and no MFA required)
  React.useEffect(() => {
    if (user && !mfaRequired) {
      navigate('/');
    }
  }, [user, mfaRequired, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(signInEmail);
      passwordSchema.parse(signInPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({ title: 'Validation Error', description: err.errors[0].message, variant: 'destructive' });
        return;
      }
    }

    setLoading(true);
    const { error, mfaRequired: mfa } = await signIn(signInEmail, signInPassword);
    setLoading(false);

    if (error) {
      toast({ title: 'Sign In Failed', description: sanitizeAuthError(error), variant: 'destructive' });
    } else if (mfa?.required) {
      // MFA is required - don't navigate, show 2FA verification
      toast({ title: 'Two-Factor Authentication Required', description: 'Please enter your verification code' });
    } else {
      toast({ title: 'Welcome back!' });
      navigate('/');
    }
  };

  const handleMfaVerified = () => {
    completeMfaLogin();
    toast({ title: 'Welcome back!' });
    navigate('/');
  };

  const handleMfaCancel = async () => {
    await supabase.auth.signOut();
    clearMfaRequired();
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(signUpEmail);
      passwordSchema.parse(signUpPassword);
      nameSchema.parse(signUpName);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({ title: 'Validation Error', description: err.errors[0].message, variant: 'destructive' });
        return;
      }
    }

    setLoading(true);
    const { error } = await signUp(signUpEmail, signUpPassword, signUpName);
    setLoading(false);

    if (error) {
      toast({ title: 'Sign Up Failed', description: sanitizeAuthError(error), variant: 'destructive' });
    } else {
      toast({ title: 'Account created!', description: 'You can now sign in.' });
    }
  };

  // Show 2FA verification if required
  if (mfaRequired?.required && mfaRequired.factorId) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="container-narrow py-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4" />
            Back to store
          </Link>

          <div className="flex justify-center">
            <TwoFactorVerification
              factorId={mfaRequired.factorId}
              onVerified={handleMfaVerified}
              onCancel={handleMfaCancel}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container-narrow py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to store
        </Link>

        <div className="flex justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Package className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="font-heading text-2xl">Welcome to ShopPro</CardTitle>
              <CardDescription>Sign in to your account or create a new one</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Google Sign In Button */}
              <Button 
                variant="outline" 
                className="w-full mb-4 gap-2" 
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {googleLoading ? 'Signing in...' : 'Continue with Google'}
              </Button>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                </div>
              </div>

              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                
                <TabsContent value="signin" className="space-y-4 mt-4">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4 mt-4">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        value={signUpName}
                        onChange={(e) => setSignUpName(e.target.value)}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Creating account...' : 'Create Account'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                <p>Or continue as a <Link to="/cart" className="text-primary hover:underline">guest</Link></p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;