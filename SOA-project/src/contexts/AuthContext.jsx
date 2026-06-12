//src\contexts\AuthContext.jsx
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
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    try {
      // Simulación de login con Google OAuth2
      const response = await authService.login({ email, password })
      
      if (response.success) {
        setUser(response.user)
        setToken(response.token)
        localStorage.setItem('jwt', response.token)
        localStorage.setItem('user', JSON.stringify(response.user))
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

  const logout = () => {
    setUser(null)
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
    isAuthenticated: !!user,
    isAdmin: user?.rol === 'ADMIN',
    isUser: user?.rol === 'USER',
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}