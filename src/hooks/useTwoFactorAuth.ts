import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EnrollResult {
  qrCode: string;
  secret: string;
  factorId: string;
}

export const useTwoFactorAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if MFA is enrolled for the current user
  const checkMFAStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      const totpFactors = data?.totp || [];
      const hasVerifiedFactor = totpFactors.some(factor => (factor.status as string) === 'verified');
      const hasPendingFactor = totpFactors.some(factor => (factor.status as string) === 'unverified');
      
      return {
        isEnrolled: hasVerifiedFactor,
        hasPendingFactor,
        factors: totpFactors
      };
    } catch (err) {
      console.error('Error checking MFA status:', err);
      return { isEnrolled: false, hasPendingFactor: false, factors: [] };
    }
  };

  // Start MFA enrollment - generates QR code
  const enrollMFA = async (): Promise<EnrollResult | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App'
      });
      
      if (error) throw error;
      
      return {
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        factorId: data.id
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start enrollment';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Verify the TOTP code during enrollment
  const verifyEnrollment = async (factorId: string, code: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code
      });
      
      if (error) throw error;
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid verification code';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Create a challenge for MFA verification during login
  const createChallenge = async (factorId: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.mfa.challenge({ factorId });
      if (error) throw error;
      return data.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create challenge';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Verify TOTP code during login
  const verifyTOTP = async (factorId: string, challengeId: string, code: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code
      });
      
      if (error) throw error;
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid verification code';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Unenroll MFA
  const unenrollMFA = async (factorId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disable 2FA';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Check the current assurance level
  const getAssuranceLevel = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error getting assurance level:', err);
      return null;
    }
  };

  return {
    checkMFAStatus,
    enrollMFA,
    verifyEnrollment,
    createChallenge,
    verifyTOTP,
    unenrollMFA,
    getAssuranceLevel,
    isLoading,
    error,
    clearError: () => setError(null)
  };
};
