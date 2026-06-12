import api from './api'

let mockUsers = [
  {
    id: 1,
    nombre: 'Administrador',
    email: 'admin@byteverse.com',
    password: '123456',
    rol: 'ADMIN',
    activo: true,
    fechaRegistro: '2024-01-01T00:00:00',
    direccion: null
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
    }
  },
  {
    id: 3,
    nombre: 'Vendedor Tech',
    email: 'vendedor@byteverse.com',
    password: '123456',
    rol: 'VENDEDOR',
    activo: true,
    fechaRegistro: '2024-02-01T00:00:00',
    direccion: null
  },
  {
    id: 4,
    nombre: 'Usuario Demo',
    email: 'user@byteverse.com',
    password: '123456',
    rol: 'COMPRADOR',
    activo: true,
    fechaRegistro: '2024-02-10T00:00:00',
    direccion: null
  },
]

export const authService = {
  async login(credentials) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const user = mockUsers.find(
          u => u.email === credentials.email && u.password === credentials.password && u.activo === true
        )
        
        if (user) {
          const { password, ...userWithoutPassword } = user
          const token = btoa(JSON.stringify({ id: user.id, email: user.email, rol: user.rol }))
          resolve({
            success: true,
            token,
            user: userWithoutPassword,
          })
        } else {
          resolve({ success: false, error: 'Credenciales inválidas o usuario inactivo' })
        }
      }, 500)
    })
  },

  async googleLogin(googleToken) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser = {
          id: 5,
          nombre: 'Google User',
          email: 'google@byteverse.com',
          rol: 'COMPRADOR',
          activo: true,
          fechaRegistro: new Date().toISOString(),
          direccion: null
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
            direccion: userData.direccion || null
          }
          mockUsers.push(newUser)
          resolve({ success: true })
        }
      }, 500)
    })
  },

  logout() {
    localStorage.removeItem('jwt')
    localStorage.removeItem('user')
  },
}