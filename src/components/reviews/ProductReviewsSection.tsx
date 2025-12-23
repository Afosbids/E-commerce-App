import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProductReviews, useReviewStats, useUserReview, useCanReview } from '@/hooks/useProductReviews';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import StarRating from './StarRating';
import ReviewCard from './ReviewCard';
import ReviewForm from './ReviewForm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, MessageSquare, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProductReviewsSectionProps {
  productId: string;
}

const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({ productId }) => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  
  const { data: reviews, isLoading: reviewsLoading } = useProductReviews(productId);
  const { data: stats } = useReviewStats(productId);
  
  // Get customer ID for the current user
  const { data: customer } = useQuery({
    queryKey: ['customer-for-user', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: userReview } = useUserReview(productId, customer?.id);
  const { data: canReview } = useCanReview(productId, customer?.id);

  const showReviewForm = user && canReview && !userReview;

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-bold">Customer Reviews</h2>

      {/* Stats Overview */}
      {stats && stats.totalReviews > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Average Rating */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-4xl font-bold">{stats.averageRating.toFixed(1)}</div>
                  <StarRating rating={Math.round(stats.averageRating)} size="md" />
                  <p className="text-sm text-muted-foreground mt-1">
                    {stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'}
                  </p>
                </div>
              </div>

              {/* Rating Distribution */}
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-sm w-8">{star} ★</span>
                    <Progress 
                      value={(stats.ratingCounts[star] / stats.totalReviews) * 100} 
                      className="flex-1 h-2"
                    />
                    <span className="text-sm text-muted-foreground w-8">
                      {stats.ratingCounts[star]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User's pending review notice */}
      {userReview && userReview.status === 'pending' && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Your review is pending approval. It will appear here once reviewed by our team.
          </AlertDescription>
        </Alert>
      )}

      {/* Review Form */}
      {showReviewForm && (
        <>
          {showForm ? (
            <ReviewForm 
              productId={productId} 
              customerId={customer!.id} 
              onSuccess={() => setShowForm(false)}
            />
          ) : (
            <Button onClick={() => setShowForm(true)} variant="outline" className="w-full">
              <MessageSquare className="h-4 w-4 mr-2" />
              Write a Review
            </Button>
          )}
        </>
      )}

      {/* Login prompt */}
      {!user && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please sign in to leave a review.
          </AlertDescription>
        </Alert>
      )}

      {/* Purchase required notice */}
      {user && !canReview && !userReview && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need to purchase this product to leave a review.
          </AlertDescription>
        </Alert>
      )}

      {/* Reviews List */}
      {reviewsLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <div className="h-4 bg-muted animate-pulse rounded w-24 mb-2" />
                <div className="h-5 bg-muted animate-pulse rounded w-48 mb-2" />
                <div className="h-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : reviews && reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No reviews yet. Be the first to share your experience!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProductReviewsSection;
