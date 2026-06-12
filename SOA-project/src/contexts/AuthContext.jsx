import React, { createContext, useState, useContext, useEffect } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('jwt'))

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const storedToken = localStorage.getItem('jwt')
    
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    } else {
      // Usuario invitado
      setUser({
        id: 0,
        nombre: 'Invitado',
        email: 'invitado@byteverse.com',
        rol: 'INVITADO',
        activo: true
      })
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    try {
      const response = await authService.login({ email, password })
      
      if (response.success) {
        setUser(response.user)
        setToken(response.token)
        localStorage.setItem('jwt', response.token)
        localStorage.setItem('user', JSON.stringify(response.user))
        
        // Verificar si hay redirección pendiente
        const redirectTo = sessionStorage.getItem('redirectAfterLogin')
        if (redirectTo) {
          sessionStorage.removeItem('redirectAfterLogin')
          return { success: true, redirectTo }
        }
        return { success: true }
      }
      return { success: false, error: 'Credenciales inválidas' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const loginWithGoogle = async (googleToken) => {
    try {
      const response = await authService.googleLogin(googleToken)
      
      if (response.success) {
        setUser(response.user)
        setToken(response.token)
        localStorage.setItem('jwt', response.token)
        localStorage.setItem('user', JSON.stringify(response.user))
        return { success: true }
      }
      return { success: false, error: 'Error con Google' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const register = async (userData) => {
    try {
      const response = await authService.register(userData)
      
      if (response.success) {
        return { success: true }
      }
      return { success: false, error: response.error }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const updateUser = async (userData) => {
    try {
      const updatedUser = { ...user, ...userData }
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const logout = () => {
    setUser({
      id: 0,
      nombre: 'Invitado',
      email: 'invitado@byteverse.com',
      rol: 'INVITADO',
      activo: true
    })
    setToken(null)
    localStorage.removeItem('jwt')
    localStorage.removeItem('user')
    authService.logout()
  }

  const value = {
    user,
    token,
    loading,
    login,
    loginWithGoogle,
    register,
    logout,
    updateUser,
    isAuthenticated: user?.rol !== 'INVITADO' && !!user?.id,
    isAdmin: user?.rol === 'ADMIN',
    isVendedor: user?.rol === 'VENDEDOR',
    isComprador: user?.rol === 'COMPRADOR',
    isInvitado: user?.rol === 'INVITADO',
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}