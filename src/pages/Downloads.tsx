import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useDigitalPurchases } from '@/hooks/useDigitalPurchases';
import { useDigitalDownload } from '@/hooks/useDigitalDownload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, FileDown, Loader2, ShoppingBag, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

const Downloads: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: purchases, isLoading, error } = useDigitalPurchases();
  const { downloadProduct, isLoading: isDownloading } = useDigitalDownload();
  const [downloadingItemId, setDownloadingItemId] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleDownload = async (orderItemId: string, productName: string) => {
    setDownloadingItemId(orderItemId);
    const result = await downloadProduct(undefined, orderItemId);
    setDownloadingItemId(null);
    
    if (result.success) {
      toast.success(`Downloading ${productName}`);
    } else {
      toast.error(result.error || 'Failed to get download link');
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="container-narrow py-8">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <Layout>
      <div className="container-narrow py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold flex items-center gap-3">
              <FileDown className="h-8 w-8 text-primary" />
              My Downloads
            </h1>
            <p className="text-muted-foreground mt-1">
              Access your purchased digital products anytime
            </p>
          </div>
          <Link to="/products">
            <Button variant="outline">Browse Products</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h2 className="font-heading text-xl font-semibold mb-2">Error Loading Downloads</h2>
              <p className="text-muted-foreground">There was a problem loading your downloads. Please try again.</p>
            </CardContent>
          </Card>
        ) : !purchases || purchases.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="font-heading text-xl font-semibold mb-2">No Digital Products Yet</h2>
              <p className="text-muted-foreground mb-6">You haven't purchased any digital products yet.</p>
              <Link to="/products">
                <Button>Browse Digital Products</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {purchases.map(item => (
              <Card key={item.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">{item.product_name}</CardTitle>
                    <Badge variant={item.payment_status === 'paid' ? 'default' : 'secondary'}>
                      {item.payment_status === 'paid' ? 'Available' : 'Pending'}
                    </Badge>
                  </div>
                  {item.variant_name && (
                    <p className="text-sm text-muted-foreground">{item.variant_name}</p>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="text-sm text-muted-foreground mb-4">
                    <p>Purchased: {formatDate(item.order_created_at)}</p>
                    <p className="text-xs mt-1">Order: {item.order_number}</p>
                  </div>
                  
                  {item.payment_status === 'paid' ? (
                    <Button
                      className="w-full"
                      onClick={() => handleDownload(item.id, item.product_name)}
                      disabled={isDownloading && downloadingItemId === item.id}
                    >
                      {isDownloading && downloadingItemId === item.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Getting link...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button variant="secondary" disabled className="w-full">
                      <Clock className="h-4 w-4 mr-2" />
                      Payment Pending
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Downloads;
