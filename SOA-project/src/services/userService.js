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
]

export const userService = {
  async getAllUsers() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const usersWithoutPassword = mockUsers.map(({ password, ...user }) => user)
        resolve([...usersWithoutPassword])
      }, 300)
    })
  },

  async getUserById(id) {
    return new Promise((resolve) => {
      const { password, ...user } = mockUsers.find(u => u.id === parseInt(id)) || {}
      resolve(user || null)
    })
  },

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
          direccion: null
        }
        mockUsers.push(newUser)
        const { password, ...userWithoutPassword } = newUser
        resolve({ success: true, user: userWithoutPassword })
      }
    })
  },

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
  }
}