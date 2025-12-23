import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProductReview {
  id: string;
  product_id: string;
  customer_id: string;
  rating: number;
  title: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    full_name: string | null;
  };
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingCounts: Record<number, number>;
}

// Get approved reviews for a product (public)
export const useProductReviews = (productId: string) => {
  return useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_reviews')
        .select(`
          *,
          customer:customers(full_name)
        `)
        .eq('product_id', productId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProductReview[];
    },
    enabled: !!productId,
  });
};

// Get review stats for a product
export const useReviewStats = (productId: string) => {
  return useQuery({
    queryKey: ['review-stats', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('rating')
        .eq('product_id', productId)
        .eq('status', 'approved');

      if (error) throw error;

      const ratings = data || [];
      const totalReviews = ratings.length;
      const averageRating = totalReviews > 0 
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
        : 0;
      
      const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratings.forEach(r => {
        ratingCounts[r.rating] = (ratingCounts[r.rating] || 0) + 1;
      });

      return { averageRating, totalReviews, ratingCounts } as ReviewStats;
    },
    enabled: !!productId,
  });
};

// Get user's own review for a product
export const useUserReview = (productId: string, customerId: string | undefined) => {
  return useQuery({
    queryKey: ['user-review', productId, customerId],
    queryFn: async () => {
      if (!customerId) return null;
      
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('customer_id', customerId)
        .maybeSingle();

      if (error) throw error;
      return data as ProductReview | null;
    },
    enabled: !!productId && !!customerId,
  });
};

// Check if user can review (has purchased the product)
export const useCanReview = (productId: string, customerId: string | undefined) => {
  return useQuery({
    queryKey: ['can-review', productId, customerId],
    queryFn: async () => {
      if (!customerId) return false;
      
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id,
          order:orders!inner(
            customer_id,
            payment_status
          )
        `)
        .eq('product_id', productId)
        .eq('order.customer_id', customerId)
        .eq('order.payment_status', 'paid')
        .limit(1);

      if (error) throw error;
      return (data?.length || 0) > 0;
    },
    enabled: !!productId && !!customerId,
  });
};

// Create a review
export const useCreateReview = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      productId, 
      customerId, 
      rating, 
      title, 
      content 
    }: {
      productId: string;
      customerId: string;
      rating: number;
      title: string;
      content: string;
    }) => {
      const { data, error } = await supabase
        .from('product_reviews')
        .insert({
          product_id: productId,
          customer_id: customerId,
          rating,
          title,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-reviews', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['review-stats', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['user-review', variables.productId] });
      toast({ title: 'Review submitted', description: 'Your review is pending approval.' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to submit review', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
};

// Admin: Get all reviews with filters
export const useAdminReviews = (statusFilter?: string) => {
  return useQuery({
    queryKey: ['admin-reviews', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('product_reviews')
        .select(`
          *,
          customer:customers(full_name, email),
          product:products(name, slug)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'pending' | 'approved' | 'rejected');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

// Admin: Update review status
export const useUpdateReviewStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      reviewId, 
      status, 
      adminNotes 
    }: {
      reviewId: string;
      status: 'approved' | 'rejected';
      adminNotes?: string;
    }) => {
      const { data, error } = await supabase
        .from('product_reviews')
        .update({ 
          status, 
          admin_notes: adminNotes || null 
        })
        .eq('id', reviewId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['review-stats'] });
      toast({ title: 'Review updated successfully' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to update review', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
};

// Admin: Delete review
export const useDeleteReview = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['review-stats'] });
      toast({ title: 'Review deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to delete review', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
};
