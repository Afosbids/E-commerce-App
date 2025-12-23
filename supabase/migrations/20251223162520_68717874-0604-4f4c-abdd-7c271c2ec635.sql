-- Create audit_logs table for tracking admin actions
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only service role can insert (via Edge Functions or triggers)
CREATE POLICY "Service role can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (false);

-- Create index for common queries
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- Create function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  is_admin BOOLEAN;
BEGIN
  -- Get the current user
  current_user_id := auth.uid();
  
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = current_user_id AND role = 'admin'
  ) INTO is_admin;
  
  -- Only log if user is admin
  IF is_admin THEN
    IF TG_OP = 'UPDATE' THEN
      INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
      VALUES (current_user_id, TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF TG_OP = 'DELETE' THEN
      INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values)
      VALUES (current_user_id, TG_OP, TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    ELSIF TG_OP = 'INSERT' THEN
      INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
      VALUES (current_user_id, TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create triggers for admin-managed tables

-- Orders table (status changes)
CREATE TRIGGER audit_orders_changes
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.log_admin_action();

-- Product reviews (moderation)
CREATE TRIGGER audit_reviews_changes
AFTER UPDATE OR DELETE ON public.product_reviews
FOR EACH ROW
EXECUTE FUNCTION public.log_admin_action();

-- Products (admin management)
CREATE TRIGGER audit_products_changes
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.log_admin_action();

-- Categories (admin management)
CREATE TRIGGER audit_categories_changes
AFTER INSERT OR UPDATE OR DELETE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.log_admin_action();

-- Inventory (admin management)
CREATE TRIGGER audit_inventory_changes
AFTER UPDATE ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION public.log_admin_action();

-- Shipping zones (admin management)
CREATE TRIGGER audit_shipping_zones_changes
AFTER INSERT OR UPDATE OR DELETE ON public.shipping_zones
FOR EACH ROW
EXECUTE FUNCTION public.log_admin_action();

-- User roles (admin management)
CREATE TRIGGER audit_user_roles_changes
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.log_admin_action();