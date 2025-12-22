import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InventoryItem {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    name: string;
    slug: string;
    images: string[];
    is_active: boolean;
  };
}

export const useInventory = () => {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          *,
          product:products(id, name, slug, images, is_active)
        `)
        .order('quantity', { ascending: true });

      if (error) throw error;
      return data as InventoryItem[];
    },
  });
};

export const useLowStockItems = () => {
  return useQuery({
    queryKey: ['low-stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          *,
          product:products(id, name, slug, images, is_active)
        `)
        .order('quantity', { ascending: true });

      if (error) throw error;
      
      // Filter items where quantity <= threshold
      return (data as InventoryItem[]).filter(
        item => item.quantity <= item.low_stock_threshold
      );
    },
  });
};

export const useUpdateInventory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      quantity, 
      low_stock_threshold 
    }: { 
      id: string; 
      quantity?: number; 
      low_stock_threshold?: number;
    }) => {
      const updates: Record<string, number> = {};
      if (quantity !== undefined) updates.quantity = quantity;
      if (low_stock_threshold !== undefined) updates.low_stock_threshold = low_stock_threshold;

      const { error } = await supabase
        .from('inventory')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });
};

export const useAdjustStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, adjustment }: { id: string; adjustment: number }) => {
      // First get current quantity
      const { data: current, error: fetchError } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const newQuantity = Math.max(0, current.quantity + adjustment);

      const { error } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('id', id);

      if (error) throw error;
      return newQuantity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
    },
  });
};