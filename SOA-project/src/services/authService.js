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
    direccion: null,
    needPasswordChange: false
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
    needPasswordChange: false
  },
  {
    id: 3,
    nombre: 'Vendedor Tech',
    email: 'vendedor@byteverse.com',
    password: '123456',
    rol: 'VENDEDOR',
    activo: true,
    fechaRegistro: '2024-02-01T00:00:00',
    direccion: null,
    needPasswordChange: true  // Vendedor necesita cambiar contraseña
  },
  {
    id: 4,
    nombre: 'Usuario Demo',
    email: 'user@byteverse.com',
    password: '123456',
    rol: 'COMPRADOR',
    activo: true,
    fechaRegistro: '2024-02-10T00:00:00',
    direccion: null,
    needPasswordChange: false
  },
]

// Almacenamiento temporal para códigos de recuperación
const resetCodes = new Map()

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
          
          // Verificar si necesita cambiar contraseña
          if (user.needPasswordChange) {
            resolve({
              success: true,
              needPasswordChange: true,
              user: userWithoutPassword,
              token
            })
          } else {
            resolve({
              success: true,
              token,
              user: userWithoutPassword,
            })
          }
        } else {
          resolve({ success: false, error: 'Credenciales inválidas o usuario inactivo' })
        }
      }, 500)
    })
  },

  async updatePassword(email, userId, newPassword) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = mockUsers.findIndex(u => u.email === email || u.id === userId)
        if (index !== -1) {
          mockUsers[index].password = newPassword
          mockUsers[index].needPasswordChange = false
          resolve({ success: true })
        } else {
          resolve({ success: false, error: 'Usuario no encontrado' })
        }
      }, 500)
    })
  },

  async requestPasswordReset(email) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const user = mockUsers.find(u => u.email === email)
        if (user) {
          const code = Math.floor(100000 + Math.random() * 900000).toString()
          resetCodes.set(email, { code, expires: Date.now() + 600000 }) // 10 minutos
          console.log(`Código de recuperación para ${email}: ${code}`)
          resolve({ success: true, code })
        } else {
          resolve({ success: false, error: 'Correo no registrado' })
        }
      }, 500)
    })
  },

  async verifyResetCode(email, code) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const resetData = resetCodes.get(email)
        if (resetData && resetData.code === code && resetData.expires > Date.now()) {
          resolve({ success: true })
        } else {
          resolve({ success: false, error: 'Código inválido o expirado' })
        }
      }, 300)
    })
  },

  async resetPassword(email, newPassword) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = mockUsers.findIndex(u => u.email === email)
        if (index !== -1) {
          mockUsers[index].password = newPassword
          resetCodes.delete(email)
          resolve({ success: true })
        } else {
          resolve({ success: false, error: 'Usuario no encontrado' })
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
          direccion: null,
          needPasswordChange: false
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
            direccion: userData.direccion || null,
            needPasswordChange: false
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