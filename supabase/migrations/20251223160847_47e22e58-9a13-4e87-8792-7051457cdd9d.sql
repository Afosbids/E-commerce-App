-- Create enum for review status
CREATE TYPE public.review_status AS ENUM ('pending', 'approved', 'rejected');

-- Create product reviews table
CREATE TABLE public.product_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 100),
  content TEXT NOT NULL CHECK (char_length(content) >= 10 AND char_length(content) <= 2000),
  status review_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one review per customer per product
  UNIQUE (product_id, customer_id)
);

-- Enable RLS
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved reviews
CREATE POLICY "Anyone can view approved reviews"
ON public.product_reviews
FOR SELECT
USING (status = 'approved');

-- Authenticated users can view their own reviews (any status)
CREATE POLICY "Users can view their own reviews"
ON public.product_reviews
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.customers
    WHERE customers.id = product_reviews.customer_id
    AND customers.user_id = auth.uid()
  )
);

-- Authenticated users can create reviews (if they purchased the product)
CREATE POLICY "Customers can create reviews for purchased products"
ON public.product_reviews
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.customers c
    JOIN public.orders o ON o.customer_id = c.id
    JOIN public.order_items oi ON oi.order_id = o.id
    WHERE c.id = product_reviews.customer_id
    AND c.user_id = auth.uid()
    AND oi.product_id = product_reviews.product_id
    AND o.payment_status = 'paid'
  )
);

-- Users can update their own pending reviews
CREATE POLICY "Users can update their pending reviews"
ON public.product_reviews
FOR UPDATE
USING (
  status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.customers
    WHERE customers.id = product_reviews.customer_id
    AND customers.user_id = auth.uid()
  )
);

-- Users can delete their own pending reviews
CREATE POLICY "Users can delete their pending reviews"
ON public.product_reviews
FOR DELETE
USING (
  status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.customers
    WHERE customers.id = product_reviews.customer_id
    AND customers.user_id = auth.uid()
  )
);

-- Admins can manage all reviews
CREATE POLICY "Admins can manage all reviews"
ON public.product_reviews
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_product_reviews_updated_at
BEFORE UPDATE ON public.product_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX idx_product_reviews_status ON public.product_reviews(status);
CREATE INDEX idx_product_reviews_customer_id ON public.product_reviews(customer_id);