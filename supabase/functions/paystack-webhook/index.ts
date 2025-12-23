import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

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

const generateOrderEmailHtml = (
  orderNumber: string,
  items: OrderItem[],
  subtotal: number,
  shippingCost: number,
  total: number,
  shippingAddress: ShippingAddress
) => {
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        ${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatPrice(item.total_price)}</td>
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
      <title>Order Confirmation</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #10b981; margin-bottom: 8px;">✓ Order Confirmed!</h1>
        <p style="color: #6b7280; margin: 0;">Thank you for your purchase</p>
      </div>
      
      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0;"><strong>Order Number:</strong> ${orderNumber}</p>
      </div>
      
      <h2 style="font-size: 18px; margin-bottom: 16px;">Order Details</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Item</th>
            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 12px; text-align: right;">Subtotal:</td>
            <td style="padding: 12px; text-align: right;">${formatPrice(subtotal)}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 12px; text-align: right;">Shipping:</td>
            <td style="padding: 12px; text-align: right;">${formatPrice(shippingCost)}</td>
          </tr>
          <tr style="font-weight: bold; font-size: 18px;">
            <td colspan="2" style="padding: 12px; text-align: right; border-top: 2px solid #e5e7eb;">Total:</td>
            <td style="padding: 12px; text-align: right; border-top: 2px solid #e5e7eb;">${formatPrice(total)}</td>
          </tr>
        </tfoot>
      </table>
      
      <h2 style="font-size: 18px; margin-bottom: 16px;">Shipping Address</h2>
      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0;">${addressHtml}</p>
      </div>
      
      <div style="text-align: center; padding: 24px 0; border-top: 1px solid #e5e7eb; color: #6b7280;">
        <p style="margin: 0 0 8px 0;">We'll notify you when your order ships.</p>
        <p style="margin: 0; font-size: 14px;">Questions? Reply to this email for support.</p>
      </div>
    </body>
    </html>
  `;
};

// Verify Paystack webhook signature
async function verifyPaystackSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );
    
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex === signature;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

serve(async (req) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const webhookSecret = Deno.env.get('PAYSTACK_WEBHOOK_SECRET');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!webhookSecret) {
      console.error('PAYSTACK_WEBHOOK_SECRET not configured');
      return new Response('Webhook not configured', { status: 500 });
    }

    // Get the raw body and signature
    const payload = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    if (!signature) {
      console.error('Missing Paystack signature');
      return new Response('Missing signature', { status: 400 });
    }

    // Verify the webhook signature
    const isValid = await verifyPaystackSignature(payload, signature, webhookSecret);
    if (!isValid) {
      console.error('Invalid Paystack signature');
      return new Response('Invalid signature', { status: 401 });
    }

    const event = JSON.parse(payload);
    console.log(`Received Paystack webhook: ${event.event}`);

    // Only process charge.success events
    if (event.event !== 'charge.success') {
      console.log(`Ignoring event: ${event.event}`);
      return new Response('OK', { status: 200 });
    }

    const transaction = event.data;
    const reference = transaction.reference;
    const orderId = transaction.metadata?.order_id;
    const customerEmail = transaction.customer?.email;

    if (!orderId) {
      console.error('No order_id in transaction metadata');
      return new Response('Missing order_id', { status: 400 });
    }

    console.log(`Processing payment for order ${orderId}, reference: ${reference}`);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if order is already paid (prevent duplicate processing)
    const { data: existingOrder, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, payment_status, order_number')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching order:', fetchError);
      return new Response('Database error', { status: 500 });
    }

    if (!existingOrder) {
      console.error(`Order not found: ${orderId}`);
      return new Response('Order not found', { status: 404 });
    }

    if (existingOrder.payment_status === 'paid') {
      console.log(`Order ${orderId} already marked as paid, skipping`);
      return new Response('Already processed', { status: 200 });
    }

    // Update order status
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_reference: reference,
        status: 'confirmed',
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order:', updateError);
      return new Response('Update failed', { status: 500 });
    }

    console.log(`Order ${orderId} marked as paid via webhook`);

    // Send confirmation email if we have customer email
    if (resendApiKey && customerEmail) {
      try {
        // Fetch order items
        const { data: orderItems, error: itemsError } = await supabaseAdmin
          .from('order_items')
          .select('product_name, variant_name, quantity, unit_price, total_price')
          .eq('order_id', orderId);

        if (itemsError) {
          console.error('Error fetching order items:', itemsError);
        } else if (orderItems && orderItems.length > 0) {
          const resend = new Resend(resendApiKey);
          
          const emailHtml = generateOrderEmailHtml(
            updatedOrder.order_number,
            orderItems,
            updatedOrder.subtotal,
            updatedOrder.shipping_cost,
            updatedOrder.total,
            updatedOrder.shipping_address as ShippingAddress
          );

          const { error: emailError } = await resend.emails.send({
            from: 'Orders <onboarding@resend.dev>',
            to: [customerEmail],
            subject: `Order Confirmed - ${updatedOrder.order_number}`,
            html: emailHtml,
          });

          if (emailError) {
            console.error('Error sending confirmation email:', emailError);
          } else {
            console.log(`Confirmation email sent to ${customerEmail} via webhook`);
          }
        }
      } catch (emailErr) {
        console.error('Error in email sending:', emailErr);
        // Don't fail the webhook for email errors
      }
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
});
