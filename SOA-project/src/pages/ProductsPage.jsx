//src\pages\ProductsPage.jsx
import React, { useState, useEffect } from 'react'
import { productService } from '../services/productService'
import { useCart } from '../contexts/CartContext'
import { useNotification } from '../contexts/NotificationContext'
import { Search, Filter, ShoppingCart } from 'lucide-react'

const ProductsPage = () => {
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [categories, setCategories] = useState([])
  const { addToCart } = useCart()
  const { showSuccess } = useNotification()

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    const data = await productService.getAllProducts()
    setProducts(data)
    setFilteredProducts(data)
    
    const uniqueCategories = [...new Set(data.map(p => p.categoria))]
    setCategories(uniqueCategories)
    setLoading(false)
  }

  useEffect(() => {
    let filtered = products
    
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(p => p.categoria === selectedCategory)
    }
    
    setFilteredProducts(filtered)
  }, [searchTerm, selectedCategory, products])

  const handleAddToCart = (product) => {
    addToCart(product, 1)
    showSuccess(`${product.nombre} agregado al carrito`)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Catálogo de Productos</h1>
        
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-field pl-10 appearance-none"
            >
              <option value="">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No se encontraron productos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <div key={product.id} className="card overflow-hidden hover:shadow-xl transition-all duration-300">
              <div className="relative h-48 overflow-hidden bg-gray-100">
                <img
                  src={product.imagen || 'https://via.placeholder.com/300x200?text=Producto'}
                  alt={product.nombre}
                  className="w-full h-full object-cover hover:scale-110 transition duration-500"
                />
                {product.stock <= 0 && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                    Agotado
                  </div>
                )}
              </div>
              
              <div className="p-4">
                <div className="text-xs text-indigo-600 font-semibold mb-1">{product.categoria}</div>
                <h3 className="font-semibold text-lg mb-2 line-clamp-1">{product.nombre}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.descripcion}</p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-indigo-600">
                    S/ {product.precio.toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stock <= 0}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProductsPage