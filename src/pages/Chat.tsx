import React from 'react';
import Layout from '@/components/layout/Layout';
import AIChatbot from '@/components/chat/AIChatbot';

const Chat: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">AI Chat Assistant</h1>
          <p className="text-muted-foreground">
            Chat with our AI assistant for help with products, orders, or any questions
          </p>
        </div>
        <AIChatbot />
      </div>
    </Layout>
  );
};

export default Chat;
