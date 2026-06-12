//src\pages\ProductDetailPage.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useNotification } from '../contexts/NotificationContext'
import { productService } from '../services/productService'
import { ShoppingCart, ArrowLeft, Star, Truck, Shield, RefreshCw } from 'lucide-react'

const ProductDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const { addToCart } = useCart()
  const { showSuccess } = useNotification()

  useEffect(() => {
    loadProduct()
  }, [id])

  const loadProduct = async () => {
    setLoading(true)
    const data = await productService.getProductById(id)
    setProduct(data)
    setLoading(false)
  }

  const handleAddToCart = () => {
    if (product && product.stock > 0) {
      addToCart(product, quantity)
      showSuccess(`${product.nombre} agregado al carrito x${quantity}`)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Producto no encontrado</h2>
        <button onClick={() => navigate('/products')} className="btn-primary">
          Volver al catálogo
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <button
        onClick={() => navigate('/products')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
      >
        <ArrowLeft size={20} />
        Volver a productos
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Imagen del producto */}
        <div className="card overflow-hidden">
          <img
            src={product.imagen || 'https://via.placeholder.com/600x400?text=ByteVerse'}
            alt={product.nombre}
            className="w-full h-auto object-cover"
          />
        </div>

        {/* Información del producto */}
        <div>
          <div className="mb-4">
            <span className="text-sm text-indigo-600 font-semibold">{product.categoria}</span>
            <h1 className="text-3xl font-bold mt-2">{product.nombre}</h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} fill="currentColor" stroke="none" />
                ))}
              </div>
              <span className="text-gray-500 text-sm">(124 reseñas)</span>
            </div>
          </div>

          <p className="text-gray-600 mb-6">{product.descripcion}</p>

          <div className="mb-6">
            <span className="text-4xl font-bold text-indigo-600">
              S/ {product.precio.toFixed(2)}
            </span>
            {product.stock > 0 && (
              <span className="ml-4 text-green-600 text-sm">Stock disponible: {product.stock}</span>
            )}
          </div>

          {/* Selector de cantidad */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-gray-700">Cantidad:</span>
            <div className="flex items-center border rounded-lg">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3 py-2 hover:bg-gray-100 transition"
              >
                -
              </button>
              <span className="w-12 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                className="px-3 py-2 hover:bg-gray-100 transition"
              >
                +
              </button>
            </div>
          </div>

          {/* Botón de compra */}
          <button
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
            className="btn-primary w-full py-3 text-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ShoppingCart size={20} />
            {product.stock > 0 ? 'Agregar al Carrito' : 'Agotado'}
          </button>

          {/* Beneficios */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-indigo-600" />
                <span className="text-sm">Envío gratis</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-indigo-600" />
                <span className="text-sm">Garantía 1 año</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw size={18} className="text-indigo-600" />
                <span className="text-sm">30 días de devolución</span>
              </div>
              <div className="flex items-center gap-2">
                <Star size={18} className="text-indigo-600" />
                <span className="text-sm">Calidad garantizada</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetailPage