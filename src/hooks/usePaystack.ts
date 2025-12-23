import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface InitializePaymentResult {
  success: boolean;
  authorization_url?: string;
  reference?: string;
  error?: string;
}

interface VerifyPaymentResult {
  success: boolean;
  order?: any;
  reference?: string;
  amount?: number;
  error?: string;
  warning?: string;
}

export const usePaystack = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializePayment = async (
    email: string,
    amount: number,
    orderId: string,
    metadata?: Record<string, any>
  ): Promise<InitializePaymentResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('initialize-payment', {
        body: { email, amount, orderId, metadata },
      });

      if (fnError) {
        const errorMessage = fnError.message || 'Failed to initialize payment';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      if (!data?.success) {
        const errorMessage = data?.error || 'Failed to initialize payment';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      return {
        success: true,
        authorization_url: data.authorization_url,
        reference: data.reference,
      };
    } catch (err: any) {
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPayment = async (
    reference: string,
    orderId: string,
    customerEmail?: string,
    customerName?: string
  ): Promise<VerifyPaymentResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('verify-payment', {
        body: { reference, orderId, customerEmail, customerName },
      });

      if (fnError) {
        const errorMessage = fnError.message || 'Failed to verify payment';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      if (!data?.success) {
        const errorMessage = data?.error || 'Payment verification failed';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      return {
        success: true,
        order: data.order,
        reference: data.reference,
        amount: data.amount,
        warning: data.warning,
      };
    } catch (err: any) {
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    initializePayment,
    verifyPayment,
    isLoading,
    error,
    clearError: () => setError(null),
  };
};
