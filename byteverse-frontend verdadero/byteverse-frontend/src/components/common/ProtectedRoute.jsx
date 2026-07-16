// src/components/common/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loading from './Loading';
import toast from 'react-hot-toast';

const ProtectedRoute = ({ children, roles = [], excludeRoles = [] }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    toast.error('⚠️ Debes iniciar sesión para acceder a esta página');
    return <Navigate to="/login" replace />;
  }

  // ✅ Verificar roles permitidos
  if (roles.length > 0 && !roles.includes(user?.role)) {
    toast.error('❌ No tienes permisos para acceder a esta sección');
    return <Navigate to="/" replace />;
  }

  // ✅ Verificar roles excluidos (ej: admin no puede comprar)
  if (excludeRoles.length > 0 && excludeRoles.includes(user?.role)) {
    toast.error('❌ No tienes permisos para acceder a esta sección');
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;