import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useProduct } from '@/hooks/useProducts';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Package, Minus, Plus, ArrowLeft, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import ProductReviewsSection from '@/components/reviews/ProductReviewsSection';
const ProductDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading } = useProduct(slug || '');
  const { addItem } = useCart();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(price);
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      image: product.images?.[0],
      isDigital: product.product_type === 'digital',
    });
    
    toast({ title: 'Added to cart', description: `${product.name} x ${quantity}` });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container-wide py-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="aspect-square bg-muted animate-pulse rounded-lg" />
            <div className="space-y-4">
              <div className="h-8 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-6 bg-muted animate-pulse rounded w-1/4" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container-wide py-16 text-center">
          <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
          <Link to="/products">
            <Button>Browse Products</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const stockInfo = product.inventory?.[0];
  const inStock = stockInfo ? stockInfo.quantity > 0 : true;

  return (
    <Layout>
      <div className="container-wide py-8">
        <Link to="/products" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Products
        </Link>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Image */}
          <div className="aspect-square bg-muted rounded-lg overflow-hidden">
            {product.images?.[0] ? (
              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-24 w-24 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              {product.category && (
                <p className="text-sm text-muted-foreground mb-2">{product.category.name}</p>
              )}
              <h1 className="font-heading text-3xl font-bold">{product.name}</h1>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-heading text-3xl font-bold">{formatPrice(product.price)}</span>
              {product.compare_at_price && product.compare_at_price > product.price && (
                <span className="text-xl text-muted-foreground line-through">{formatPrice(product.compare_at_price)}</span>
              )}
            </div>

            <div className="flex gap-2">
              {product.product_type === 'digital' && <Badge>Digital Product</Badge>}
              {!inStock && <Badge variant="destructive">Out of Stock</Badge>}
            </div>

            {product.description && (
              <p className="text-muted-foreground">{product.description}</p>
            )}

            {/* Quantity & Add to Cart */}
            <div className="flex items-center gap-4">
              <div className="flex items-center border rounded-md">
                <Button variant="ghost" size="icon" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button variant="ghost" size="icon" onClick={() => setQuantity(q => q + 1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button size="lg" className="flex-1 gap-2" onClick={handleAddToCart} disabled={!inStock}>
                <ShoppingCart className="h-5 w-5" />
                {inStock ? 'Add to Cart' : 'Out of Stock'}
              </Button>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <Separator className="my-12" />
        <ProductReviewsSection productId={product.id} />
      </div>
    </Layout>
  );
};

export default ProductDetail;