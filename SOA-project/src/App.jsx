import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
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
import Login from './components/Auth/Login'
import Register from './components/Auth/Register'
import { Toaster } from 'react-hot-toast'

function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
          style: {
            background: '#1a1a2e',
            color: '#00d4ff',
            border: '1px solid #00d4ff',
          },
        }}
      />
    </div>
  )
}

export default App