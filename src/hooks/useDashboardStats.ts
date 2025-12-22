import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  lowStockCount: number;
  totalRevenue: number;
  todayRevenue: number;
}

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      // Fetch products count
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      const { count: activeProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch orders count
      const { count: totalOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      const { count: pendingOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Fetch customers count
      const { count: totalCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      // Fetch low stock items
      const { data: inventory } = await supabase
        .from('inventory')
        .select('quantity, low_stock_threshold');

      const lowStockCount = inventory?.filter(
        item => item.quantity <= item.low_stock_threshold
      ).length || 0;

      // Fetch revenue
      const { data: allOrders } = await supabase
        .from('orders')
        .select('total, created_at')
        .eq('payment_status', 'paid');

      const totalRevenue = allOrders?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
      
      const today = new Date().toISOString().split('T')[0];
      const todayRevenue = allOrders?.filter(
        order => order.created_at.startsWith(today)
      ).reduce((sum, order) => sum + Number(order.total), 0) || 0;

      return {
        totalProducts: totalProducts || 0,
        activeProducts: activeProducts || 0,
        totalOrders: totalOrders || 0,
        pendingOrders: pendingOrders || 0,
        totalCustomers: totalCustomers || 0,
        lowStockCount,
        totalRevenue,
        todayRevenue,
      };
    },
  });
};

export const useRecentOrders = (limit = 5) => {
  return useQuery({
    queryKey: ['recent-orders', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          payment_status,
          total,
          created_at,
          customer:customers(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
  });
};