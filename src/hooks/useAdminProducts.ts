import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  category_id: string | null;
  product_type: string;
  is_active: boolean;
  featured: boolean;
  images: string[];
  digital_file_url: string | null;
  created_at: string;
  updated_at: string;
  category?: { id: string; name: string } | null;
  inventory?: { id: string; quantity: number; low_stock_threshold: number }[];
}

export interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  price: number;
  compare_at_price?: number;
  category_id?: string;
  product_type: 'physical' | 'digital';
  is_active: boolean;
  featured: boolean;
  images: string[];
  digital_file_url?: string;
  initial_stock?: number;
  low_stock_threshold?: number;
}

export const useAdminProducts = () => {
  return useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name),
          inventory(id, quantity, low_stock_threshold)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AdminProduct[];
    },
  });
};

export const useAdminProduct = (id: string) => {
  return useQuery({
    queryKey: ['admin-product', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name),
          inventory(id, quantity, low_stock_threshold)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as AdminProduct;
    },
    enabled: !!id,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: ProductFormData) => {
      // Create product
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert([{
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          price: formData.price,
          compare_at_price: formData.compare_at_price || null,
          category_id: formData.category_id || null,
          product_type: formData.product_type,
          is_active: formData.is_active,
          featured: formData.featured,
          images: formData.images,
          digital_file_url: formData.digital_file_url || null,
        }])
        .select()
        .single();

      if (productError) throw productError;

      // Create inventory record
      const { error: inventoryError } = await supabase
        .from('inventory')
        .insert([{
          product_id: product.id,
          quantity: formData.initial_stock || 0,
          low_stock_threshold: formData.low_stock_threshold || 10,
        }]);

      if (inventoryError) throw inventoryError;

      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: Partial<ProductFormData> }) => {
      const { data, error } = await supabase
        .from('products')
        .update({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          price: formData.price,
          compare_at_price: formData.compare_at_price || null,
          category_id: formData.category_id || null,
          product_type: formData.product_type,
          is_active: formData.is_active,
          featured: formData.featured,
          images: formData.images as unknown as Json,
          digital_file_url: formData.digital_file_url || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-product'] });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });
};

export const useAdminCategories = () => {
  return useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (category: { name: string; slug: string; description?: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .insert([category])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};