import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAdminReviews, useUpdateReviewStatus, useDeleteReview } from '@/hooks/useProductReviews';
import StarRating from '@/components/reviews/StarRating';
import { Check, X, Trash2, Eye, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

const ReviewsList: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const { data: reviews, isLoading } = useAdminReviews(statusFilter);
  const updateStatus = useUpdateReviewStatus();
  const deleteReview = useDeleteReview();

  const handleApprove = async (reviewId: string) => {
    await updateStatus.mutateAsync({ reviewId, status: 'approved', adminNotes });
    setSelectedReview(null);
    setAdminNotes('');
  };

  const handleReject = async (reviewId: string) => {
    await updateStatus.mutateAsync({ reviewId, status: 'rejected', adminNotes });
    setSelectedReview(null);
    setAdminNotes('');
  };

  const handleDelete = async () => {
    if (reviewToDelete) {
      await deleteReview.mutateAsync(reviewToDelete);
      setReviewToDelete(null);
    }
  };

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Review Moderation</h1>
        <p className="text-muted-foreground">Manage customer reviews and ratings</p>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {statusFilter === 'all' ? 'All Reviews' : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Reviews`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : !reviews || reviews.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No reviews found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.map((review: any) => (
                      <TableRow key={review.id}>
                        <TableCell>
                          <Link 
                            to={`/products/${review.product?.slug}`}
                            className="font-medium hover:underline"
                          >
                            {review.product?.name || 'Unknown'}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{review.customer?.full_name || 'Anonymous'}</p>
                            <p className="text-xs text-muted-foreground">{review.customer?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StarRating rating={review.rating} size="sm" />
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {review.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(review.status)}>
                            {review.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedReview(review);
                                setAdminNotes(review.admin_notes || '');
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {review.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => handleApprove(review.id)}
                                  disabled={updateStatus.isPending}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => handleReject(review.id)}
                                  disabled={updateStatus.isPending}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setReviewToDelete(review.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Detail Dialog */}
      <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
            <DialogDescription>
              Review for {selectedReview?.product?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedReview && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <StarRating rating={selectedReview.rating} size="md" />
                <Badge variant={getStatusBadgeVariant(selectedReview.status)}>
                  {selectedReview.status}
                </Badge>
              </div>

              <div>
                <h4 className="font-semibold">{selectedReview.title}</h4>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                  {selectedReview.content}
                </p>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>By: {selectedReview.customer?.full_name || 'Anonymous'}</p>
                <p>Email: {selectedReview.customer?.email}</p>
                <p>Submitted: {new Date(selectedReview.created_at).toLocaleDateString()}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this review..."
                  rows={3}
                />
              </div>

              {selectedReview.status === 'pending' && (
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => handleReject(selectedReview.id)}
                    disabled={updateStatus.isPending}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleApprove(selectedReview.id)}
                    disabled={updateStatus.isPending}
                  >
                    {updateStatus.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!reviewToDelete} onOpenChange={() => setReviewToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ReviewsList;
