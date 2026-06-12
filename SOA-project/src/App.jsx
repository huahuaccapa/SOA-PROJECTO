import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navbar from './components/Layout/Navbar'
import ProtectedRoute from './components/Layout/ProtectedRoute'
import HomePage from './pages/HomePage'
import ProductsPage from './pages/ProductsPage'
import ProductDetailPage from './pages/ProductDetailPage'
import CheckoutPage from './pages/CheckoutPage'
import OrdersPage from './pages/OrdersPage'
import AdminPage from './pages/AdminPage'
import ProfilePage from './pages/ProfilePage'
import VendorPanel from './pages/VendorPanel'
import ChangePasswordPage from './pages/ChangePasswordPage'
import Login from './components/Auth/Login'
import Register from './components/Auth/Register'
import { Toaster } from 'react-hot-toast'

function App() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  return (
    <div className="min-h-screen relative">
      <Navbar />
      <main className="container mx-auto px-4 py-8 relative z-10">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/profile" element={
            <ProtectedRoute allowedRoles={['COMPRADOR', 'VENDEDOR', 'ADMIN']}>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="/vendor" element={
            <ProtectedRoute allowedRoles={['VENDEDOR']}>
              <VendorPanel />
            </ProtectedRoute>
          } />
          <Route path="/checkout" element={
            <ProtectedRoute allowedRoles={['COMPRADOR', 'ADMIN']}>
              <CheckoutPage />
            </ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute allowedRoles={['COMPRADOR', 'ADMIN']}>
              <OrdersPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminPage />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'rgba(15, 15, 35, 0.95)',
            backdropFilter: 'blur(10px)',
            color: '#00d4ff',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '12px',
            boxShadow: '0 0 20px rgba(0, 212, 255, 0.2)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  )
}

export default App