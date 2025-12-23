import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit configuration
const RATE_LIMIT_WINDOW_MINUTES = 60;
const MAX_ORDERS_PER_WINDOW = 10;

// Input validation schemas
const shippingAddressSchema = z.object({
  address_line1: z.string().trim().min(1).max(255),
  address_line2: z.string().trim().max(255).optional().nullable(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  postal_code: z.string().trim().max(20).optional().nullable(),
  country: z.string().trim().min(1).max(100),
}).optional().nullable();

const orderItemSchema = z.object({
  product_id: z.string().uuid().optional().nullable(),
  product_name: z.string().trim().min(1).max(255),
  variant_id: z.string().uuid().optional().nullable(),
  variant_name: z.string().trim().max(255).optional().nullable(),
  quantity: z.number().int().positive().max(1000),
  unit_price: z.number().nonnegative().max(100000000),
  is_digital: z.boolean().optional().default(false),
});

const orderSchema = z.object({
  subtotal: z.number().nonnegative().max(100000000),
  shipping_cost: z.number().nonnegative().max(10000000).optional().default(0),
  total: z.number().nonnegative().max(100000000),
  shipping_address: shippingAddressSchema,
  notes: z.string().trim().max(1000).optional().nullable(),
});

const createOrderSchema = z.object({
  order: orderSchema,
  orderItems: z.array(orderItemSchema).min(1).max(100),
  customerId: z.string().uuid().optional().nullable(),
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for rate limit tracking (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get client IP for rate limiting
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';
    
    console.log(`Order creation request from IP: ${clientIp}`);
    
    // Check rate limit
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
    
    const { count: requestCount, error: countError } = await supabaseAdmin
      .from('rate_limit_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', clientIp)
      .eq('action_type', 'order_creation')
      .gte('created_at', windowStart);
    
    if (countError) {
      console.error('Error checking rate limit:', countError);
      // Continue with order creation if rate limit check fails
    } else if (requestCount !== null && requestCount >= MAX_ORDERS_PER_WINDOW) {
      console.log(`Rate limit exceeded for IP ${clientIp}: ${requestCount}/${MAX_ORDERS_PER_WINDOW} orders`);
      return new Response(
        JSON.stringify({ 
          error: 'Too many orders. Please wait before placing another order.',
          retryAfter: RATE_LIMIT_WINDOW_MINUTES * 60
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(RATE_LIMIT_WINDOW_MINUTES * 60)
          } 
        }
      );
    }
    
    // Parse and validate request body
    const rawBody = await req.json();
    const validationResult = createOrderSchema.safeParse(rawBody);

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }));
      console.error('Validation failed:', errors);
      return new Response(
        JSON.stringify({ error: 'Invalid order data', details: errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { order, orderItems, customerId } = validationResult.data;
    
    // Validate order totals
    const calculatedSubtotal = orderItems.reduce((sum, item) => 
      sum + (item.unit_price * item.quantity), 0);
    
    if (Math.abs(calculatedSubtotal - order.subtotal) > 0.01) {
      console.error('Subtotal mismatch:', { calculated: calculatedSubtotal, provided: order.subtotal });
      return new Response(
        JSON.stringify({ error: 'Order subtotal does not match item totals.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const calculatedTotal = order.subtotal + (order.shipping_cost || 0);
    if (Math.abs(calculatedTotal - order.total) > 0.01) {
      console.error('Total mismatch:', { calculated: calculatedTotal, provided: order.total });
      return new Response(
        JSON.stringify({ error: 'Order total does not match subtotal + shipping.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Record rate limit tracking entry (before creating order to prevent race conditions)
    const { error: trackingError } = await supabaseAdmin
      .from('rate_limit_tracking')
      .insert({
        ip_address: clientIp,
        action_type: 'order_creation'
      });
    
    if (trackingError) {
      console.error('Error recording rate limit:', trackingError);
      // Continue anyway - don't block order creation if tracking fails
    }
    
    // Create the order
    const orderData = {
      customer_id: customerId || null,
      subtotal: order.subtotal,
      shipping_cost: order.shipping_cost || 0,
      total: order.total,
      shipping_address: order.shipping_address || null,
      notes: order.notes || null,
      status: 'pending',
      payment_status: 'pending'
    };
    
    console.log('Creating order:', orderData);
    
    const { data: createdOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert(orderData)
      .select()
      .single();
    
    if (orderError) {
      console.error('Error creating order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Failed to create order. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Order created successfully:', createdOrder.id);
    
    // Create order items
    const itemsToInsert = orderItems.map((item) => ({
      order_id: createdOrder.id,
      product_id: item.product_id || null,
      product_name: item.product_name,
      variant_id: item.variant_id || null,
      variant_name: item.variant_name || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.unit_price * item.quantity,
      is_digital: item.is_digital || false
    }));
    
    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(itemsToInsert);
    
    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Order was created but items failed - return partial success
      return new Response(
        JSON.stringify({ 
          error: 'Order created but items failed to save. Contact support.',
          order: createdOrder 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Order ${createdOrder.order_number} created with ${itemsToInsert.length} items`);
    
    // Clean up old rate limit entries (async, don't wait)
    supabaseAdmin
      .from('rate_limit_tracking')
      .delete()
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .then(({ error }) => {
        if (error) console.error('Error cleaning up rate limits:', error);
        else console.log('Old rate limit entries cleaned up');
      });
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        order: createdOrder,
        message: 'Order created successfully'
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Unexpected error in create-order function:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
