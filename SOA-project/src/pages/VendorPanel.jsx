// src\pages\VendorPanel.jsx
import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { productService } from '../services/productService'
import { orderService } from '../services/orderService'
import { useNotification } from '../contexts/NotificationContext'
import { 
  Package, Plus, Edit, Trash2, Clock, CheckCircle, 
  DollarSign, ShoppingBag, Users, TrendingUp,
  BarChart3, Eye, EyeOff, Download, Printer,
  Calendar, Filter, Search, X
} from 'lucide-react'

const VendorPanel = () => {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [requests, setRequests] = useState([])
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    pendingRequests: 0
  })
  const { showSuccess, showError } = useNotification()
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '',
    categoria: '',
    caracteristicas: [],
    tieneIGV: true,
    deliveryGratis: true,
    peso: '',
    dimensiones: '',
    garantia: '12 meses',
    imagen: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const allProducts = await productService.getAllProducts()
    const myProducts = allProducts.filter(p => p.vendedorId === user?.id)
    setProducts(myProducts)
    
    const myRequests = await productService.getVendorRequests(user?.id)
    setRequests(myRequests)
    
    const myOrders = await orderService.getOrdersByVendor(user?.id)
    setOrders(myOrders)
    
    setStats({
      totalProducts: myProducts.length,
      totalSales: myOrders.length,
      totalRevenue: myOrders.reduce((sum, o) => sum + o.total, 0),
      pendingRequests: myRequests.filter(r => r.estado === 'PENDIENTE').length
    })
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      precio: '',
      stock: '',
      categoria: '',
      caracteristicas: [],
      tieneIGV: true,
      deliveryGratis: true,
      peso: '',
      dimensiones: '',
      garantia: '12 meses',
      imagen: ''
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
      caracteristicas: product.caracteristicas || [],
      tieneIGV: product.tieneIGV !== undefined ? product.tieneIGV : true,
      deliveryGratis: product.deliveryGratis !== undefined ? product.deliveryGratis : true,
      peso: product.peso || '',
      dimensiones: product.dimensiones || '',
      garantia: product.garantia || '12 meses',
      imagen: product.imagen || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const productData = {
      ...formData,
      precio: parseFloat(formData.precio),
      stock: parseInt(formData.stock),
      vendedorId: user.id,
      vendedorNombre: user.nombre,
      activo: false // Los productos creados por vendedor necesitan aprobación
    }
    
    let result
    if (editingProduct) {
      result = await productService.requestProductUpdate(editingProduct.id, productData)
      if (result.success) {
        showSuccess('Solicitud de modificación enviada al administrador')
      }
    } else {
      result = await productService.createProduct(productData)
      if (result.success) {
        showSuccess('Producto creado exitosamente, pendiente de aprobación')
      }
    }
    
    if (result.success) {
      loadData()
      setShowModal(false)
      resetForm()
    } else {
      showError(result.error)
    }
  }

  const handleDeleteRequest = async (product) => {
    if (confirm(`¿Solicitar eliminación de "${product.nombre}"?`)) {
      const result = await productService.requestProductDeletion(product.id, user.id)
      if (result.success) {
        showSuccess('Solicitud de eliminación enviada al administrador')
        loadData()
      } else {
        showError(result.error)
      }
    }
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'APROBADA': return 'bg-green-500/20 text-green-400'
      case 'RECHAZADA': return 'bg-red-500/20 text-red-400'
      default: return 'bg-yellow-500/20 text-yellow-400'
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-gray-400">Cargando datos...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Mi Panel de Vendedor</h1>
          <p className="text-gray-400 mt-1">Bienvenido, {user?.nombre} • {user?.tienda || 'Sin tienda'}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2">
            <Download size={18} />
            Exportar
          </button>
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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider">Mis Productos</p>
              <p className="text-2xl font-bold text-white">{stats.totalProducts}</p>
            </div>
            <Package className="w-8 h-8 text-cyan-400 opacity-60" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider">Ventas Realizadas</p>
              <p className="text-2xl font-bold text-white">{stats.totalSales}</p>
            </div>
            <ShoppingBag className="w-8 h-8 text-green-400 opacity-60" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider">Ingresos Totales</p>
              <p className="text-2xl font-bold text-cyan-400">S/ {stats.totalRevenue.toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-yellow-400 opacity-60" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider">Solicitudes Pendientes</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.pendingRequests}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400 opacity-60" />
          </div>
        </div>
      </div>

      {/* Mis Productos */}
      <div className="card p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-cyan-400" />
          Mis Productos
        </h2>
        {products.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No tienes productos aún. ¡Crea tu primero!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(product => (
              <div key={product.id} className="border border-gray-700 rounded-lg p-4 hover:border-cyan-500/50 transition-all duration-300">
                <div className="relative h-40 mb-3 overflow-hidden rounded-lg bg-gray-800">
                  <img
                    src={product.imagen || 'https://via.placeholder.com/300x200?text=ByteVerse'}
                    alt={product.nombre}
                    className="w-full h-full object-cover"
                  />
                  {!product.activo && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                      Pendiente
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-lg text-white">{product.nombre}</h3>
                <p className="text-gray-400 text-sm mb-2 line-clamp-2">{product.descripcion}</p>
                <div className="flex justify-between items-center">
                  <span className="text-cyan-400 font-bold text-xl">S/ {product.precio.toFixed(2)}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    product.stock > 10 
                      ? 'bg-green-500/20 text-green-400' 
                      : product.stock > 0 
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    Stock: {product.stock}
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => editProduct(product)}
                    className="flex-1 btn-secondary text-sm py-1 flex items-center justify-center gap-1"
                  >
                    <Edit size={14} /> Editar
                  </button>
                  <button
                    onClick={() => handleDeleteRequest(product)}
                    className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm py-1 rounded-lg flex items-center justify-center gap-1 transition"
                  >
                    <Trash2 size={14} /> Eliminar
                  </button>
                </div>
                {product.activo === false && (
                  <p className="text-xs text-yellow-500 mt-2">⏳ Pendiente de aprobación del administrador</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Solicitudes */}
      {requests.length > 0 && (
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            Mis Solicitudes
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-700">
                <tr className="text-left text-gray-400 text-sm">
                  <th className="pb-2">Producto</th>
                  <th className="pb-2">Tipo</th>
                  <th className="pb-2">Estado</th>
                  <th className="pb-2">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id} className="border-b border-gray-800 last:border-0">
                    <td className="py-3 text-white">{req.productoNombre}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        req.tipo === 'MODIFICACION' 
                          ? 'bg-blue-500/20 text-blue-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {req.tipo}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(req.estado)}`}>
                        {req.estado}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500 text-sm">
                      {new Date(req.fecha).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                  <label className="block text-sm font-medium mb-1 text-gray-300">Dimensiones (cm)</label>
                  <input
                    type="text"
                    value={formData.dimensiones}
                    onChange={(e) => setFormData({...formData, dimensiones: e.target.value})}
                    className="input-field"
                    placeholder="35.4 x 25.9 x 2.3"
                  />
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
              
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-yellow-400 text-sm flex items-center gap-2">
                  <Clock size={16} />
                  Los productos creados por vendedores requieren aprobación del administrador
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editingProduct ? 'Solicitar Cambios' : 'Publicar Producto'}
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
    </div>
  )
}

export default VendorPanel