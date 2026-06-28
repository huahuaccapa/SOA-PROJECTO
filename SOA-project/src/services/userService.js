//src\services\userService.js
import api from './api'

// Función helper para transformar usuario del backend
const transformUser = (user) => {
  if (!user) return null
  return {
    id: user._id || user.id,
    nombre: user.nombre || user.name,
    email: user.email,
    rol: user.role || user.rol || 'COMPRADOR',
    activo: user.activo !== undefined ? user.activo : true,
    fechaRegistro: user.fechaRegistro || user.createdAt,
    direccion: user.direccion || {},
    tienda: user.tienda,
    ruc: user.ruc,
    telefono: user.telefono,
    ventasRealizadas: user.ventasRealizadas || 0,
    totalVentas: user.totalVentas || 0,
    ultimoAcceso: user.ultimoAcceso,
    needPasswordChange: user.needPasswordChange || false
  }
}

export const userService = {
  async getAllUsers() {
    try {
      const response = await api.get('/users')
      const users = response.data || []
      return users.map(transformUser)
    } catch (error) {
      console.error('❌ Error fetching users:', error)
      return []
    }
  },

  async getUserById(id) {
    try {
      const response = await api.get(`/users/${id}`)
      return transformUser(response.data)
    } catch (error) {
      console.error('❌ Error fetching user:', error)
      return null
    }
  },

  async createUser(userData) {
    try {
      const response = await api.post('/users', userData)
      return { success: true, user: transformUser(response.data) }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al crear usuario'
      }
    }
  },

  async updateUser(id, userData) {
    try {
      const response = await api.put(`/users/${id}`, userData)
      return { success: true, user: transformUser(response.data) }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al actualizar usuario'
      }
    }
  },

  async updateUserRole(userId, newRole) {
    try {
      const response = await api.patch(`/users/${userId}/role`, { role: newRole })
      return { success: true, user: transformUser(response.data) }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al actualizar rol'
      }
    }
  },

  async toggleUserActive(userId, active) {
    try {
      const response = await api.patch(`/users/${userId}/toggle`, { active })
      return { success: true, user: transformUser(response.data) }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al cambiar estado'
      }
    }
  },

  async deleteUser(userId) {
    try {
      await api.delete(`/users/${userId}`)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al eliminar usuario'
      }
    }
  },

  async updateVendorProfile(userId, data) {
    try {
      const response = await api.patch(`/users/${userId}/vendor`, data)
      return { success: true, user: transformUser(response.data) }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al actualizar perfil'
      }
    }
  }
}