//src\services\authService.js
import api from './api'

export const authService = {
  async login(credentials) {
    try {
      console.log('🔐 Intentando login:', credentials.email)
      const response = await api.post('/auth/login', credentials)
      
      // Normalizar respuesta del backend
      const data = response.data
      return {
        success: data.success || false,
        token: data.accessToken || data.token,
        refreshToken: data.refreshToken,
        user: data.user ? {
          id: data.user.id || data.user._id,
          nombre: data.user.nombre || data.user.name,
          email: data.user.email,
          rol: data.user.role || data.user.rol || 'COMPRADOR',
          activo: data.user.activo !== undefined ? data.user.activo : true,
          needPasswordChange: data.user.needPasswordChange || false,
          direccion: data.user.direccion || {}
        } : null,
        needPasswordChange: data.user?.needPasswordChange || false,
        userId: data.user?.id || data.user?._id,
        error: data.error
      }
    } catch (error) {
      console.error('❌ Login error:', error)
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Error al iniciar sesión'
      }
    }
  },

  async register(userData) {
    try {
      console.log('📝 Registrando usuario:', userData.email)
      const response = await api.post('/auth/register', {
        nombre: userData.nombre,
        email: userData.email,
        password: userData.password,
        role: userData.rol || 'COMPRADOR'
      })
      
      return {
        success: response.data.success || false,
        user: response.data.user,
        error: response.data.error
      }
    } catch (error) {
      console.error('❌ Registro error:', error)
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Error al registrar usuario'
      }
    }
  },

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

  async updatePassword(email, userId, newPassword) {
    try {
      const response = await api.post('/auth/change-password', {
        email,
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

  async requestPasswordReset(email) {
    try {
      // Simular envío de código (backend no tiene este endpoint aún)
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      console.log(`📧 Código de verificación para ${email}: ${code}`)
      return { success: true, code }
    } catch (error) {
      return {
        success: false,
        error: 'Error al solicitar reset'
      }
    }
  },

  async verifyResetCode(email, code) {
    try {
      // Verificación simulada
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: 'Código inválido'
      }
    }
  },

  async resetPassword(email, newPassword) {
    try {
      const response = await api.post('/auth/change-password', {
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

  logout() {
    localStorage.removeItem('jwt')
    localStorage.removeItem('user')
    console.log('👋 Sesión cerrada')
  }
}