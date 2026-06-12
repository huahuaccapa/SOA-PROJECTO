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
    const initAuth = async () => {
      const storedUser = localStorage.getItem('user')
      const storedToken = localStorage.getItem('jwt')
      
      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser)
          setToken(storedToken)
          setUser(parsedUser)
        } catch (error) {
          console.error('Error parsing user data:', error)
          localStorage.removeItem('jwt')
          localStorage.removeItem('user')
          setUser({
            id: 0,
            nombre: 'Invitado',
            email: 'invitado@byteverse.com',
            rol: 'INVITADO',
            activo: true
          })
        }
      } else {
        setUser({
          id: 0,
          nombre: 'Invitado',
          email: 'invitado@byteverse.com',
          rol: 'INVITADO',
          activo: true
        })
      }
      setLoading(false)
    }
    
    initAuth()
  }, [])

  const login = async (email, password) => {
    try {
      const response = await authService.login({ email, password })
      
      if (response.success) {
        // Verificar si el usuario necesita cambiar contraseña
        if (response.needPasswordChange) {
          return { 
            success: true, 
            needPasswordChange: true, 
            userId: response.user.id,
            email: response.user.email
          }
        }
        
        setUser(response.user)
        setToken(response.token)
        localStorage.setItem('jwt', response.token)
        localStorage.setItem('user', JSON.stringify(response.user))
        
        const redirectTo = sessionStorage.getItem('redirectAfterLogin')
        if (redirectTo) {
          sessionStorage.removeItem('redirectAfterLogin')
          return { success: true, redirectTo }
        }
        return { success: true }
      }
      return { success: false, error: response.error || 'Credenciales inválidas' }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Error de conexión' }
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
      return { success: false, error: response.error || 'Error con Google' }
    } catch (error) {
      console.error('Google login error:', error)
      return { success: false, error: 'Error al conectar con Google' }
    }
  }

  const register = async (userData) => {
    try {
      const response = await authService.register(userData)
      
      if (response.success) {
        return { success: true }
      }
      return { success: false, error: response.error || 'Error al registrar' }
    } catch (error) {
      console.error('Register error:', error)
      return { success: false, error: 'Error de conexión' }
    }
  }

  const updateUser = async (userData) => {
    try {
      const updatedUser = { ...user, ...userData }
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
      return { success: true }
    } catch (error) {
      console.error('Update user error:', error)
      return { success: false, error: error.message }
    }
  }

  const updatePassword = async (email, userId, newPassword) => {
    try {
      const response = await authService.updatePassword(email, userId, newPassword)
      if (response.success) {
        return { success: true }
      }
      return { success: false, error: response.error }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const requestPasswordReset = async (email) => {
    try {
      const response = await authService.requestPasswordReset(email)
      return response
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const verifyResetCode = async (email, code) => {
    try {
      const response = await authService.verifyResetCode(email, code)
      return response
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const resetPassword = async (email, newPassword) => {
    try {
      const response = await authService.resetPassword(email, newPassword)
      return response
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
    updatePassword,
    requestPasswordReset,
    verifyResetCode,
    resetPassword,
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