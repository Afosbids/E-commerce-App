import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DigitalPurchase {
  id: string;
  product_id: string | null;
  product_name: string;
  variant_name: string | null;
  order_id: string;
  order_number: string;
  order_created_at: string;
  payment_status: string;
}

export const useDigitalPurchases = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['digital-purchases', user?.id],
    queryFn: async (): Promise<DigitalPurchase[]> => {
      if (!user) return [];

      // First, get the customer record for this user
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (customerError) {
        console.error('Error fetching customer:', customerError);
        throw customerError;
      }

      if (!customer) {
        return [];
      }

      // Fetch digital order items for this customer's orders
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select(`
          id,
          product_id,
          product_name,
          variant_name,
          order:orders!inner(
            id,
            order_number,
            created_at,
            payment_status,
            customer_id
          )
        `)
        .eq('is_digital', true)
        .eq('order.customer_id', customer.id)
        .order('order(created_at)', { ascending: false });

      if (orderItemsError) {
        console.error('Error fetching digital purchases:', orderItemsError);
        throw orderItemsError;
      }

      // Transform the data to flatten the order relationship
      return (orderItems || []).map(item => {
        const order = item.order as unknown as {
          id: string;
          order_number: string;
          created_at: string;
          payment_status: string;
        };
        
        return {
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          variant_name: item.variant_name,
          order_id: order.id,
          order_number: order.order_number,
          order_created_at: order.created_at,
          payment_status: order.payment_status,
        };
      });
    },
    enabled: !!user,
  });
};
