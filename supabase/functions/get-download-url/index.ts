import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const downloadRequestSchema = z.object({
  productId: z.string()
    .uuid({ message: "Invalid product ID format" })
    .optional(),
  orderItemId: z.string()
    .uuid({ message: "Invalid order item ID format" })
    .optional(),
}).refine(
  (data) => data.productId || data.orderItemId,
  { message: "Either productId or orderItemId is required" }
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get the authorization header to identify the user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.log('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a client with the user's JWT to verify their identity
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.log('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Download request from user: ${user.id}`);

    // Parse and validate request body
    const rawBody = await req.json();
    const validationResult = downloadRequestSchema.safeParse(rawBody);

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }));
      console.error('Validation failed:', errors);
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { productId, orderItemId } = validationResult.data;

    // Create admin client to query across tables
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // First, get the customer record for this user
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (customerError) {
      console.error('Error fetching customer:', customerError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify customer' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!customer) {
      console.log('No customer record found for user:', user.id);
      return new Response(
        JSON.stringify({ error: 'No purchase history found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the query to find the purchased digital product
    let orderItemQuery = supabaseAdmin
      .from('order_items')
      .select(`
        id,
        product_id,
        product_name,
        is_digital,
        order:orders!inner(
          id,
          customer_id,
          payment_status,
          status
        )
      `)
      .eq('is_digital', true)
      .eq('order.customer_id', customer.id)
      .eq('order.payment_status', 'paid');

    // Filter by either productId or orderItemId
    if (orderItemId) {
      orderItemQuery = orderItemQuery.eq('id', orderItemId);
    } else if (productId) {
      orderItemQuery = orderItemQuery.eq('product_id', productId);
    }

    const { data: orderItems, error: orderItemsError } = await orderItemQuery;

    if (orderItemsError) {
      console.error('Error fetching order items:', orderItemsError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify purchase' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!orderItems || orderItems.length === 0) {
      console.log('No paid order found for product:', productId || orderItemId);
      return new Response(
        JSON.stringify({ error: 'You have not purchased this product or payment is pending' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the product_id from the first matching order item
    const purchasedProductId = orderItems[0].product_id;
    
    if (!purchasedProductId) {
      console.log('Order item has no associated product_id');
      return new Response(
        JSON.stringify({ error: 'Product not found for this order item' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Now fetch the digital_file_url from the products table (using admin to access all columns)
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, name, digital_file_url, product_type')
      .eq('id', purchasedProductId)
      .maybeSingle();

    if (productError) {
      console.error('Error fetching product:', productError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch product details' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!product) {
      console.log('Product not found:', purchasedProductId);
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (product.product_type !== 'digital') {
      return new Response(
        JSON.stringify({ error: 'This is not a digital product' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!product.digital_file_url) {
      console.log('No download URL configured for product:', product.id);
      return new Response(
        JSON.stringify({ error: 'Download not available for this product' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Providing download URL for product ${product.name} to user ${user.id}`);

    // Return the download URL
    return new Response(
      JSON.stringify({
        success: true,
        product: {
          id: product.id,
          name: product.name,
        },
        downloadUrl: product.digital_file_url,
        message: 'Download URL retrieved successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in get-download-url function:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
