import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface OrderItem {
  id: string;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_digital: boolean;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  created_at: string;
  shipping_address: {
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    postal_code?: string;
    country: string;
  } | null;
  order_items: OrderItem[];
}

export const useCustomerOrders = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['customer-orders', user?.id],
    queryFn: async (): Promise<Order[]> => {
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

      // Fetch orders for this customer
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          payment_status,
          subtotal,
          shipping_cost,
          total,
          created_at,
          shipping_address,
          order_items (
            id,
            product_name,
            variant_name,
            quantity,
            unit_price,
            total_price,
            is_digital
          )
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        throw ordersError;
      }

      return (orders || []) as Order[];
    },
    enabled: !!user,
  });
};
