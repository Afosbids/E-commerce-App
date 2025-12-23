import React from 'react';
import Header from './Header';
import Footer from './Footer';
import FloatingChatWidget from '@/components/chat/FloatingChatWidget';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingChatWidget />
    </div>
  );
};

export default Layout;