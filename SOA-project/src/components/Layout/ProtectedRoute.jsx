import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading, isInvitado } = useAuth()

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    )
  }

  // Si es invitado y la ruta requiere autenticación, redirigir a login
  if (isInvitado && allowedRoles.length > 0) {
    // Guardar la ruta a la que quería acceder
    sessionStorage.setItem('redirectAfterLogin', window.location.pathname)
    return <Navigate to="/login" replace />
  }

  if (!isAuthenticated && allowedRoles.length > 0) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.rol)) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute