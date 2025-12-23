import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useTwoFactorAuth } from '@/hooks/useTwoFactorAuth';
import { useToast } from '@/hooks/use-toast';

interface TwoFactorVerificationProps {
  factorId: string;
  onVerified: () => void;
  onCancel: () => void;
}

const TwoFactorVerification: React.FC<TwoFactorVerificationProps> = ({
  factorId,
  onVerified,
  onCancel
}) => {
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const { createChallenge, verifyTOTP, isLoading, error, clearError } = useTwoFactorAuth();
  const { toast } = useToast();

  useEffect(() => {
    const initChallenge = async () => {
      const id = await createChallenge(factorId);
      if (id) {
        setChallengeId(id);
      }
    };
    initChallenge();
  }, [factorId]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!challengeId) {
      toast({
        title: 'Error',
        description: 'Challenge not initialized. Please try again.',
        variant: 'destructive'
      });
      return;
    }

    if (code.length !== 6 || !/^\d+$/.test(code)) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a 6-digit code',
        variant: 'destructive'
      });
      return;
    }

    const success = await verifyTOTP(factorId, challengeId, code);
    
    if (success) {
      toast({ title: '2FA Verified', description: 'Successfully authenticated' });
      onVerified();
    } else {
      // Create a new challenge for retry
      const newChallengeId = await createChallenge(factorId);
      if (newChallengeId) {
        setChallengeId(newChallengeId);
      }
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <ShieldCheck className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="font-heading text-2xl">Two-Factor Authentication</CardTitle>
        <CardDescription>
          Enter the 6-digit code from your authenticator app
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="totp-code">Verification Code</Label>
            <Input
              id="totp-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="text-center text-2xl tracking-widest"
              autoFocus
              autoComplete="one-time-code"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading || code.length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify'
              )}
            </Button>
          </div>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Open your authenticator app (Google Authenticator, Authy, etc.) 
          and enter the current code for ShopPro.
        </p>
      </CardContent>
    </Card>
  );
};

export default TwoFactorVerification;
