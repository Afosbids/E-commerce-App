import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DownloadResult {
  success: boolean;
  downloadUrl?: string;
  product?: {
    id: string;
    name: string;
  };
  error?: string;
}

export const useDigitalDownload = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDownloadUrl = async (
    productId?: string,
    orderItemId?: string
  ): Promise<DownloadResult> => {
    if (!productId && !orderItemId) {
      return { success: false, error: 'Either productId or orderItemId is required' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-download-url', {
        body: { productId, orderItemId },
      });

      if (fnError) {
        console.error('Error invoking get-download-url:', fnError);
        setError(fnError.message || 'Failed to get download URL');
        return { success: false, error: fnError.message };
      }

      if (data.error) {
        setError(data.error);
        return { success: false, error: data.error };
      }

      return {
        success: true,
        downloadUrl: data.downloadUrl,
        product: data.product,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('Error getting download URL:', err);
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  const downloadProduct = async (productId?: string, orderItemId?: string) => {
    const result = await getDownloadUrl(productId, orderItemId);
    
    if (result.success && result.downloadUrl) {
      // Open the download URL in a new tab
      window.open(result.downloadUrl, '_blank');
    }
    
    return result;
  };

  return {
    getDownloadUrl,
    downloadProduct,
    isLoading,
    error,
    clearError: () => setError(null),
  };
};
