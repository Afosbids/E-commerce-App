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
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpName, setSignUpName] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

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
    const { error } = await signIn(signInEmail, signInPassword);
    setLoading(false);

    if (error) {
      toast({ title: 'Sign In Failed', description: sanitizeAuthError(error), variant: 'destructive' });
    } else {
      toast({ title: 'Welcome back!' });
      navigate('/');
    }
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