import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Mail, Phone, MapPin } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container-wide py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <Package className="h-7 w-7" />
              <span className="font-heading text-xl font-bold">ShopPro</span>
            </Link>
            <p className="text-sm text-primary-foreground/80">
              Your trusted destination for quality products. Shop with confidence.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/products" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link to="/categories" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Categories
                </Link>
              </li>
              <li>
                <Link to="/cart" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Shopping Cart
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Customer Service</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/orders" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Track Order
                </Link>
              </li>
              <li>
                <Link to="/shipping" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link to="/returns" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Returns & Refunds
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-primary-foreground/80">
                <Mail className="h-4 w-4" />
                <span>support@shoppro.com</span>
              </li>
              <li className="flex items-center gap-2 text-primary-foreground/80">
                <Phone className="h-4 w-4" />
                <span>+234 800 123 4567</span>
              </li>
              <li className="flex items-center gap-2 text-primary-foreground/80">
                <MapPin className="h-4 w-4" />
                <span>Lagos, Nigeria</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-primary-foreground/20 text-center text-sm text-primary-foreground/60">
          <p>&copy; {new Date().getFullYear()} ShopPro. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;