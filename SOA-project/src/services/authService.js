// services/authService.js
import api from './api'

// Datos simulados para desarrollo
const mockUsers = [
  {
    id: 1,
    nombre: 'Usuario Demo',
    email: 'user@byteverse.com',
    password: '123456',
    rol: 'USER',
  },
  {
    id: 2,
    nombre: 'Administrador',
    email: 'admin@byteverse.com',
    password: '123456',
    rol: 'ADMIN',
  },
]

export const authService = {
  async login(credentials) {
    // Simulación de API
    return new Promise((resolve) => {
      setTimeout(() => {
        const user = mockUsers.find(
          u => u.email === credentials.email && u.password === credentials.password
        )
        
        if (user) {
          const token = btoa(JSON.stringify({ id: user.id, email: user.email, rol: user.rol }))
          resolve({
            success: true,
            token,
            user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
          })
        } else {
          resolve({ success: false, error: 'Credenciales inválidas' })
        }
      }, 500)
    })
  },

  async googleLogin(googleToken) {
    // Simulación de login con Google
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser = {
          id: 3,
          nombre: 'Google User',
          email: 'google@byteverse.com',
          rol: 'USER',
        }
        const token = btoa(JSON.stringify(mockUser))
        resolve({
          success: true,
          token,
          user: mockUser,
        })
      }, 500)
    })
  },

  async register(userData) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true })
      }, 500)
    })
  },

  logout() {
    localStorage.removeItem('jwt')
    localStorage.removeItem('user')
  },
}