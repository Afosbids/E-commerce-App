import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderItem {
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface ShippingAddress {
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code?: string;
  country: string;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(price);
};

const generateShippedEmailHtml = (
  orderNumber: string,
  customerName: string,
  items: OrderItem[],
  shippingAddress: ShippingAddress,
  trackingNumber?: string
) => {
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        ${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
    </tr>
  `).join('');

  const addressHtml = `
    ${shippingAddress.address_line1}<br>
    ${shippingAddress.address_line2 ? `${shippingAddress.address_line2}<br>` : ''}
    ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postal_code || ''}<br>
    ${shippingAddress.country}
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Order Has Shipped!</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #3b82f6; margin-bottom: 8px;">📦 Your Order Has Shipped!</h1>
        <p style="color: #6b7280; margin: 0;">Great news! Your package is on its way.</p>
      </div>
      
      <div style="background: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #3b82f6;">
        <p style="margin: 0 0 8px 0;"><strong>Order Number:</strong> ${orderNumber}</p>
        <p style="margin: 0;"><strong>Customer:</strong> ${customerName}</p>
        ${trackingNumber ? `<p style="margin: 8px 0 0 0;"><strong>Tracking Number:</strong> ${trackingNumber}</p>` : ''}
      </div>
      
      <h2 style="font-size: 18px; margin-bottom: 16px;">Items in Your Package</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Item</th>
            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      
      <h2 style="font-size: 18px; margin-bottom: 16px;">Shipping To</h2>
      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0;">${addressHtml}</p>
      </div>
      
      <div style="text-align: center; padding: 24px 0; border-top: 1px solid #e5e7eb; color: #6b7280;">
        <p style="margin: 0 0 8px 0;">Your order should arrive within 3-5 business days.</p>
        <p style="margin: 0; font-size: 14px;">Questions? Reply to this email for support.</p>
      </div>
    </body>
    </html>
  `;
};

const generateDeliveredEmailHtml = (
  orderNumber: string,
  customerName: string
) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Order Has Been Delivered!</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #10b981; margin-bottom: 8px;">✅ Order Delivered!</h1>
        <p style="color: #6b7280; margin: 0;">Your order has been successfully delivered.</p>
      </div>
      
      <div style="background: #ecfdf5; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #10b981;">
        <p style="margin: 0 0 8px 0;"><strong>Order Number:</strong> ${orderNumber}</p>
        <p style="margin: 0;"><strong>Customer:</strong> ${customerName}</p>
      </div>
      
      <div style="text-align: center; margin-bottom: 24px;">
        <p style="font-size: 18px; margin-bottom: 16px;">We hope you love your purchase!</p>
        <p style="color: #6b7280;">If you have any issues with your order, please don't hesitate to reach out.</p>
      </div>
      
      <div style="text-align: center; padding: 24px 0; border-top: 1px solid #e5e7eb; color: #6b7280;">
        <p style="margin: 0; font-size: 14px;">Thank you for shopping with us!</p>
      </div>
    </body>
    </html>
  `;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { orderId, emailType, trackingNumber } = await req.json();

    if (!orderId || !emailType) {
      return new Response(
        JSON.stringify({ error: 'orderId and emailType are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['shipped', 'delivered'].includes(emailType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid emailType. Must be "shipped" or "delivered"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending ${emailType} email for order ${orderId}`);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch order with customer info
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        customer:customers(full_name, email, phone)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Error fetching order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customerEmail = order.customer?.email;
    const customerName = order.customer?.full_name || 'Valued Customer';

    if (!customerEmail) {
      return new Response(
        JSON.stringify({ error: 'Customer email not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch order items
    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select('product_name, variant_name, quantity, unit_price, total_price')
      .eq('order_id', orderId);

    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
    }

    const resend = new Resend(resendApiKey);
    let emailHtml: string;
    let subject: string;

    if (emailType === 'shipped') {
      emailHtml = generateShippedEmailHtml(
        order.order_number,
        customerName,
        orderItems || [],
        order.shipping_address as ShippingAddress,
        trackingNumber
      );
      subject = `Your Order ${order.order_number} Has Shipped!`;
    } else {
      emailHtml = generateDeliveredEmailHtml(
        order.order_number,
        customerName
      );
      subject = `Your Order ${order.order_number} Has Been Delivered!`;
    }

    const { error: emailError } = await resend.emails.send({
      from: 'Orders <onboarding@resend.dev>',
      to: [customerEmail],
      subject,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: emailError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`${emailType} email sent successfully to ${customerEmail}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${emailType.charAt(0).toUpperCase() + emailType.slice(1)} notification sent to ${customerEmail}`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending order email:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});