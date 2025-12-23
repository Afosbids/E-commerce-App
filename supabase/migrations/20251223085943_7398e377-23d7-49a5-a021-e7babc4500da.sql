-- Add address_id column to orders table for normalized address storage
ALTER TABLE public.orders 
ADD COLUMN address_id UUID REFERENCES public.addresses(id);

-- Create index for better query performance
CREATE INDEX idx_orders_address_id ON public.orders(address_id);

-- Add comment to document the deprecation of shipping_address JSONB
COMMENT ON COLUMN public.orders.shipping_address IS 'DEPRECATED: Use address_id foreign key instead. This column is kept for backward compatibility with existing orders.';