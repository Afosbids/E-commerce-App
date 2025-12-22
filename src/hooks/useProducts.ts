import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Product {
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
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  inventory?: {
    quantity: number;
    low_stock_threshold: number;
  }[];
}

export const useProducts = (options?: {
  featured?: boolean;
  categorySlug?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['products', options],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name, slug),
          inventory(quantity, low_stock_threshold)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (options?.featured) {
        query = query.eq('featured', true);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Product[];
    },
  });
};

export const useProduct = (slug: string) => {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name, slug),
          inventory(quantity, low_stock_threshold),
          variants:product_variants(*)
        `)
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as Product & { variants: Array<{ id: string; name: string; sku: string | null; price_adjustment: number; options: Record<string, unknown> }> };
    },
    enabled: !!slug,
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
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