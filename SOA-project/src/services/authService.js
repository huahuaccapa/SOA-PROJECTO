import api from './api'

export const authService = {
  // Login de usuario
  async login(credentials) {
    try {
      console.log('🔐 Intentando login:', credentials.email)
      const response = await api.post('/auth/login', credentials)
      console.log('✅ Login exitoso:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Login error:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'Error al iniciar sesión'
      }
    }
  },

  // Registro de usuario
  async register(userData) {
    try {
      console.log('📝 Registrando usuario:', userData.email)
      const response = await api.post('/auth/register', userData)
      console.log('✅ Registro exitoso:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Registro error:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'Error al registrar usuario'
      }
    }
  },

  // Login con Google
  async googleLogin(googleToken) {
    try {
      const response = await api.post('/auth/google', { token: googleToken })
      return response.data
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al autenticar con Google'
      }
    }
  },

  // Verificar token
  async verifyToken() {
    try {
      const token = localStorage.getItem('jwt')
      if (!token) {
        return { valid: false }
      }
      const response = await api.get('/auth/verify')
      return response.data
    } catch (error) {
      console.error('❌ Token verification error:', error)
      return { valid: false }
    }
  },

  // Cambiar contraseña
  async updatePassword(email, userId, newPassword) {
    try {
      const response = await api.post('/auth/change-password', {
        email,
        userId,
        newPassword
      })
      return response.data
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al cambiar contraseña'
      }
    }
  },

  // Solicitar reset de contraseña
  async requestPasswordReset(email) {
    try {
      const response = await api.post('/auth/request-reset', { email })
      return response.data
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al solicitar reset'
      }
    }
  },

  // Verificar código de reset
  async verifyResetCode(email, code) {
    try {
      const response = await api.post('/auth/verify-reset', { email, code })
      return response.data
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Código inválido o expirado'
      }
    }
  },

  // Resetear contraseña
  async resetPassword(email, newPassword) {
    try {
      const response = await api.post('/auth/reset-password', { 
        email, 
        newPassword 
      })
      return response.data
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al resetear contraseña'
      }
    }
  },

  // Cerrar sesión
  logout() {
    localStorage.removeItem('jwt')
    localStorage.removeItem('user')
    console.log('👋 Sesión cerrada')
  }
}