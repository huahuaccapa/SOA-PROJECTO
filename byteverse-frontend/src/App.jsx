import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';

// Pages
import Home from './components/visitor/Home';
import Products from './components/visitor/Products';
import ProductDetail from './components/visitor/ProductDetail';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Cart from './components/buyer/Cart';
import Checkout from './components/buyer/Checkout';
import Orders from './components/buyer/Orders';
import VendorDashboard from './components/vendor/VendorDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import NotFound from './components/common/NotFound';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Buyer Routes */}
              <Route path="/cart" element={
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              } />
              <Route path="/checkout" element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              } />
              <Route path="/orders" element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              } />
              
              {/* Vendor Routes */}
              <Route path="/vendor" element={
                <ProtectedRoute roles={['VENDEDOR', 'ADMIN']}>
                  <VendorDashboard />
                </ProtectedRoute>
              } />
              <Route path="/vendor/products" element={
                <ProtectedRoute roles={['VENDEDOR', 'ADMIN']}>
                  <div className="p-8 text-center">
                    <h2 className="text-2xl font-bold">Mis Productos</h2>
                    <p className="text-gray-600 mt-2">Aquí gestionas tus productos</p>
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/vendor/orders" element={
                <ProtectedRoute roles={['VENDEDOR', 'ADMIN']}>
                  <div className="p-8 text-center">
                    <h2 className="text-2xl font-bold">Pedidos</h2>
                    <p className="text-gray-600 mt-2">Aquí ves los pedidos de tus productos</p>
                  </div>
                </ProtectedRoute>
              } />
              
              {/* Admin Routes */}
              <Route path="/admin" element={
                <ProtectedRoute roles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute roles={['ADMIN']}>
                  <div className="p-8 text-center">
                    <h2 className="text-2xl font-bold">Gestionar Usuarios</h2>
                    <p className="text-gray-600 mt-2">Administración de usuarios del sistema</p>
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/admin/products" element={
                <ProtectedRoute roles={['ADMIN']}>
                  <div className="p-8 text-center">
                    <h2 className="text-2xl font-bold">Gestionar Productos</h2>
                    <p className="text-gray-600 mt-2">Administración de productos</p>
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/admin/orders" element={
                <ProtectedRoute roles={['ADMIN']}>
                  <div className="p-8 text-center">
                    <h2 className="text-2xl font-bold">Pedidos</h2>
                    <p className="text-gray-600 mt-2">Todos los pedidos del sistema</p>
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/admin/analytics" element={
                <ProtectedRoute roles={['ADMIN']}>
                  <div className="p-8 text-center">
                    <h2 className="text-2xl font-bold">Analytics</h2>
                    <p className="text-gray-600 mt-2">Métricas y estadísticas del sistema</p>
                  </div>
                </ProtectedRoute>
              } />
              
              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#22c55e',
              },
            },
            error: {
              style: {
                background: '#ef4444',
              },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;