import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '@/hooks/useProducts';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const stockInfo = product.inventory?.[0];
  const inStock = stockInfo ? stockInfo.quantity > 0 : true;
  const lowStock = stockInfo && stockInfo.quantity <= stockInfo.low_stock_threshold && stockInfo.quantity > 0;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(price);
  };

  return (
    <Link to={`/products/${product.slug}`}>
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300">
        <div className="aspect-square relative bg-muted overflow-hidden">
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground/40" />
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.product_type === 'digital' && (
              <Badge variant="secondary" className="text-xs">Digital</Badge>
            )}
            {!inStock && (
              <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
            )}
            {lowStock && inStock && (
              <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">Low Stock</Badge>
            )}
            {product.compare_at_price && product.compare_at_price > product.price && (
              <Badge variant="secondary" className="text-xs">Sale</Badge>
            )}
          </div>
        </div>
        
        <CardContent className="p-4">
          {product.category && (
            <p className="text-xs text-muted-foreground mb-1">{product.category.name}</p>
          )}
          <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="font-heading font-semibold text-foreground">
              {formatPrice(product.price)}
            </span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.compare_at_price)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ProductCard;