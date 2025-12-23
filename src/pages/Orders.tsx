import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomerOrders } from '@/hooks/useCustomerOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Package, ShoppingBag, Clock, CheckCircle, XCircle, Truck, CreditCard } from 'lucide-react';

const Orders: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: orders, isLoading, error } = useCustomerOrders();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; label: string }> = {
      pending: { variant: 'secondary', icon: <Clock className="h-3 w-3" />, label: 'Pending' },
      confirmed: { variant: 'default', icon: <CheckCircle className="h-3 w-3" />, label: 'Confirmed' },
      processing: { variant: 'outline', icon: <Package className="h-3 w-3" />, label: 'Processing' },
      shipped: { variant: 'default', icon: <Truck className="h-3 w-3" />, label: 'Shipped' },
      delivered: { variant: 'default', icon: <CheckCircle className="h-3 w-3" />, label: 'Delivered' },
      cancelled: { variant: 'destructive', icon: <XCircle className="h-3 w-3" />, label: 'Cancelled' },
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getPaymentBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: 'Unpaid' },
      paid: { variant: 'default', label: 'Paid' },
      failed: { variant: 'destructive', label: 'Failed' },
      refunded: { variant: 'outline', label: 'Refunded' },
    };
    
    const paymentConfig = config[status] || config.pending;
    return (
      <Badge variant={paymentConfig.variant} className="flex items-center gap-1">
        <CreditCard className="h-3 w-3" />
        {paymentConfig.label}
      </Badge>
    );
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="container-narrow py-8">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
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
          <h1 className="font-heading text-3xl font-bold">My Orders</h1>
          <Link to="/products">
            <Button variant="outline">Continue Shopping</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h2 className="font-heading text-xl font-semibold mb-2">Error Loading Orders</h2>
              <p className="text-muted-foreground">There was a problem loading your orders. Please try again.</p>
            </CardContent>
          </Card>
        ) : !orders || orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="font-heading text-xl font-semibold mb-2">No Orders Yet</h2>
              <p className="text-muted-foreground mb-6">You haven't placed any orders yet.</p>
              <Link to="/products">
                <Button>Start Shopping</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <Card key={order.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg font-mono">{order.order_number}</CardTitle>
                      <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(order.status)}
                      {getPaymentBadge(order.payment_status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible>
                    <AccordionItem value="items" className="border-none">
                      <AccordionTrigger className="py-2 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <span className="text-sm text-muted-foreground">
                            {order.order_items.length} item{order.order_items.length !== 1 ? 's' : ''}
                          </span>
                          <span className="font-semibold">{formatPrice(order.total)}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {order.order_items.map(item => (
                            <div key={item.id} className="flex justify-between items-start text-sm">
                              <div>
                                <p className="font-medium">{item.product_name}</p>
                                {item.variant_name && (
                                  <p className="text-muted-foreground text-xs">{item.variant_name}</p>
                                )}
                                <p className="text-muted-foreground">Qty: {item.quantity}</p>
                              </div>
                              <p className="font-medium">{formatPrice(item.total_price)}</p>
                            </div>
                          ))}
                          
                          <div className="border-t pt-3 mt-3 space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Subtotal</span>
                              <span>{formatPrice(order.subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Shipping</span>
                              <span>{formatPrice(order.shipping_cost)}</span>
                            </div>
                            <div className="flex justify-between font-semibold pt-1">
                              <span>Total</span>
                              <span>{formatPrice(order.total)}</span>
                            </div>
                          </div>

                          {order.shipping_address && (
                            <div className="border-t pt-3 mt-3">
                              <p className="text-sm font-medium mb-1">Shipping Address</p>
                              <p className="text-sm text-muted-foreground">
                                {order.shipping_address.address_line1}
                                {order.shipping_address.address_line2 && `, ${order.shipping_address.address_line2}`}
                                <br />
                                {order.shipping_address.city}, {order.shipping_address.state}
                                {order.shipping_address.postal_code && ` ${order.shipping_address.postal_code}`}
                                <br />
                                {order.shipping_address.country}
                              </p>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Orders;
