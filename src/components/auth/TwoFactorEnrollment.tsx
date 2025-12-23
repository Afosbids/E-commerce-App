import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ShieldCheck, ShieldOff, Loader2, Copy, Check, QrCode } from 'lucide-react';
import { useTwoFactorAuth } from '@/hooks/useTwoFactorAuth';
import { useToast } from '@/hooks/use-toast';

interface Factor {
  id: string;
  status: string;
  friendly_name?: string;
}

const TwoFactorEnrollment: React.FC = () => {
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrollmentData, setEnrollmentData] = useState<{
    qrCode: string;
    secret: string;
    factorId: string;
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  const { 
    checkMFAStatus, 
    enrollMFA, 
    verifyEnrollment, 
    unenrollMFA, 
    isLoading, 
    error, 
    clearError 
  } = useTwoFactorAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadMFAStatus();
  }, []);

  const loadMFAStatus = async () => {
    setIsCheckingStatus(true);
    const status = await checkMFAStatus();
    setIsEnrolled(status.isEnrolled);
    setFactors(status.factors);
    setIsCheckingStatus(false);
  };

  const handleStartEnrollment = async () => {
    clearError();
    const data = await enrollMFA();
    if (data) {
      setEnrollmentData(data);
      setShowEnrollDialog(true);
    }
  };

  const handleVerifyEnrollment = async () => {
    if (!enrollmentData) return;

    if (verificationCode.length !== 6 || !/^\d+$/.test(verificationCode)) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a 6-digit code',
        variant: 'destructive'
      });
      return;
    }

    const success = await verifyEnrollment(enrollmentData.factorId, verificationCode);
    
    if (success) {
      toast({ 
        title: '2FA Enabled', 
        description: 'Two-factor authentication is now active for your account' 
      });
      setShowEnrollDialog(false);
      setEnrollmentData(null);
      setVerificationCode('');
      await loadMFAStatus();
    }
  };

  const handleDisable2FA = async () => {
    const verifiedFactor = factors.find(f => f.status === 'verified');
    if (!verifiedFactor) return;

    const success = await unenrollMFA(verifiedFactor.id);
    
    if (success) {
      toast({ 
        title: '2FA Disabled', 
        description: 'Two-factor authentication has been removed from your account' 
      });
      setShowDisableDialog(false);
      await loadMFAStatus();
    }
  };

  const copySecret = () => {
    if (enrollmentData?.secret) {
      navigator.clipboard.writeText(enrollmentData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  if (isCheckingStatus) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your admin account using an authenticator app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEnrolled ? (
          <>
            <Alert className="border-green-500 bg-green-500/10">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                Two-factor authentication is enabled for your account
              </AlertDescription>
            </Alert>

            <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  <ShieldOff className="mr-2 h-4 w-4" />
                  Disable 2FA
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Disable Two-Factor Authentication?</DialogTitle>
                  <DialogDescription>
                    This will remove the extra security layer from your account. 
                    You can re-enable it at any time.
                  </DialogDescription>
                </DialogHeader>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDisableDialog(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDisable2FA}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Disabling...
                      </>
                    ) : (
                      'Disable 2FA'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Protect your admin account by requiring a verification code from your 
              authenticator app (like Google Authenticator or Authy) in addition to your password.
            </p>

            <Button onClick={handleStartEnrollment} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Enable 2FA
                </>
              )}
            </Button>

            <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
                  <DialogDescription>
                    Scan the QR code with your authenticator app, then enter the verification code
                  </DialogDescription>
                </DialogHeader>

                {enrollmentData && (
                  <div className="space-y-4">
                    <div className="flex justify-center p-4 bg-white rounded-lg">
                      <img 
                        src={enrollmentData.qrCode} 
                        alt="2FA QR Code" 
                        className="w-48 h-48"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Can't scan? Enter this code manually:
                      </Label>
                      <div className="flex gap-2">
                        <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono break-all">
                          {enrollmentData.secret}
                        </code>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={copySecret}
                        >
                          {copiedSecret ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="verify-code">Verification Code</Label>
                      <Input
                        id="verify-code"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="text-center text-xl tracking-widest"
                        autoComplete="one-time-code"
                      />
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEnrollDialog(false);
                      setEnrollmentData(null);
                      setVerificationCode('');
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleVerifyEnrollment}
                    disabled={isLoading || verificationCode.length !== 6}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify & Enable'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TwoFactorEnrollment;
