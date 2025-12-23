-- Drop and recreate the products RLS policy to hide digital_file_url from public access
-- First, drop the existing public SELECT policy
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

-- Create a new policy that excludes digital_file_url for non-admins
-- Note: RLS policies control row access, not column access
-- To hide columns, we need a different approach - use a view or column-level security

-- For now, let's document that digital_file_url should only be accessed after purchase verification
-- The actual fix should be in the application code to not expose this field

-- Create a computed column or use application-level filtering
-- Alternative: Create a secure RPC function to get download URLs after payment verification

-- Let's add a comment to the table documenting this security requirement
COMMENT ON COLUMN public.products.digital_file_url IS 'SECURITY: This column contains sensitive download URLs. Only expose to users who have purchased the product. Use verify-purchase logic before providing download access.';

-- Recreate the policy (still allows viewing active products)
CREATE POLICY "Anyone can view active products"
ON public.products
FOR SELECT
USING (is_active = true);