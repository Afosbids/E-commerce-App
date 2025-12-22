import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useProducts } from '@/hooks/useProducts';
import { ArrowRight, Package, Truck, Shield, Zap } from 'lucide-react';
import ProductCard from '@/components/products/ProductCard';

const Index: React.FC = () => {
  const { data: featuredProducts, isLoading } = useProducts({ featured: true, limit: 4 });

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative bg-primary text-primary-foreground py-20 lg:py-32">
        <div className="container-wide">
          <div className="max-w-2xl">
            <h1 className="font-heading text-4xl lg:text-6xl font-bold mb-6 animate-fade-in">
              Premium Products for Modern Living
            </h1>
            <p className="text-lg lg:text-xl text-primary-foreground/80 mb-8 animate-slide-up">
              Discover our curated collection of quality physical and digital products. 
              Shop with confidence with secure payments and fast delivery.
            </p>
            <div className="flex flex-wrap gap-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <Link to="/products">
                <Button size="lg" variant="secondary" className="gap-2">
                  Shop Now <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/categories">
                <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                  Browse Categories
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/20 pointer-events-none" />
      </section>

      {/* Features */}
      <section className="py-12 border-b">
        <div className="container-wide">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Truck, title: 'Fast Delivery', desc: 'Nationwide shipping' },
              { icon: Shield, title: 'Secure Payments', desc: 'Paystack protected' },
              { icon: Package, title: 'Quality Products', desc: 'Curated selection' },
              { icon: Zap, title: 'Digital Delivery', desc: 'Instant downloads' },
            ].map((feature, i) => (
              <div key={i} className="text-center p-4">
                <feature.icon className="h-8 w-8 mx-auto mb-3 text-secondary" />
                <h3 className="font-heading font-semibold text-sm">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="container-wide">
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-heading text-2xl lg:text-3xl font-bold">Featured Products</h2>
            <Link to="/products" className="text-sm text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : featuredProducts && featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {featuredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No featured products yet. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-muted">
        <div className="container-narrow text-center">
          <h2 className="font-heading text-2xl lg:text-3xl font-bold mb-4">Ready to Start Shopping?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Create an account to track orders, save favorites, and checkout faster.
          </p>
          <Link to="/auth">
            <Button size="lg">Create Account</Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default Index;