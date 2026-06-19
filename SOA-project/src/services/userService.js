// src/services/userService.js
import api from './api'

// Datos iniciales con más usuarios y estructura completa
let mockUsers = [
  {
    id: 1,
    nombre: 'Administrador Master',
    email: 'admin@byteverse.com',
    password: '123456',
    rol: 'ADMIN',
    activo: true,
    fechaRegistro: '2024-01-01T00:00:00',
    direccion: {
      departamento: 'Lima',
      provincia: 'Lima',
      distrito: 'Miraflores',
      linea: 'Av. Principal 123',
      referencia: 'Oficina Central'
    },
    ultimoAcceso: '2024-01-15T10:30:00',
    ventasRealizadas: 0,
    totalVentas: 0,
    estadoSesion: 'activa'
  },
  {
    id: 2,
    nombre: 'Usuario Comprador',
    email: 'comprador@byteverse.com',
    password: '123456',
    rol: 'COMPRADOR',
    activo: true,
    fechaRegistro: '2024-01-15T00:00:00',
    direccion: {
      departamento: 'Lima',
      provincia: 'Lima',
      distrito: 'Miraflores',
      linea: 'Av. Larco 123',
      referencia: 'Frente al parque'
    },
    ultimoAcceso: '2024-01-14T18:20:00',
    ventasRealizadas: 0,
    totalVentas: 0,
    estadoSesion: 'activa'
  },
  {
    id: 3,
    nombre: 'Vendedor Tech Perú',
    email: 'vendedor1@byteverse.com',
    password: '123456',
    rol: 'VENDEDOR',
    activo: true,
    fechaRegistro: '2024-02-01T00:00:00',
    direccion: null,
    ultimoAcceso: '2024-01-15T09:00:00',
    ventasRealizadas: 15,
    totalVentas: 15499.85,
    estadoSesion: 'activa',
    tienda: 'TechStore Perú',
    ruc: '20567890123',
    telefono: '987654321'
  },
  {
    id: 4,
    nombre: 'Vendedor Gamer World',
    email: 'vendedor2@byteverse.com',
    password: '123456',
    rol: 'VENDEDOR',
    activo: true,
    fechaRegistro: '2024-02-10T00:00:00',
    direccion: null,
    ultimoAcceso: '2024-01-14T20:00:00',
    ventasRealizadas: 8,
    totalVentas: 8799.92,
    estadoSesion: 'inactiva',
    tienda: 'GamerWorld',
    ruc: '20678901234',
    telefono: '987654322'
  },
  {
    id: 5,
    nombre: 'Usuario Demo',
    email: 'user@byteverse.com',
    password: '123456',
    rol: 'COMPRADOR',
    activo: true,
    fechaRegistro: '2024-02-10T00:00:00',
    direccion: null,
    ultimoAcceso: '2024-01-13T15:00:00',
    ventasRealizadas: 0,
    totalVentas: 0,
    estadoSesion: 'activa'
  }
]

export const userService = {
  // Obtener todos los usuarios
  async getAllUsers() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const usersWithoutPassword = mockUsers.map(({ password, ...user }) => user)
        resolve([...usersWithoutPassword])
      }, 300)
    })
  },

  // Obtener usuario por ID
  async getUserById(id) {
    return new Promise((resolve) => {
      const { password, ...user } = mockUsers.find(u => u.id === parseInt(id)) || {}
      resolve(user || null)
    })
  },

  // Crear nuevo usuario (ADMIN puede crear VENDEDORES)
  async createUser(userData) {
    return new Promise((resolve) => {
      const existingUser = mockUsers.find(u => u.email === userData.email)
      if (existingUser) {
        resolve({ success: false, error: 'El correo ya está registrado' })
      } else {
        const newUser = {
          id: mockUsers.length + 1,
          nombre: userData.nombre,
          email: userData.email,
          password: userData.password,
          rol: userData.rol,
          activo: true,
          fechaRegistro: new Date().toISOString(),
          direccion: userData.direccion || null,
          ultimoAcceso: new Date().toISOString(),
          ventasRealizadas: 0,
          totalVentas: 0,
          estadoSesion: 'activa',
          tienda: userData.tienda || null,
          ruc: userData.ruc || null,
          telefono: userData.telefono || null
        }
        mockUsers.push(newUser)
        const { password, ...userWithoutPassword } = newUser
        resolve({ success: true, user: userWithoutPassword })
      }
    })
  },

  // Actualizar rol de usuario
  async updateUserRole(userId, newRole) {
    return new Promise((resolve) => {
      const index = mockUsers.findIndex(u => u.id === parseInt(userId))
      if (index !== -1) {
        mockUsers[index] = { ...mockUsers[index], rol: newRole }
        resolve({ success: true })
      } else {
        resolve({ success: false, error: 'Usuario no encontrado' })
      }
    })
  },

  // Activar/Desactivar usuario
  async toggleUserActive(userId, active) {
    return new Promise((resolve) => {
      const index = mockUsers.findIndex(u => u.id === parseInt(userId))
      if (index !== -1) {
        mockUsers[index] = { ...mockUsers[index], activo: active }
        resolve({ success: true })
      } else {
        resolve({ success: false, error: 'Usuario no encontrado' })
      }
    })
  },

  // Eliminar usuario (solo ADMIN, no puede eliminar ADMIN)
  async deleteUser(userId) {
    return new Promise((resolve) => {
      const index = mockUsers.findIndex(u => u.id === parseInt(userId))
      if (index !== -1 && mockUsers[index].rol !== 'ADMIN') {
        mockUsers.splice(index, 1)
        resolve({ success: true })
      } else {
        resolve({ success: false, error: 'No se puede eliminar este usuario' })
      }
    })
  },

  // Actualizar perfil de vendedor
  async updateVendorProfile(userId, data) {
    return new Promise((resolve) => {
      const index = mockUsers.findIndex(u => u.id === parseInt(userId))
      if (index !== -1) {
        mockUsers[index] = { ...mockUsers[index], ...data }
        resolve({ success: true })
      } else {
        resolve({ success: false, error: 'Usuario no encontrado' })
      }
    })
  },

  // Obtener estadísticas de vendedor
  async getVendorStats(vendorId) {
    return new Promise((resolve) => {
      const user = mockUsers.find(u => u.id === parseInt(vendorId))
      if (user && user.rol === 'VENDEDOR') {
        resolve({
          ventasRealizadas: user.ventasRealizadas || 0,
          totalVentas: user.totalVentas || 0,
          productosActivos: 0,
          ultimoAcceso: user.ultimoAcceso,
          estadoSesion: user.estadoSesion
        })
      } else {
        resolve(null)
      }
    })
  }
}