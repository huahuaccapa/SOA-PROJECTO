import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';

// ✅ COMPONENTES PÚBLICOS
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import Home from './components/visitor/Home';
import Products from './components/visitor/Products';
import ProductDetail from './components/visitor/ProductDetail';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import NotFound from './components/common/NotFound';

// ✅ COMPONENTES COMPRADOR
import Cart from './components/buyer/Cart';
import Checkout from './components/buyer/Checkout';
import Orders from './components/buyer/Orders';

// ✅ COMPONENTES VENDEDOR
import VendorDashboard from './components/vendor/VendorDashboard';

// ✅ COMPONENTES ADMIN
import AdminDashboard from './components/admin/AdminDashboard';
import AdminUsers from './components/admin/AdminUsers';
import AdminProducts from './components/admin/AdminProducts';
import AdminOrders from './components/admin/AdminOrders';
import AdminVendors from './components/admin/AdminVendors';
import AdminCategories from './components/admin/AdminCategories';
import AdminProfile from './components/admin/AdminProfile';
import AdminRevenue from './components/admin/AdminRevenue';
import AdminAnalytics from './components/admin/AdminAnalytics';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              {/* ✅ RUTAS PÚBLICAS */}
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* ✅ RUTAS COMPRADOR (Excluir Admin) */}
              <Route path="/cart" element={
                <ProtectedRoute excludeRoles={['ADMIN']}>
                  <Cart />
                </ProtectedRoute>
              } />
              <Route path="/checkout" element={
                <ProtectedRoute excludeRoles={['ADMIN']}>
                  <Checkout />
                </ProtectedRoute>
              } />
              <Route path="/orders" element={
                <ProtectedRoute excludeRoles={['ADMIN']}>
                  <Orders />
                </ProtectedRoute>
              } />
              
              {/* ✅ RUTAS VENDEDOR */}
              <Route path="/vendor" element={
                <ProtectedRoute roles={['VENDEDOR', 'ADMIN']}>
                  <VendorDashboard />
                </ProtectedRoute>
              } />
              
              {/* ✅ RUTAS ADMIN */}
              <Route path="/admin" element={
                <ProtectedRoute roles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute roles={['ADMIN']}>
                  <AdminUsers />
                </ProtectedRoute>
              } />
              <Route path="/admin/vendors" element={
                <ProtectedRoute roles={['ADMIN']}>
                  <AdminVendors />
                </ProtectedRoute>
              } />
              <Route path="/admin/products" element={
                <ProtectedRoute roles={['ADMIN']}>
                  <AdminProducts />
                </ProtectedRoute>
              } />
              <Route path="/admin/orders" element={
                <ProtectedRoute roles={['ADMIN']}>
                  <AdminOrders />
                </ProtectedRoute>
              } />
              <Route path="/admin/categories" element={
                <ProtectedRoute roles={['ADMIN']}>
                  <AdminCategories />
                </ProtectedRoute>
              } />
              <Route path="/admin/profile" element={
                <ProtectedRoute roles={['ADMIN']}>
                  <AdminProfile />
                </ProtectedRoute>
              } />
              {/* ✅ NUEVAS RUTAS ADMIN */}
              <Route path="/admin/revenue" element={
                <ProtectedRoute roles={['ADMIN']}>
                  <AdminRevenue />
                </ProtectedRoute>
              } />
              <Route path="/admin/analytics" element={
                <ProtectedRoute roles={['ADMIN']}>
                  <AdminAnalytics />
                </ProtectedRoute>
              } />
              
              {/* ✅ 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;