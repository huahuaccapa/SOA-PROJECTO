//src\components\Admin\AdminUsers.jsx
import React, { useState, useEffect } from 'react'
import { userService } from '../../services/userService'
import { useNotification } from '../../contexts/NotificationContext'
import { Edit, Trash2, CheckCircle, XCircle, Shield, User, Store } from 'lucide-react'

const AdminUsers = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const { showSuccess, showError } = useNotification()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    const data = await userService.getAllUsers()
    setUsers(data)
    setLoading(false)
  }

  const handleRoleChange = async (userId, newRole) => {
    const result = await userService.updateUserRole(userId, newRole)
    if (result.success) {
      showSuccess(`Rol actualizado a ${newRole}`)
      loadUsers()
    } else {
      showError(result.error)
    }
  }

  const handleToggleActive = async (userId, currentStatus) => {
    const result = await userService.toggleUserActive(userId, !currentStatus)
    if (result.success) {
      showSuccess(`Usuario ${!currentStatus ? 'activado' : 'desactivado'}`)
      loadUsers()
    } else {
      showError(result.error)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) {
      const result = await userService.deleteUser(userId)
      if (result.success) {
        showSuccess('Usuario eliminado')
        loadUsers()
      } else {
        showError(result.error)
      }
    }
  }

  const getRoleIcon = (rol) => {
    switch (rol) {
      case 'ADMIN': return <Shield size={16} className="text-red-500" />
      case 'VENDEDOR': return <Store size={16} className="text-blue-500" />
      default: return <User size={16} className="text-green-500" />
    }
  }

  if (loading) return <div className="text-center py-8">Cargando usuarios...</div>

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Gestión de Usuarios</h2>
      
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-600">
                <th className="p-4">ID</th>
                <th className="p-4">Usuario</th>
                <th className="p-4">Email</th>
                <th className="p-4">Rol</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Fecha Registro</th>
                <th className="p-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{user.id}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(user.rol)}
                      <span className="font-medium">{user.nombre}</span>
                    </div>
                  </td>
                  <td className="p-4">{user.email}</td>
                  <td className="p-4">
                    <select
                      value={user.rol}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="COMPRADOR">Comprador</option>
                      <option value="VENDEDOR">Vendedor</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleToggleActive(user.id, user.activo)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                        user.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.activo ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {user.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="p-4 text-sm text-gray-500">
                    {new Date(user.fechaRegistro).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-500 hover:text-red-600"
                        disabled={user.rol === 'ADMIN'}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminUsers