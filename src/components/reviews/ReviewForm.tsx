import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StarRating from './StarRating';
import { useCreateReview } from '@/hooks/useProductReviews';
import { Loader2 } from 'lucide-react';

interface ReviewFormProps {
  productId: string;
  customerId: string;
  onSuccess?: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ productId, customerId, onSuccess }) => {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const createReview = useCreateReview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) return;
    if (title.length < 3 || title.length > 100) return;
    if (content.length < 10 || content.length > 2000) return;

    await createReview.mutateAsync({
      productId,
      customerId,
      rating,
      title,
      content,
    });

    setRating(0);
    setTitle('');
    setContent('');
    onSuccess?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Write a Review</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Your Rating</Label>
            <StarRating
              rating={rating}
              size="lg"
              interactive
              onRatingChange={setRating}
            />
            {rating === 0 && (
              <p className="text-sm text-muted-foreground">Click to rate</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Review Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize your experience"
              minLength={3}
              maxLength={100}
              required
            />
            <p className="text-xs text-muted-foreground">{title.length}/100 characters</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Your Review</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your experience with this product..."
              rows={4}
              minLength={10}
              maxLength={2000}
              required
            />
            <p className="text-xs text-muted-foreground">{content.length}/2000 characters</p>
          </div>

          <Button 
            type="submit" 
            disabled={createReview.isPending || rating === 0 || title.length < 3 || content.length < 10}
            className="w-full"
          >
            {createReview.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Review
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Your review will be published after moderation.
          </p>
        </form>
      </CardContent>
    </Card>
  );
};

export default ReviewForm;
