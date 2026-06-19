import api from './api'

export const userService = {
  // Obtener todos los usuarios
  async getAllUsers() {
    try {
      const response = await api.get('/users')
      return response.data
    } catch (error) {
      console.error('❌ Error fetching users:', error)
      return []
    }
  },

  // Obtener usuario por ID
  async getUserById(id) {
    try {
      const response = await api.get(`/users/${id}`)
      return response.data
    } catch (error) {
      console.error('❌ Error fetching user:', error)
      return null
    }
  },

  // Crear usuario
  async createUser(userData) {
    try {
      const response = await api.post('/users', userData)
      return response.data
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al crear usuario'
      }
    }
  },

  // Actualizar usuario
  async updateUser(id, userData) {
    try {
      const response = await api.put(`/users/${id}`, userData)
      return response.data
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al actualizar usuario'
      }
    }
  },

  // Actualizar rol de usuario
  async updateUserRole(userId, newRole) {
    try {
      const response = await api.patch(`/users/${userId}/role`, { role: newRole })
      return response.data
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al actualizar rol'
      }
    }
  },

  // Activar/Desactivar usuario
  async toggleUserActive(userId, active) {
    try {
      const response = await api.patch(`/users/${userId}/toggle`, { active })
      return response.data
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al cambiar estado'
      }
    }
  },

  // Eliminar usuario
  async deleteUser(userId) {
    try {
      const response = await api.delete(`/users/${userId}`)
      return response.data
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al eliminar usuario'
      }
    }
  },

  // Actualizar perfil de vendedor
  async updateVendorProfile(userId, data) {
    try {
      const response = await api.patch(`/users/${userId}/vendor`, data)
      return response.data
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al actualizar perfil'
      }
    }
  },

  // Obtener estadísticas de vendedor
  async getVendorStats(vendorId) {
    try {
      const response = await api.get(`/users/${vendorId}/stats`)
      return response.data
    } catch (error) {
      console.error('❌ Error fetching vendor stats:', error)
      return null
    }
  }
}