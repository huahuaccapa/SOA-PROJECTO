//src\pages\AdminPage.jsx
import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { productService } from '../services/productService'
import { orderService } from '../services/orderService'
import { useNotification } from '../contexts/NotificationContext'
import { LayoutGrid, Package, Users, Settings, Plus, Edit, Trash2, Eye } from 'lucide-react'

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
  })
  const { token } = useAuth()

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    const products = await productService.getAllProducts()
    const orders = await orderService.getOrders(token)
    
    setStats({
      totalProducts: products.length,
      totalOrders: orders.length,
      totalUsers: 1248,
      totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
    })
  }

  const statCards = [
    { title: 'Productos', value: stats.totalProducts, icon: <Package className="w-6 h-6" />, color: 'bg-blue-500' },
    { title: 'Pedidos', value: stats.totalOrders, icon: <LayoutGrid className="w-6 h-6" />, color: 'bg-green-500' },
    { title: 'Usuarios', value: stats.totalUsers, icon: <Users className="w-6 h-6" />, color: 'bg-purple-500' },
    { title: 'Ingresos', value: `S/ ${stats.totalRevenue.toFixed(2)}`, icon: <Settings className="w-6 h-6" />, color: 'bg-indigo-500' },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Panel de Administración</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div key={index} className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{stat.title}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg text-white`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Recent Orders */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Pedidos Recientes</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr className="text-left text-gray-600">
                <th className="pb-2">ID</th>
                <th className="pb-2">Usuario</th>
                <th className="pb-2">Total</th>
                <th className="pb-2">Estado</th>
                <th className="pb-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map(i => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-3">#{1000 + i}</td>
                  <td className="py-3">usuario{i}@byteverse.com</td>
                  <td className="py-3">S/ {(Math.random() * 5000).toFixed(2)}</td>
                  <td className="py-3">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
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
      // Update product
      const result = await productService.updateProduct(editingProduct.id, productData)
      if (result.success) {
        showSuccess('Producto actualizado')
        loadProducts()
        setShowModal(false)
        resetForm()
      }
    } else {
      // Create product
      const result = await productService.createProduct(productData)
      if (result.success) {
        showSuccess('Producto creado')
        loadProducts()
        setShowModal(false)
        resetForm()
      }
    }
  }

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar este producto?')) {
      const result = await productService.deleteProduct(id)
      if (result.success) {
        showSuccess('Producto eliminado')
        loadProducts()
      }
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      precio: '',
      stock: '',
      categoria: '',
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
    })
    setShowModal(true)
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Cargando...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Gestión de Productos</h2>
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
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-600">
                <th className="p-4">ID</th>
                <th className="p-4">Producto</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Precio</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{product.id}</td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{product.nombre}</p>
                      <p className="text-sm text-gray-500">{product.descripcion?.substring(0, 50)}</p>
                    </div>
                  </td>
                  <td className="p-4">{product.categoria || '-'}</td>
                  <td className="p-4">S/ {product.precio.toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {product.stock} unidades
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button onClick={() => editProduct(product)} className="text-blue-500 hover:text-blue-600">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="text-red-500 hover:text-red-600">
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
      
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  className="input-field"
                  rows="3"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Precio</label>
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
                  <label className="block text-sm font-medium mb-1">Stock</label>
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
                <label className="block text-sm font-medium mb-1">Categoría</label>
                <input
                  type="text"
                  value={formData.categoria}
                  onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                  className="input-field"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  Guardar
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
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'hover:bg-gray-50'
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
          <Route path="users" element={
            <div className="card p-6">
              <h2 className="text-2xl font-bold mb-4">Gestión de Usuarios</h2>
              <p className="text-gray-500">Módulo en construcción...</p>
            </div>
          } />
        </Routes>
      </div>
    </div>
  )
}

export default AdminPage