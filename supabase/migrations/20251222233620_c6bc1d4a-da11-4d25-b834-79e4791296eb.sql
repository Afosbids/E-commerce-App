-- Fix security issue #1: Add database constraints for input validation
-- Fix security issue #2: Tighten order/customer creation with validation triggers

-- Add CHECK constraints for input validation on products
ALTER TABLE public.products 
ADD CONSTRAINT products_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
ADD CONSTRAINT products_slug_length CHECK (char_length(slug) >= 1 AND char_length(slug) <= 255),
ADD CONSTRAINT products_price_positive CHECK (price >= 0),
ADD CONSTRAINT products_compare_price_positive CHECK (compare_at_price IS NULL OR compare_at_price >= 0);

-- Add CHECK constraints for categories
ALTER TABLE public.categories 
ADD CONSTRAINT categories_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
ADD CONSTRAINT categories_slug_length CHECK (char_length(slug) >= 1 AND char_length(slug) <= 255);

-- Add CHECK constraints for shipping_zones
ALTER TABLE public.shipping_zones 
ADD CONSTRAINT shipping_zones_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
ADD CONSTRAINT shipping_zones_rate_positive CHECK (rate >= 0),
ADD CONSTRAINT shipping_zones_min_order_positive CHECK (min_order_amount IS NULL OR min_order_amount >= 0);

-- Add CHECK constraints for orders
ALTER TABLE public.orders 
ADD CONSTRAINT orders_subtotal_positive CHECK (subtotal >= 0),
ADD CONSTRAINT orders_shipping_positive CHECK (shipping_cost >= 0),
ADD CONSTRAINT orders_total_positive CHECK (total >= 0);

-- Add CHECK constraints for order_items
ALTER TABLE public.order_items 
ADD CONSTRAINT order_items_quantity_positive CHECK (quantity >= 1),
ADD CONSTRAINT order_items_unit_price_positive CHECK (unit_price >= 0),
ADD CONSTRAINT order_items_total_price_positive CHECK (total_price >= 0),
ADD CONSTRAINT order_items_product_name_length CHECK (char_length(product_name) >= 1 AND char_length(product_name) <= 255);

-- Add CHECK constraints for customers
ALTER TABLE public.customers 
ADD CONSTRAINT customers_email_length CHECK (char_length(email) >= 5 AND char_length(email) <= 255);

-- Create a validation function for order creation that verifies totals
CREATE OR REPLACE FUNCTION public.validate_order_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate that total equals subtotal + shipping
  IF NEW.total != NEW.subtotal + NEW.shipping_cost THEN
    RAISE EXCEPTION 'Order total must equal subtotal + shipping cost';
  END IF;
  
  -- Ensure customer_id references an existing customer if provided
  IF NEW.customer_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = NEW.customer_id) THEN
      RAISE EXCEPTION 'Invalid customer_id';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for order validation
DROP TRIGGER IF EXISTS validate_order_before_insert ON public.orders;
CREATE TRIGGER validate_order_before_insert
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.validate_order_totals();

-- Create a function to validate order items
CREATE OR REPLACE FUNCTION public.validate_order_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate that total_price equals unit_price * quantity
  IF NEW.total_price != NEW.unit_price * NEW.quantity THEN
    RAISE EXCEPTION 'Order item total_price must equal unit_price * quantity';
  END IF;
  
  -- Ensure order_id references an existing order
  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = NEW.order_id) THEN
    RAISE EXCEPTION 'Invalid order_id';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for order item validation
DROP TRIGGER IF EXISTS validate_order_item_before_insert ON public.order_items;
CREATE TRIGGER validate_order_item_before_insert
BEFORE INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.validate_order_item();

-- Add rate limiting tracking table for abuse prevention
CREATE TABLE IF NOT EXISTS public.rate_limit_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  action_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_action_time 
ON public.rate_limit_tracking(ip_address, action_type, created_at);

-- Enable RLS on rate_limit_tracking (only admin access)
ALTER TABLE public.rate_limit_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can manage rate limits"
ON public.rate_limit_tracking
FOR ALL
USING (false)
WITH CHECK (false);