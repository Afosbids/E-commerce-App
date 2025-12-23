import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateOrder } from '@/hooks/useCreateOrder';
import { usePaystack } from '@/hooks/usePaystack';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShoppingBag, Loader2, CheckCircle, AlertCircle, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const shippingSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').max(255),
  phone: z.string().min(10, 'Phone must be at least 10 digits').max(20),
  addressLine1: z.string().min(5, 'Address is required').max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(2, 'City is required').max(100),
  state: z.string().min(2, 'State is required').max(100),
  postalCode: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
});

const SHIPPING_COST = 2500; // NGN 2,500 flat rate

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const { createOrder, isLoading: isCreatingOrder, error: orderError } = useCreateOrder();
  const { initializePayment, verifyPayment, isLoading: isPaymentLoading, error: paymentError } = usePaystack();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    notes: '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [orderSuccess, setOrderSuccess] = useState<{ orderNumber: string } | null>(null);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const total = subtotal + SHIPPING_COST;
  const isLoading = isCreatingOrder || isPaymentLoading || isVerifying;

  // Handle payment verification on redirect back from Paystack
  useEffect(() => {
    const verifyOnRedirect = async () => {
      const shouldVerify = searchParams.get('verify');
      const orderId = searchParams.get('orderId');
      const reference = searchParams.get('reference') || searchParams.get('trxref');

      if (shouldVerify && orderId && reference) {
        setIsVerifying(true);
        
        // Retrieve customer info from localStorage
        const storedCustomer = localStorage.getItem('checkout_customer');
        let customerEmail: string | undefined;
        let customerName: string | undefined;
        
        if (storedCustomer) {
          try {
            const parsed = JSON.parse(storedCustomer);
            customerEmail = parsed.email;
            customerName = parsed.name;
          } catch (e) {
            console.error('Error parsing stored customer info:', e);
          }
          localStorage.removeItem('checkout_customer');
        }
        
        const result = await verifyPayment(reference, orderId, customerEmail, customerName);
        setIsVerifying(false);

        if (result.success) {
          setOrderSuccess({ orderNumber: result.order?.order_number || 'N/A' });
          clearCart();
          toast.success('Payment successful! Order confirmed.');
          // Clean up URL
          navigate('/checkout', { replace: true });
        } else {
          toast.error(result.error || 'Payment verification failed');
          navigate('/checkout', { replace: true });
        }
      }
    };

    verifyOnRedirect();
  }, [searchParams]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(price);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setRateLimitMessage(null);

    // Validate form
    const result = shippingSchema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setValidationErrors(errors);
      return;
    }

    // Prepare order data
    const orderData = {
      subtotal,
      shipping_cost: SHIPPING_COST,
      total,
      shipping_address: {
        address_line1: formData.addressLine1,
        address_line2: formData.addressLine2 || undefined,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postalCode || undefined,
        country: 'Nigeria',
      },
      notes: formData.notes || undefined,
    };

    const orderItems = items.map(item => ({
      product_id: item.productId,
      product_name: item.name,
      variant_id: item.variantId,
      variant_name: item.variantName,
      quantity: item.quantity,
      unit_price: item.price,
      is_digital: item.isDigital,
    }));

    // Step 1: Create the order
    const orderResult = await createOrder(orderData, orderItems);

    if (!orderResult.success || !orderResult.order) {
      if (orderResult.retryAfter) {
        const minutes = Math.ceil(orderResult.retryAfter / 60);
        setRateLimitMessage(`Too many orders. Please wait ${minutes} minutes before placing another order.`);
      }
      return;
    }

    // Step 2: Initialize Paystack payment
    const paymentResult = await initializePayment(
      formData.email,
      total,
      orderResult.order.id,
      {
        customer_name: formData.fullName,
        phone: formData.phone,
        order_number: orderResult.order.order_number,
      }
    );

    if (!paymentResult.success || !paymentResult.authorization_url) {
      toast.error(paymentResult.error || 'Failed to initialize payment');
      return;
    }

    // Store customer info for email after payment verification
    localStorage.setItem('checkout_customer', JSON.stringify({
      email: formData.email,
      name: formData.fullName,
    }));

    // Step 3: Redirect to Paystack payment page
    toast.info('Redirecting to payment...');
    window.location.href = paymentResult.authorization_url;
  };

  if (isVerifying) {
    return (
      <Layout>
        <div className="container-narrow py-16 text-center">
          <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin text-primary" />
          <h1 className="font-heading text-2xl font-bold mb-4">Verifying Payment...</h1>
          <p className="text-muted-foreground">Please wait while we confirm your payment.</p>
        </div>
      </Layout>
    );
  }

  if (items.length === 0 && !orderSuccess) {
    return (
      <Layout>
        <div className="container-narrow py-16 text-center">
          <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="font-heading text-2xl font-bold mb-4">Your Cart is Empty</h1>
          <Link to="/products">
            <Button>Browse Products</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  if (orderSuccess) {
    return (
      <Layout>
        <div className="container-narrow py-16 text-center">
          <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
          <h1 className="font-heading text-2xl font-bold mb-4">Payment Successful!</h1>
          <p className="text-muted-foreground mb-2">Your order number is:</p>
          <p className="font-mono text-xl font-bold mb-6">{orderSuccess.orderNumber}</p>
          <p className="text-muted-foreground mb-8">
            We'll send a confirmation email with tracking details once your order ships.
          </p>
          <Link to="/products">
            <Button>Continue Shopping</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container-narrow py-8">
        <h1 className="font-heading text-3xl font-bold mb-8">Checkout</h1>

        {rateLimitMessage && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{rateLimitMessage}</AlertDescription>
          </Alert>
        )}

        {(orderError || paymentError) && !rateLimitMessage && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{orderError || paymentError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="John Doe"
                      className={validationErrors.fullName ? 'border-destructive' : ''}
                    />
                    {validationErrors.fullName && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.fullName}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="john@example.com"
                      className={validationErrors.email ? 'border-destructive' : ''}
                    />
                    {validationErrors.email && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.email}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+234 800 123 4567"
                      className={validationErrors.phone ? 'border-destructive' : ''}
                    />
                    {validationErrors.phone && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.phone}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Shipping Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="addressLine1">Address Line 1 *</Label>
                    <Input
                      id="addressLine1"
                      name="addressLine1"
                      value={formData.addressLine1}
                      onChange={handleInputChange}
                      placeholder="123 Main Street"
                      className={validationErrors.addressLine1 ? 'border-destructive' : ''}
                    />
                    {validationErrors.addressLine1 && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.addressLine1}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="addressLine2">Address Line 2</Label>
                    <Input
                      id="addressLine2"
                      name="addressLine2"
                      value={formData.addressLine2}
                      onChange={handleInputChange}
                      placeholder="Apartment, suite, etc."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="Lagos"
                        className={validationErrors.city ? 'border-destructive' : ''}
                      />
                      {validationErrors.city && (
                        <p className="text-sm text-destructive mt-1">{validationErrors.city}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        placeholder="Lagos"
                        className={validationErrors.state ? 'border-destructive' : ''}
                      />
                      {validationErrors.state && (
                        <p className="text-sm text-destructive mt-1">{validationErrors.state}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      placeholder="100001"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Order Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Special instructions for delivery..."
                    rows={3}
                  />
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="flex-1">
                        {item.name}
                        {item.variantName && <span className="text-muted-foreground"> ({item.variantName})</span>}
                        <span className="text-muted-foreground"> x {item.quantity}</span>
                      </span>
                      <span>{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Shipping</span>
                      <span>{formatPrice(SHIPPING_COST)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                      <span>Total</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pay with Paystack - {formatPrice(total)}
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z"/>
                    </svg>
                    <span>Secure payment powered by Paystack</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default Checkout;
