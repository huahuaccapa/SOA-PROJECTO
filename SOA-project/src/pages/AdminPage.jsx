// AdminPage.jsx - Panel de administración para gestionar productos, usuarios y pedidos
import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { productService } from '../services/productService'
import { orderService } from '../services/orderService'
import { userService } from '../services/userService'
import { useNotification } from '../contexts/NotificationContext'
import { LayoutGrid, Package, Users, Plus, Edit, Trash2, TrendingUp, UserPlus } from 'lucide-react'

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
    totalVendedores: 0,
    totalCompradores: 0,
  })
  const { token } = useAuth()

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    const products = await productService.getAllProducts()
    const orders = await orderService.getOrders(token)
    const users = await userService.getAllUsers()
    
    setStats({
      totalProducts: products.length,
      totalOrders: orders.length,
      totalUsers: users.length,
      totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
      totalVendedores: users.filter(u => u.rol === 'VENDEDOR').length,
      totalCompradores: users.filter(u => u.rol === 'COMPRADOR').length,
    })
  }

  const statCards = [
    { title: 'Productos', value: stats.totalProducts, icon: <Package className="w-6 h-6" />, color: 'bg-blue-500' },
    { title: 'Pedidos', value: stats.totalOrders, icon: <LayoutGrid className="w-6 h-6" />, color: 'bg-green-500' },
    { title: 'Usuarios', value: stats.totalUsers, icon: <Users className="w-6 h-6" />, color: 'bg-purple-500' },
    { title: 'Ingresos', value: `S/ ${stats.totalRevenue.toFixed(2)}`, icon: <TrendingUp className="w-6 h-6" />, color: 'bg-indigo-500' },
    { title: 'Vendedores', value: stats.totalVendedores, icon: <Users className="w-6 h-6" />, color: 'bg-cyan-500' },
    { title: 'Compradores', value: stats.totalCompradores, icon: <Users className="w-6 h-6" />, color: 'bg-emerald-500' },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-white">Panel de Administración</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div key={index} className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{stat.title}</p>
                <p className="text-2xl font-bold mt-1 text-white">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg text-white`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Pedidos Recientes</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-700">
              <tr className="text-left text-gray-400">
                <th className="pb-2">ID</th>
                <th className="pb-2">Usuario</th>
                <th className="pb-2">Total</th>
                <th className="pb-2">Estado</th>
                <th className="pb-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map(i => (
                <tr key={i} className="border-b border-gray-800 last:border-0">
                  <td className="py-3 text-gray-300">#{1000 + i}</td>
                  <td className="py-3 text-gray-300">usuario{i}@byteverse.com</td>
                  <td className="py-3 text-gray-300">S/ {(Math.random() * 5000).toFixed(2)}</td>
                  <td className="py-3">
                    <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs">
                      CONFIRMADO
                    </span>
                  </td>
                  <td className="py-3 text-gray-500">2024-01-{10 + i}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Componente para crear nuevo usuario
const CreateUserModal = ({ isOpen, onClose, onUserCreated }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'COMPRADOR'
  })
  const [loading, setLoading] = useState(false)
  const { showSuccess, showError } = useNotification()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const result = await userService.createUser(formData)
    
    if (result.success) {
      showSuccess(`Usuario ${formData.nombre} creado exitosamente`)
      onUserCreated()
      onClose()
      setFormData({ nombre: '', email: '', password: '', rol: 'COMPRADOR' })
    } else {
      showError(result.error)
    }
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 max-w-md w-full border border-cyan-500/30">
        <h3 className="text-xl font-bold mb-4 text-white">Crear Nuevo Usuario</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Nombre Completo</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Correo Electrónico</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Contraseña</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Rol</label>
            <select
              value={formData.rol}
              onChange={(e) => setFormData({...formData, rol: e.target.value})}
              className="input-field"
            >
              <option value="COMPRADOR">Comprador</option>
              <option value="VENDEDOR">Vendedor</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Creando...' : 'Crear Usuario'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Componente de gestión de usuarios
const AdminUsers = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
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

  if (loading) return <div className="text-center py-8 text-gray-400">Cargando usuarios...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Gestión de Usuarios</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus size={18} />
          Nuevo Usuario
        </button>
      </div>
      
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50 border-b border-gray-700">
              <tr className="text-left text-gray-400">
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
                <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                  <td className="p-4 text-gray-300">{user.id}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{user.nombre}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-300">{user.email}</td>
                  <td className="p-4">
                    <select
                      value={user.rol}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="text-sm border border-gray-600 rounded px-2 py-1 bg-gray-800 text-white"
                      disabled={user.rol === 'ADMIN'}
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
                        user.activo ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}
                    >
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
                        className="text-red-400 hover:text-red-300 transition"
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
      
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onUserCreated={loadUsers}
      />
    </div>
  )
}

const ProductManagement = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const { showSuccess, showError } = useNotification()
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '',
    categoria: '',
    caracteristicas: []
  })

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    const data = await productService.getAllProducts()
    setProducts(data)
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const productData = {
      ...formData,
      precio: parseFloat(formData.precio),
      stock: parseInt(formData.stock),
    }
    
    if (editingProduct) {
      const result = await productService.updateProduct(editingProduct.id, productData)
      if (result.success) {
        showSuccess('Producto actualizado')
        loadProducts()
        setShowModal(false)
        resetForm()
      } else {
        showError(result.error)
      }
    } else {
      const result = await productService.createProduct(productData)
      if (result.success) {
        showSuccess('Producto creado')
        loadProducts()
        setShowModal(false)
        resetForm()
      } else {
        showError(result.error)
      }
    }
  }

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar este producto?')) {
      const result = await productService.deleteProduct(id)
      if (result.success) {
        showSuccess('Producto eliminado')
        loadProducts()
      } else {
        showError(result.error)
      }
    }
  }

  const handleToggleActive = async (product) => {
    const result = await productService.toggleProductActive(product.id, !product.activo)
    if (result.success) {
      showSuccess(`Producto ${!product.activo ? 'activado' : 'desactivado'}`)
      loadProducts()
    } else {
      showError(result.error)
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      precio: '',
      stock: '',
      categoria: '',
      caracteristicas: []
    })
    setEditingProduct(null)
  }

  const editProduct = (product) => {
    setEditingProduct(product)
    setFormData({
      nombre: product.nombre,
      descripcion: product.descripcion || '',
      precio: product.precio.toString(),
      stock: product.stock.toString(),
      categoria: product.categoria || '',
      caracteristicas: product.caracteristicas || []
    })
    setShowModal(true)
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-gray-400">Cargando...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Gestión de Productos</h2>
        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Nuevo Producto
        </button>
      </div>
      
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50 border-b border-gray-700">
              <tr className="text-left text-gray-400">
                <th className="p-4">ID</th>
                <th className="p-4">Producto</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Precio</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                  <td className="p-4 text-gray-300">{product.id}</td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-white">{product.nombre}</p>
                      <p className="text-sm text-gray-500">{product.descripcion?.substring(0, 50)}</p>
                    </div>
                  </td>
                  <td className="p-4 text-gray-300">{product.categoria || '-'}</td>
                  <td className="p-4 text-cyan-400">S/ {product.precio.toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${product.stock > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {product.stock} unidades
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleToggleActive(product)}
                      className={`px-2 py-1 rounded-full text-xs ${product.activo ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                    >
                      {product.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button onClick={() => editProduct(product)} className="text-blue-400 hover:text-blue-300 transition">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="text-red-400 hover:text-red-300 transition">
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
      
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 max-w-md w-full border border-cyan-500/30">
            <h3 className="text-xl font-bold mb-4 text-white">
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Nombre</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  className="input-field"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Características (separadas por coma)</label>
                <input
                  type="text"
                  value={formData.caracteristicas.join(', ')}
                  onChange={(e) => setFormData({...formData, caracteristicas: e.target.value.split(',').map(c => c.trim())})}
                  className="input-field"
                  placeholder="4GB RAM, 128GB SSD, Intel i5"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Precio (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.precio}
                    onChange={(e) => setFormData({...formData, precio: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Stock</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Categoría</label>
                <input
                  type="text"
                  value={formData.categoria}
                  onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                  className="input-field"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editingProduct ? 'Actualizar' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const AdminPage = () => {
  const location = useLocation()
  
  const menuItems = [
    { path: '', label: 'Dashboard', icon: <LayoutGrid size={18} /> },
    { path: 'products', label: 'Productos', icon: <Package size={18} /> },
    { path: 'users', label: 'Usuarios', icon: <Users size={18} /> },
  ]
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1">
        <div className="card p-4 sticky top-24">
          <nav className="space-y-1">
            {menuItems.map(item => (
              <Link
                key={item.path}
                to={`/admin/${item.path}`}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${
                  location.pathname === `/admin/${item.path}` || 
                  (item.path === '' && location.pathname === '/admin')
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
      
      <div className="lg:col-span-3">
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="products" element={<ProductManagement />} />
          <Route path="users" element={<AdminUsers />} />
        </Routes>
      </div>
    </div>
  )
}

export default AdminPage