import React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import DashboardHome from './DashboardHome';
import ProductsList from './ProductsList';
import ProductForm from './ProductForm';
import OrdersList from './OrdersList';
import InventoryList from './InventoryList';
import CategoriesList from './CategoriesList';
import CustomersList from './CustomersList';
import ShippingZones from './ShippingZones';
import ReviewsList from './ReviewsList';

const AdminDashboard: React.FC = () => {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <AdminHeader />
        <main className="flex-1 p-6 overflow-auto">
          <Routes>
            <Route index element={<DashboardHome />} />
            <Route path="products" element={<ProductsList />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id/edit" element={<ProductForm />} />
            <Route path="categories" element={<CategoriesList />} />
            <Route path="orders" element={<OrdersList />} />
            <Route path="inventory" element={<InventoryList />} />
            <Route path="customers" element={<CustomersList />} />
            <Route path="shipping" element={<ShippingZones />} />
            <Route path="reviews" element={<ReviewsList />} />
            <Route path="settings" element={<div className="text-muted-foreground">Settings coming soon</div>} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;