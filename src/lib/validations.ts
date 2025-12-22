import { z } from 'zod';

// Product validation schema
export const productSchema = z.object({
  name: z.string()
    .min(1, 'Product name is required')
    .max(255, 'Product name must be less than 255 characters')
    .trim(),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(255, 'Slug must be less than 255 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .trim(),
  description: z.string().max(10000, 'Description too long').optional().nullable(),
  price: z.number()
    .min(0, 'Price must be positive')
    .max(999999999, 'Price too large'),
  compare_at_price: z.number()
    .min(0, 'Compare at price must be positive')
    .max(999999999, 'Compare at price too large')
    .optional()
    .nullable(),
  category_id: z.string().uuid().optional().nullable(),
  product_type: z.enum(['physical', 'digital']),
  is_active: z.boolean(),
  featured: z.boolean(),
  images: z.array(z.string().url()).max(20, 'Maximum 20 images allowed'),
  digital_file_url: z.string().url().optional().nullable().or(z.literal('')),
});

export type ProductFormData = z.infer<typeof productSchema>;

// Category validation schema
export const categorySchema = z.object({
  name: z.string()
    .min(1, 'Category name is required')
    .max(255, 'Category name must be less than 255 characters')
    .trim(),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(255, 'Slug must be less than 255 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .trim(),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
  image_url: z.string().url().optional().nullable().or(z.literal('')),
  parent_id: z.string().uuid().optional().nullable(),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

// Shipping zone validation schema
export const shippingZoneSchema = z.object({
  name: z.string()
    .min(1, 'Zone name is required')
    .max(255, 'Zone name must be less than 255 characters')
    .trim(),
  regions: z.array(z.string().trim().min(1).max(100))
    .min(1, 'At least one region is required')
    .max(100, 'Maximum 100 regions allowed'),
  rate: z.number()
    .min(0, 'Rate must be positive')
    .max(999999999, 'Rate too large'),
  min_order_amount: z.number()
    .min(0, 'Minimum order amount must be positive')
    .max(999999999, 'Amount too large')
    .optional()
    .nullable(),
  estimated_days: z.string().max(100, 'Estimated days too long').optional().nullable(),
  is_active: z.boolean(),
});

export type ShippingZoneFormData = z.infer<typeof shippingZoneSchema>;

// Order item validation schema
export const orderItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  variantId: z.string().uuid().optional().nullable(),
  productName: z.string()
    .min(1, 'Product name is required')
    .max(255, 'Product name too long'),
  variantName: z.string().max(255).optional().nullable(),
  quantity: z.number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(9999, 'Quantity too large'),
  unitPrice: z.number()
    .min(0, 'Unit price must be positive')
    .max(999999999, 'Unit price too large'),
  isDigital: z.boolean(),
});

// Order validation schema  
export const orderSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  items: z.array(orderItemSchema)
    .min(1, 'Order must have at least one item')
    .max(100, 'Maximum 100 items per order'),
  subtotal: z.number()
    .min(0, 'Subtotal must be positive')
    .max(999999999, 'Subtotal too large'),
  shippingCost: z.number()
    .min(0, 'Shipping cost must be positive')
    .max(999999999, 'Shipping cost too large'),
  total: z.number()
    .min(0, 'Total must be positive')
    .max(999999999, 'Total too large'),
  shippingAddress: z.record(z.string()).optional().nullable(),
}).refine(
  (data) => Math.abs(data.total - (data.subtotal + data.shippingCost)) < 0.01,
  { message: 'Total must equal subtotal + shipping cost', path: ['total'] }
);

export type OrderFormData = z.infer<typeof orderSchema>;

// Customer validation schema
export const customerSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .min(5, 'Email too short')
    .max(255, 'Email too long')
    .trim()
    .toLowerCase(),
  full_name: z.string()
    .max(255, 'Name too long')
    .trim()
    .optional()
    .nullable(),
  phone: z.string()
    .max(50, 'Phone number too long')
    .trim()
    .optional()
    .nullable(),
  is_guest: z.boolean().optional(),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

// Helper function to sanitize text for display (prevents XSS)
export const sanitizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Helper to parse regions string safely
export const parseRegions = (regionsString: string): string[] => {
  return regionsString
    .split(',')
    .map(r => r.trim())
    .filter(r => r.length > 0 && r.length <= 100)
    .slice(0, 100); // Max 100 regions
};
