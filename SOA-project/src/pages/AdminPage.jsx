// src\pages\AdminPage.jsx
import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import { productService } from '../services/productService'
import { orderService } from '../services/orderService'
import { userService } from '../services/userService'
import { 
  LayoutGrid, Package, Users, Plus, Edit, Trash2, 
  TrendingUp, UserPlus, DollarSign, ShoppingBag, 
  BarChart3, FileText, CheckCircle, XCircle, Clock,
  Store, Truck, Shield, Zap, Eye, EyeOff,
  Download, Printer, Calendar, Filter, X
} from 'lucide-react'

// ============================================
// DASHBOARD ADMIN
// ============================================
const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
    totalVendedores: 0,
    totalCompradores: 0,
    totalVentasMes: 0,
    productosActivos: 0,
    productosInactivos: 0
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    const products = await productService.getAllProducts()
    const orders = await orderService.getOrders()
    const users = await userService.getAllUsers()
    
    const today = new Date()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    
    setStats({
      totalProducts: products.length,
      totalOrders: orders.length,
      totalUsers: users.length,
      totalRevenue: orders.reduce((sum, o) => sum + (o.total || 0), 0),
      totalVendedores: users.filter(u => u.rol === 'VENDEDOR').length,
      totalCompradores: users.filter(u => u.rol === 'COMPRADOR').length,
      totalVentasMes: orders
        .filter(o => new Date(o.fecha) >= monthStart)
        .reduce((sum, o) => sum + (o.total || 0), 0),
      productosActivos: products.filter(p => p.activo).length,
      productosInactivos: products.filter(p => !p.activo).length
    })
    
    setRecentOrders(orders.slice(0, 5))
    setLoading(false)
  }

  const statCards = [
    { title: 'Productos Totales', value: stats.totalProducts, icon: <Package className="w-6 h-6" />, color: 'bg-blue-500' },
    { title: 'Productos Activos', value: stats.productosActivos, icon: <CheckCircle className="w-6 h-6" />, color: 'bg-green-500' },
    { title: 'Productos Inactivos', value: stats.productosInactivos, icon: <XCircle className="w-6 h-6" />, color: 'bg-red-500' },
    { title: 'Pedidos Totales', value: stats.totalOrders, icon: <ShoppingBag className="w-6 h-6" />, color: 'bg-purple-500' },
    { title: 'Usuarios Totales', value: stats.totalUsers, icon: <Users className="w-6 h-6" />, color: 'bg-indigo-500' },
    { title: 'Vendedores', value: stats.totalVendedores, icon: <Store className="w-6 h-6" />, color: 'bg-cyan-500' },
    { title: 'Compradores', value: stats.totalCompradores, icon: <Users className="w-6 h-6" />, color: 'bg-emerald-500' },
    { title: 'Ingresos Totales', value: `S/ ${stats.totalRevenue.toFixed(2)}`, icon: <DollarSign className="w-6 h-6" />, color: 'bg-yellow-500' },
  ]

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-gray-400">Cargando estadísticas...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Panel de Administración</h1>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2">
            <Download size={18} />
            Exportar Reporte
          </button>
          <button className="btn-secondary flex items-center gap-2">
            <Printer size={18} />
            Imprimir
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, index) => (
          <div key={index} className="card p-4 hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider">{stat.title}</p>
                <p className="text-2xl font-bold mt-1 text-white">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-2 rounded-lg text-white opacity-80`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-400" />
          Pedidos Recientes
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-700">
              <tr className="text-left text-gray-400 text-sm">
                <th className="pb-2">ID</th>
                <th className="pb-2">Cliente</th>
                <th className="pb-2">Vendedor</th>
                <th className="pb-2">Total</th>
                <th className="pb-2">Estado</th>
                <th className="pb-2">Fecha</th>
                <th className="pb-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(order => (
                <tr key={order.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/30 transition">
                  <td className="py-3 text-gray-300 text-sm">#{typeof order.id === 'string' ? order.id.slice(0, 8) : order.id}</td>
                  <td className="py-3 text-gray-300">{order.compradorNombre || 'N/A'}</td>
                  <td className="py-3 text-gray-300">{order.vendedorNombre || 'N/A'}</td>
                  <td className="py-3 text-cyan-400 font-medium">S/ {order.total?.toFixed(2) || '0.00'}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      order.estado === 'CONFIRMADO' 
                        ? 'bg-green-500/20 text-green-400' 
                        : order.estado === 'CANCELADO'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {order.estado || 'PENDIENTE'}
                    </span>
                  </td>
                  <td className="py-3 text-gray-500 text-sm">
                    {order.fecha ? new Date(order.fecha).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-3">
                    <button className="text-cyan-400 hover:text-cyan-300 transition">
                      <Eye size={16} />
                    </button>
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

// ============================================
// GESTIÓN DE PRODUCTOS (ADMIN)
// ============================================
const ProductManagement = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const { showSuccess, showError } = useNotification()
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '',
    categoria: '',
    caracteristicas: [],
    vendedorId: '',
    vendedorNombre: '',
    tieneIGV: true,
    deliveryGratis: true,
    peso: '',
    dimensiones: '',
    garantia: '12 meses',
    imagen: ''
  })

  const [vendedores, setVendedores] = useState([])

  useEffect(() => {
    loadProducts()
    loadVendedores()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    const data = await productService.getAllProducts()
    setProducts(data)
    setLoading(false)
  }

  const loadVendedores = async () => {
    const users = await userService.getAllUsers()
    setVendedores(users.filter(u => u.rol === 'VENDEDOR'))
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      precio: '',
      stock: '',
      categoria: '',
      caracteristicas: [],
      vendedorId: '',
      vendedorNombre: '',
      tieneIGV: true,
      deliveryGratis: true,
      peso: '',
      dimensiones: '',
      garantia: '12 meses',
      imagen: ''
    })
    setEditingProduct(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const productData = {
      ...formData,
      precio: parseFloat(formData.precio),
      stock: parseInt(formData.stock),
      vendedorId: formData.vendedorId ? parseInt(formData.vendedorId) : null,
      vendedorNombre: formData.vendedorNombre || null,
      activo: true
    }
    
    let result
    if (editingProduct) {
      result = await productService.updateProduct(editingProduct.id, productData)
      if (result.success) {
        showSuccess('Producto actualizado exitosamente')
      }
    } else {
      result = await productService.createProduct(productData)
      if (result.success) {
        showSuccess('Producto creado exitosamente')
      }
    }
    
    if (result.success) {
      loadProducts()
      setShowModal(false)
      resetForm()
    } else {
      showError(result.error)
    }
  }

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) {
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

  const editProduct = (product) => {
    setEditingProduct(product)
    setFormData({
      nombre: product.nombre,
      descripcion: product.descripcion || '',
      precio: product.precio.toString(),
      stock: product.stock.toString(),
      categoria: product.categoria || '',
      caracteristicas: product.caracteristicas || [],
      vendedorId: product.vendedorId || '',
      vendedorNombre: product.vendedorNombre || '',
      tieneIGV: product.tieneIGV !== undefined ? product.tieneIGV : true,
      deliveryGratis: product.deliveryGratis !== undefined ? product.deliveryGratis : true,
      peso: product.peso || '',
      dimensiones: product.dimensiones || '',
      garantia: product.garantia || '12 meses',
      imagen: product.imagen || ''
    })
    setShowModal(true)
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-gray-400">Cargando productos...</div>
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
              <tr className="text-left text-gray-400 text-sm">
                <th className="p-4">ID</th>
                <th className="p-4">Producto</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Vendedor</th>
                <th className="p-4">Precio</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition">
                  <td className="p-4 text-gray-300 text-sm">{typeof product.id === 'string' ? product.id.slice(0, 8) : product.id}</td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-white">{product.nombre}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{product.descripcion}</p>
                    </div>
                  </td>
                  <td className="p-4 text-gray-300">{product.categoria || '-'}</td>
                  <td className="p-4 text-gray-300">
                    {product.vendedorNombre || 'Sin vendedor'}
                  </td>
                  <td className="p-4 text-cyan-400 font-medium">S/ {product.precio?.toFixed(2) || '0.00'}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      product.stock > 10 
                        ? 'bg-green-500/20 text-green-400' 
                        : product.stock > 0 
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleToggleActive(product)}
                      className={`px-2 py-1 rounded-full text-xs ${
                        product.activo 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {product.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => editProduct(product)} 
                        className="text-blue-400 hover:text-blue-300 transition"
                        title="Editar"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id)} 
                        className="text-red-400 hover:text-red-300 transition"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button 
                        onClick={() => setSelectedProduct(product)} 
                        className="text-cyan-400 hover:text-cyan-300 transition"
                        title="Ver Detalles"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Producto */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-cyan-500/30">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-white">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className="text-gray-400 hover:text-white transition"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Nombre *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Categoría *</label>
                  <input
                    type="text"
                    value={formData.categoria}
                    onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Descripción *</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  className="input-field"
                  rows="3"
                  required
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
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Precio (S/) *</label>
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
                  <label className="block text-sm font-medium mb-1 text-gray-300">Stock *</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Vendedor</label>
                  <select
                    value={formData.vendedorId}
                    onChange={(e) => {
                      const vendedor = vendedores.find(v => v.id === parseInt(e.target.value))
                      setFormData({
                        ...formData,
                        vendedorId: e.target.value,
                        vendedorNombre: vendedor ? vendedor.nombre : ''
                      })
                    }}
                    className="input-field"
                  >
                    <option value="">Sin vendedor</option>
                    {vendedores.map(v => (
                      <option key={v.id} value={v.id}>{v.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.peso}
                    onChange={(e) => setFormData({...formData, peso: e.target.value})}
                    className="input-field"
                    placeholder="2.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Garantía</label>
                  <select
                    value={formData.garantia}
                    onChange={(e) => setFormData({...formData, garantia: e.target.value})}
                    className="input-field"
                  >
                    <option value="6 meses">6 meses</option>
                    <option value="12 meses">12 meses</option>
                    <option value="18 meses">18 meses</option>
                    <option value="24 meses">24 meses</option>
                    <option value="36 meses">36 meses</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.tieneIGV}
                    onChange={(e) => setFormData({...formData, tieneIGV: e.target.checked})}
                    className="w-4 h-4 text-cyan-400"
                  />
                  <span className="text-gray-300">Incluye IGV</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.deliveryGratis}
                    onChange={(e) => setFormData({...formData, deliveryGratis: e.target.checked})}
                    className="w-4 h-4 text-cyan-400"
                  />
                  <span className="text-gray-300">Delivery Gratis</span>
                </label>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editingProduct ? 'Actualizar Producto' : 'Crear Producto'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalle */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-cyan-500/30">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-white">{selectedProduct.nombre}</h3>
              <button 
                onClick={() => setSelectedProduct(null)}
                className="text-gray-400 hover:text-white transition"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 text-sm">ID</p>
                  <p className="text-white">#{typeof selectedProduct.id === 'string' ? selectedProduct.id.slice(0, 8) : selectedProduct.id}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Categoría</p>
                  <p className="text-white">{selectedProduct.categoria}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Precio</p>
                  <p className="text-cyan-400 font-bold">S/ {selectedProduct.precio?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Stock</p>
                  <p className="text-white">{selectedProduct.stock}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Vendedor</p>
                  <p className="text-white">{selectedProduct.vendedorNombre || 'Sin vendedor'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Estado</p>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    selectedProduct.activo ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {selectedProduct.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
              
              <div>
                <p className="text-gray-500 text-sm">Descripción</p>
                <p className="text-white">{selectedProduct.descripcion}</p>
              </div>
              
              {selectedProduct.caracteristicas?.length > 0 && (
                <div>
                  <p className="text-gray-500 text-sm">Características</p>
                  <ul className="list-disc list-inside text-white space-y-1">
                    {selectedProduct.caracteristicas.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    editProduct(selectedProduct)
                    setSelectedProduct(null)
                  }}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Edit size={18} />
                  Editar Producto
                </button>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="btn-secondary flex-1"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// GESTIÓN DE USUARIOS (ADMIN) - ACTUALIZADO
// ============================================
const AdminUsers = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const { showSuccess, showError } = useNotification()
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'COMPRADOR',
    tienda: '',
    ruc: '',
    telefono: ''
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    const data = await userService.getAllUsers()
    setUsers(data)
    setLoading(false)
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    
    const userData = {
      nombre: formData.nombre,
      email: formData.email,
      password: formData.password,
      rol: formData.rol,
      tienda: formData.tienda || null,
      ruc: formData.ruc || null,
      telefono: formData.telefono || null
    }
    
    const result = await userService.createUser(userData)
    if (result.success) {
      showSuccess(`Usuario ${formData.nombre} creado exitosamente`)
      loadUsers()
      setShowCreateModal(false)
      setFormData({ nombre: '', email: '', password: '', rol: 'COMPRADOR', tienda: '', ruc: '', telefono: '' })
    } else {
      showError(result.error)
    }
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
              <tr className="text-left text-gray-400 text-sm">
                <th className="p-4">ID</th>
                <th className="p-4">Usuario</th>
                <th className="p-4">Email</th>
                <th className="p-4">Rol</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition">
                  <td className="p-4 text-gray-300 text-sm">{typeof user.id === 'string' ? user.id.slice(0, 8) : user.id}</td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-white">{user.nombre}</p>
                      {user.tienda && (
                        <p className="text-xs text-cyan-400">{user.tienda}</p>
                      )}
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
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="text-cyan-400 hover:text-cyan-300 transition"
                        title="Ver Detalles"
                      >
                        <Eye size={18} />
                      </button>
                      {user.rol !== 'ADMIN' && (
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-400 hover:text-red-300 transition"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Creación */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 max-w-md w-full border border-cyan-500/30">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-white">Crear Nuevo Usuario</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setFormData({ nombre: '', email: '', password: '', rol: 'COMPRADOR', tienda: '', ruc: '', telefono: '' })
                }}
                className="text-gray-400 hover:text-white transition"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Nombre Completo *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Correo Electrónico *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Contraseña *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="input-field"
                  required
                  minLength="6"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Rol *</label>
                <select
                  value={formData.rol}
                  onChange={(e) => setFormData({...formData, rol: e.target.value})}
                  className="input-field"
                >
                  <option value="COMPRADOR">Comprador</option>
                  <option value="VENDEDOR">Vendedor</option>
                </select>
              </div>
              
              {formData.rol === 'VENDEDOR' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Nombre de Tienda</label>
                    <input
                      type="text"
                      value={formData.tienda}
                      onChange={(e) => setFormData({...formData, tienda: e.target.value})}
                      className="input-field"
                      placeholder="Mi Tienda Tech"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">RUC</label>
                    <input
                      type="text"
                      value={formData.ruc}
                      onChange={(e) => setFormData({...formData, ruc: e.target.value})}
                      className="input-field"
                      placeholder="20567890123"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Teléfono</label>
                    <input
                      type="text"
                      value={formData.telefono}
                      onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                      className="input-field"
                      placeholder="987654321"
                    />
                  </div>
                </>
              )}
              
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">Crear Usuario</button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setFormData({ nombre: '', email: '', password: '', rol: 'COMPRADOR', tienda: '', ruc: '', telefono: '' })
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalle */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 max-w-md w-full border border-cyan-500/30">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-white">{selectedUser.nombre}</h3>
              <button 
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-white transition"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-gray-500 text-sm">ID</p>
                <p className="text-white">{selectedUser.id}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Email</p>
                <p className="text-white">{selectedUser.email}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Rol</p>
                <p className="text-white">{selectedUser.rol}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Estado</p>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  selectedUser.activo ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {selectedUser.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Fecha Registro</p>
                <p className="text-white">{selectedUser.fechaRegistro ? new Date(selectedUser.fechaRegistro).toLocaleDateString() : 'N/A'}</p>
              </div>
              {selectedUser.rol === 'VENDEDOR' && (
                <>
                  <div>
                    <p className="text-gray-500 text-sm">Tienda</p>
                    <p className="text-white">{selectedUser.tienda || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">RUC</p>
                    <p className="text-white">{selectedUser.ruc || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Teléfono</p>
                    <p className="text-white">{selectedUser.telefono || 'N/A'}</p>
                  </div>
                </>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="btn-secondary flex-1"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// SOLICITUDES DE VENDEDORES (ADMIN)
// ============================================
const VendorRequestsPage = () => {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const { showSuccess, showError } = useNotification()

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    setLoading(true)
    const data = await productService.getAllRequests()
    setRequests(data)
    setLoading(false)
  }

  const handleApprove = async (requestId, approved) => {
    const result = await productService.approveRequest(requestId, approved)
    if (result.success) {
      showSuccess(approved ? 'Solicitud aprobada' : 'Solicitud rechazada')
      loadRequests()
    } else {
      showError(result.error)
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Cargando solicitudes...</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-white">Solicitudes de Vendedores</h2>
      
      <div className="card overflow-hidden">
        {requests.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No hay solicitudes pendientes</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50 border-b border-gray-700">
                <tr className="text-left text-gray-400 text-sm">
                  <th className="p-4">ID</th>
                  <th className="p-4">Producto</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition">
                    <td className="p-4 text-gray-300 text-sm">#{req.id}</td>
                    <td className="p-4 text-white">{req.productoNombre}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        req.tipo === 'MODIFICACION' 
                          ? 'bg-blue-500/20 text-blue-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {req.tipo}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        req.estado === 'APROBADA' 
                          ? 'bg-green-500/20 text-green-400'
                          : req.estado === 'RECHAZADA'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {req.estado}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 text-sm">
                      {new Date(req.fecha).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      {req.estado === 'PENDIENTE' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(req.id, true)}
                            className="text-green-400 hover:text-green-300 transition"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            onClick={() => handleApprove(req.id, false)}
                            className="text-red-400 hover:text-red-300 transition"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// REPORTES (ADMIN)
// ============================================
const ReportsPage = () => {
  const [reports, setReports] = useState([])
  const [reportType, setReportType] = useState('VENTAS_POR_VENDEDOR')
  const [loading, setLoading] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState('all')
  const [vendedores, setVendedores] = useState([])
  const { showSuccess, showError } = useNotification()

  useEffect(() => {
    loadVendedores()
    loadReport()
  }, [])

  const loadVendedores = async () => {
    const users = await userService.getAllUsers()
    setVendedores(users.filter(u => u.rol === 'VENDEDOR'))
  }

  const loadReport = async () => {
    setLoading(true)
    try {
      const vendorId = selectedVendor !== 'all' ? parseInt(selectedVendor) : null
      const data = await productService.getReports(reportType, vendorId)
      setReports(data)
    } catch (error) {
      showError('Error al cargar el reporte')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadReport()
  }, [reportType, selectedVendor])

  const exportReport = () => {
    if (reports.length === 0) return
    const csv = reports.map(r => Object.values(r).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte_${reportType}_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    showSuccess('Reporte exportado exitosamente')
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Reportes y Estadísticas</h2>
        <button
          onClick={exportReport}
          className="btn-primary flex items-center gap-2"
          disabled={reports.length === 0}
        >
          <Download size={18} />
          Exportar CSV
        </button>
      </div>
      
      <div className="card p-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-1 text-gray-300">Tipo de Reporte</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="input-field"
            >
              <option value="VENTAS_POR_VENDEDOR">Ventas por Vendedor</option>
              <option value="VENTAS_POR_MES">Ventas por Mes</option>
              <option value="PRODUCTOS_POPULARES">Productos Más Vendidos</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-1 text-gray-300">Vendedor</label>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="input-field"
            >
              <option value="all">Todos los Vendedores</option>
              {vendedores.map(v => (
                <option key={v.id} value={v.id}>{v.nombre}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={loadReport} className="btn-secondary flex items-center gap-2">
              <Filter size={18} />
              Filtrar
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            </div>
          ) : reports.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No hay datos disponibles para este reporte</p>
          ) : (
            <table className="w-full">
              <thead className="border-b border-gray-700">
                <tr className="text-left text-gray-400 text-sm">
                  {Object.keys(reports[0]).map(key => (
                    <th key={key} className="p-3">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map((item, index) => (
                  <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/30 transition">
                    {Object.values(item).map((value, i) => (
                      <td key={i} className="p-3 text-gray-300">
                        {typeof value === 'number' ? 
                          value.toFixed ? `S/ ${value.toFixed(2)}` : value 
                          : value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// ADMIN PAGE PRINCIPAL
// ============================================
const AdminPage = () => {
  const location = useLocation()
  
  const menuItems = [
    { path: '', label: 'Dashboard', icon: <LayoutGrid size={18} /> },
    { path: 'products', label: 'Productos', icon: <Package size={18} /> },
    { path: 'users', label: 'Usuarios', icon: <Users size={18} /> },
    { path: 'requests', label: 'Solicitudes', icon: <Clock size={18} /> },
    { path: 'reports', label: 'Reportes', icon: <BarChart3 size={18} /> },
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
          <Route path="requests" element={<VendorRequestsPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Routes>
      </div>
    </div>
  )
}

export default AdminPage