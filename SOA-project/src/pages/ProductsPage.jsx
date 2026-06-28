// src\pages\ProductsPage.jsx
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom' // ← IMPORTANTE: importar Link
import { productService } from '../services/productService'
import { useCart } from '../contexts/CartContext'
import { useNotification } from '../contexts/NotificationContext'
import { Search, Filter, ShoppingCart, Eye } from 'lucide-react'

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

  const handleAddToCart = (e, product) => {
    e.preventDefault() // ← Evita que el Link navegue
    e.stopPropagation() // ← Evita propagación
    addToCart(product, 1)
    showSuccess(`${product.nombre} agregado al carrito`)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4 text-white">Catálogo de Productos</h1>
      
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
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

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No se encontraron productos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <Link 
              key={product.id} 
              to={`/products/${product.id}`}
              className="block transition-transform duration-300 hover:scale-[1.02]"
            >
              <div className="card overflow-hidden hover:shadow-xl transition-all duration-300 h-full flex flex-col">
                <div className="relative h-48 overflow-hidden bg-gray-800">
                  <img
                    src={product.imagen || 'https://via.placeholder.com/300x200?text=ByteVerse'}
                    alt={product.nombre}
                    className="w-full h-full object-cover hover:scale-110 transition duration-500"
                  />
                  {product.stock <= 0 && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      Agotado
                    </div>
                  )}
                  {!product.activo && (
                    <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                      Inactivo
                    </div>
                  )}
                  
                  {/* Botón Ver Detalle - Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <span className="bg-cyan-500/90 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                      <Eye size={18} />
                      Ver Detalle
                    </span>
                  </div>
                </div>
                
                <div className="p-4 flex flex-col flex-1">
                  <div className="text-xs text-cyan-400 font-semibold mb-1">{product.categoria || 'General'}</div>
                  <h3 className="font-semibold text-lg mb-2 line-clamp-1 text-white">{product.nombre}</h3>
                  <p className="text-gray-400 text-sm mb-3 line-clamp-2 flex-1">{product.descripcion}</p>
                  
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-700/50">
                    <span className="text-2xl font-bold text-cyan-400">
                      S/ {product.precio.toFixed(2)}
                    </span>
                    <button
                      onClick={(e) => handleAddToCart(e, product)}
                      disabled={product.stock <= 0 || !product.activo}
                      className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white p-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110"
                    >
                      <ShoppingCart size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProductsPage