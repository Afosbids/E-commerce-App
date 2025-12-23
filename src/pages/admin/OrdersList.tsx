import React, { useState } from 'react';
import { useOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Eye, Mail, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Order } from '@/hooks/useOrders';

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const OrdersList: React.FC = () => {
  const { data: orders, isLoading } = useOrders();
  const updateStatus = useUpdateOrderStatus();
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      case 'processing': return 'bg-info/10 text-info border-info/20';
      case 'shipped': return 'bg-primary/10 text-primary border-primary/20';
      case 'delivered': return 'bg-success/10 text-success border-success/20';
      case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-success/10 text-success border-success/20';
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      case 'failed': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ orderId, status });
      toast({ title: 'Order status updated' });
    } catch (error) {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    }
  };

  const handleSendEmail = async (orderId: string, emailType: 'shipped' | 'delivered') => {
    setSendingEmail(`${orderId}-${emailType}`);
    try {
      const { data, error } = await supabase.functions.invoke('send-order-email', {
        body: { orderId, emailType }
      });

      if (error) throw error;

      toast({ title: data.message || `${emailType} email sent successfully` });
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({ 
        title: 'Failed to send email', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setSendingEmail(null);
    }
  };

  if (isLoading) {
    return <div className="h-96 bg-muted animate-pulse rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Orders</h1>

      <Card>
        <CardHeader>
          <CardTitle>All Orders ({orders?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {orders && orders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.customer?.full_name || 'Guest'}</p>
                        <p className="text-xs text-muted-foreground">{order.customer?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(order.created_at)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(order.total)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getPaymentStatusColor(order.payment_status)}>
                        {order.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={order.status}
                        onValueChange={(value) => handleStatusChange(order.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <Badge variant="outline" className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No orders yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Customer</h4>
                  <p>{selectedOrder.customer?.full_name || 'Guest'}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.customer?.email}</p>
                  {selectedOrder.customer?.phone && (
                    <p className="text-sm text-muted-foreground">{selectedOrder.customer.phone}</p>
                  )}
                </div>
                <div>
                  <h4 className="font-medium mb-2">Shipping Address</h4>
                  {selectedOrder.address ? (
                    <div className="text-sm text-muted-foreground">
                      <p>{selectedOrder.address.address_line1}</p>
                      {selectedOrder.address.address_line2 && (
                        <p>{selectedOrder.address.address_line2}</p>
                      )}
                      <p>{selectedOrder.address.city}, {selectedOrder.address.state}</p>
                      {selectedOrder.address.postal_code && (
                        <p>{selectedOrder.address.postal_code}</p>
                      )}
                      <p>{selectedOrder.address.country}</p>
                    </div>
                  ) : selectedOrder.shipping_address ? (
                    // Backward compatibility for legacy JSONB addresses
                    <div className="text-sm text-muted-foreground">
                      {Object.entries(selectedOrder.shipping_address).map(([key, value]) => (
                        <p key={key}>{String(value)}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No shipping address</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Order Items</h4>
                <div className="border rounded-lg divide-y">
                  {selectedOrder.order_items?.map((item) => (
                    <div key={item.id} className="p-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        {item.variant_name && (
                          <p className="text-xs text-muted-foreground">{item.variant_name}</p>
                        )}
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium">{formatCurrency(item.total_price)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>{formatCurrency(selectedOrder.shipping_cost)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>

              {/* Email Actions */}
              {selectedOrder.payment_status === 'paid' && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Send Email Notification</h4>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendEmail(selectedOrder.id, 'shipped')}
                      disabled={sendingEmail === `${selectedOrder.id}-shipped`}
                    >
                      {sendingEmail === `${selectedOrder.id}-shipped` ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4 mr-2" />
                      )}
                      Send Shipped Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendEmail(selectedOrder.id, 'delivered')}
                      disabled={sendingEmail === `${selectedOrder.id}-delivered`}
                    >
                      {sendingEmail === `${selectedOrder.id}-delivered` ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4 mr-2" />
                      )}
                      Send Delivered Email
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersList;