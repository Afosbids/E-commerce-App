import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OrderItem {
  product_id?: string;
  product_name: string;
  variant_id?: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  is_digital?: boolean;
}

interface OrderData {
  subtotal: number;
  shipping_cost: number;
  total: number;
  shipping_address?: {
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    postal_code?: string;
    country: string;
  };
  notes?: string;
}

interface CreateOrderResult {
  success: boolean;
  order?: {
    id: string;
    order_number: string;
    status: string;
    payment_status: string;
    total: number;
  };
  error?: string;
  retryAfter?: number;
}

export function useCreateOrder() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrder = async (
    order: OrderData,
    orderItems: OrderItem[],
    customerId?: string
  ): Promise<CreateOrderResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('create-order', {
        body: {
          order,
          orderItems,
          customerId
        }
      });

      if (invokeError) {
        console.error('Error invoking create-order function:', invokeError);
        setError('Failed to create order. Please try again.');
        return { success: false, error: invokeError.message };
      }

      // Handle rate limiting response
      if (data?.error && data?.retryAfter) {
        setError(data.error);
        return { 
          success: false, 
          error: data.error, 
          retryAfter: data.retryAfter 
        };
      }

      // Handle other errors
      if (data?.error) {
        setError(data.error);
        return { success: false, error: data.error };
      }

      return {
        success: true,
        order: data.order
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('Unexpected error creating order:', err);
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createOrder,
    isLoading,
    error,
    clearError: () => setError(null)
  };
}
