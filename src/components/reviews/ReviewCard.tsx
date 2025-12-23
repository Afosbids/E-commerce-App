import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StarRating from './StarRating';
import { ProductReview } from '@/hooks/useProductReviews';
import { formatDistanceToNow } from 'date-fns';

interface ReviewCardProps {
  review: ProductReview;
  showStatus?: boolean;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review, showStatus = false }) => {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <StarRating rating={review.rating} size="sm" />
              {showStatus && (
                <Badge variant={getStatusBadgeVariant(review.status)}>
                  {review.status}
                </Badge>
              )}
            </div>
            
            <h4 className="font-semibold">{review.title}</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{review.content}</p>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
              <span className="font-medium">
                {review.customer?.full_name || 'Anonymous'}
              </span>
              <span>•</span>
              <span>
                {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReviewCard;
