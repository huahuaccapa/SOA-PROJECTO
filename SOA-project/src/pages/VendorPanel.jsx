import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { productService } from '../services/productService'
import { useNotification } from '../contexts/NotificationContext'
import { Package, Plus, Edit, Trash2, Clock, CheckCircle } from 'lucide-react'

const VendorPanel = () => {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [requests, setRequests] = useState([])
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
    loadRequests()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    const allProducts = await productService.getAllProducts()
    const myProducts = allProducts.filter(p => p.vendedorId === user?.id)
    setProducts(myProducts)
    setLoading(false)
  }

  const loadRequests = async () => {
    const data = await productService.getVendorRequests(user?.id)
    setRequests(data)
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const productData = {
      ...formData,
      precio: parseFloat(formData.precio),
      stock: parseInt(formData.stock),
      vendedorId: user.id,
      vendedorNombre: user.nombre,
      activo: true
    }
    
    let result
    if (editingProduct) {
      result = await productService.requestProductUpdate(editingProduct.id, productData)
      if (result.success) {
        showSuccess('Solicitud de modificación enviada al administrador')
        setShowModal(false)
        resetForm()
        loadRequests()
      }
    } else {
      result = await productService.createProduct(productData)
      if (result.success) {
        showSuccess('Producto creado exitosamente')
        loadProducts()
        setShowModal(false)
        resetForm()
      }
    }
  }

  const handleDeleteRequest = async (product) => {
    if (confirm(`¿Solicitar eliminación de "${product.nombre}"?`)) {
      const result = await productService.requestProductDeletion(product.id, user.id)
      if (result.success) {
        showSuccess('Solicitud de eliminación enviada al administrador')
        loadRequests()
      }
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mi Panel de Vendedor</h1>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Mis Productos</p>
              <p className="text-2xl font-bold">{products.length}</p>
            </div>
            <Package className="w-8 h-8 text-indigo-500" />
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Solicitudes Pendientes</p>
              <p className="text-2xl font-bold">{requests.filter(r => r.estado === 'PENDIENTE').length}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Aprobadas</p>
              <p className="text-2xl font-bold">{requests.filter(r => r.estado === 'APROBADA').length}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Mis Productos</h2>
        {loading ? (
          <p>Cargando...</p>
        ) : products.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No tienes productos aún. ¡Crea tu primero!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(product => (
              <div key={product.id} className="border rounded-lg p-4 hover:shadow-lg transition">
                <img
                  src={product.imagen || 'https://via.placeholder.com/300x200?text=Producto'}
                  alt={product.nombre}
                  className="w-full h-40 object-cover rounded mb-3"
                />
                <h3 className="font-semibold text-lg">{product.nombre}</h3>
                <p className="text-gray-600 text-sm mb-2 line-clamp-2">{product.descripcion}</p>
                <p className="text-indigo-600 font-bold text-xl">S/ {product.precio.toFixed(2)}</p>
                <p className="text-sm text-gray-500">Stock: {product.stock}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => editProduct(product)}
                    className="flex-1 btn-secondary text-sm py-1 flex items-center justify-center gap-1"
                  >
                    <Edit size={14} /> Editar
                  </button>
                  <button
                    onClick={() => handleDeleteRequest(product)}
                    className="flex-1 btn-danger text-sm py-1 flex items-center justify-center gap-1"
                  >
                    <Trash2 size={14} /> Eliminar
                  </button>
                </div>
                {!product.activo && (
                  <p className="text-xs text-red-500 mt-2">⚠️ Producto inactivo</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {requests.length > 0 && (
        <div className="card p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Mis Solicitudes</h2>
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.id} className="border rounded p-3 flex justify-between items-center">
                <div>
                  <p className="font-medium">{req.productoNombre}</p>
                  <p className="text-sm text-gray-500">Tipo: {req.tipo} - {new Date(req.fecha).toLocaleDateString()}</p>
                </div>
                <span className={`badge ${
                  req.estado === 'APROBADA' ? 'bg-green-100 text-green-800' :
                  req.estado === 'RECHAZADA' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {req.estado}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
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
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Características (separadas por coma)</label>
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
                  <label className="block text-sm font-medium mb-1">Precio (S/)</label>
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
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editingProduct ? 'Solicitar Cambios' : 'Publicar Producto'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
              </div>
              {editingProduct && (
                <p className="text-xs text-gray-500 text-center">
                  Los cambios serán revisados por un administrador antes de aplicarse.
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default VendorPanel