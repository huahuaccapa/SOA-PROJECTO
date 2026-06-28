import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import VendorDashboardPage from './pages/VendorDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import NotFoundPage from './pages/NotFoundPage';

// Vendor Pages (placeholder)
const VendorProductsPage = () => <div className="p-8"><h2 className="text-2xl font-bold">Mis Productos</h2></div>;
const VendorOrdersPage = () => <div className="p-8"><h2 className="text-2xl font-bold">Pedidos</h2></div>;

// Admin Pages (placeholder)
const AdminUsersPage = () => <div className="p-8"><h2 className="text-2xl font-bold">Gestionar Usuarios</h2></div>;
const AdminProductsPage = () => <div className="p-8"><h2 className="text-2xl font-bold">Gestionar Productos</h2></div>;
const AdminOrdersPage = () => <div className="p-8"><h2 className="text-2xl font-bold">Pedidos</h2></div>;
const AdminAnalyticsPage = () => <div className="p-8"><h2 className="text-2xl font-bold">Analytics</h2></div>;

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      // Public Routes
      { index: true, element: <HomePage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'product/:id', element: <ProductDetailPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      
      // Buyer Routes (Authenticated)
      {
        path: 'cart',
        element: (
          <ProtectedRoute>
            <CartPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'checkout',
        element: (
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'orders',
        element: (
          <ProtectedRoute>
            <OrdersPage />
          </ProtectedRoute>
        )
      },
      
      // Vendor Routes
      {
        path: 'vendor',
        element: (
          <ProtectedRoute roles={['VENDEDOR', 'ADMIN']}>
            <VendorDashboardPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'vendor/products',
        element: (
          <ProtectedRoute roles={['VENDEDOR', 'ADMIN']}>
            <VendorProductsPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'vendor/orders',
        element: (
          <ProtectedRoute roles={['VENDEDOR', 'ADMIN']}>
            <VendorOrdersPage />
          </ProtectedRoute>
        )
      },
      
      // Admin Routes
      {
        path: 'admin',
        element: (
          <ProtectedRoute roles={['ADMIN']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'admin/users',
        element: (
          <ProtectedRoute roles={['ADMIN']}>
            <AdminUsersPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'admin/products',
        element: (
          <ProtectedRoute roles={['ADMIN']}>
            <AdminProductsPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'admin/orders',
        element: (
          <ProtectedRoute roles={['ADMIN']}>
            <AdminOrdersPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'admin/analytics',
        element: (
          <ProtectedRoute roles={['ADMIN']}>
            <AdminAnalyticsPage />
          </ProtectedRoute>
        )
      },
      
      // 404
      { path: '*', element: <NotFoundPage /> }
    ]
  }
]);