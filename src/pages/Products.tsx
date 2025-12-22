import React from 'react';
import Layout from '@/components/layout/Layout';
import { useProducts } from '@/hooks/useProducts';
import ProductCard from '@/components/products/ProductCard';
import { Package } from 'lucide-react';

const Products: React.FC = () => {
  const { data: products, isLoading } = useProducts();

  return (
    <Layout>
      <div className="container-wide py-8">
        <h1 className="font-heading text-3xl font-bold mb-8">All Products</h1>
        
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No products available yet.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Products;