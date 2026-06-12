import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useNotification } from '../contexts/NotificationContext'
import { productService } from '../services/productService'
import { ShoppingCart, ArrowLeft, Star, Truck, Shield, RefreshCw, CheckCircle, Cpu, Battery, Camera, Wifi, HardDrive, Zap } from 'lucide-react'

const ProductDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [relatedProducts, setRelatedProducts] = useState([])
  const { addToCart } = useCart()
  const { showSuccess } = useNotification()

  useEffect(() => {
    loadProduct()
  }, [id])

  const loadProduct = async () => {
    setLoading(true)
    const data = await productService.getProductById(id)
    setProduct(data)
    
    // Cargar productos relacionados de la misma categoría
    if (data) {
      const allProducts = await productService.getAllProducts()
      const related = allProducts.filter(p => p.categoria === data.categoria && p.id !== data.id).slice(0, 4)
      setRelatedProducts(related)
    }
    setLoading(false)
  }

  const handleAddToCart = () => {
    if (product && product.stock > 0 && product.activo) {
      addToCart(product, quantity)
      showSuccess(`${product.nombre} agregado al carrito x${quantity}`)
    }
  }

  // Función para obtener ícono según característica
  const getFeatureIcon = (feature) => {
    const lowerFeature = feature.toLowerCase()
    if (lowerFeature.includes('batería') || lowerFeature.includes('bateria')) return <Battery size={18} className="text-cyan-400" />
    if (lowerFeature.includes('cámara') || lowerFeature.includes('camara')) return <Camera size={18} className="text-cyan-400" />
    if (lowerFeature.includes('wifi') || lowerFeature.includes('bluetooth')) return <Wifi size={18} className="text-cyan-400" />
    if (lowerFeature.includes('disco') || lowerFeature.includes('ssd') || lowerFeature.includes('almacenamiento')) return <HardDrive size={18} className="text-cyan-400" />
    if (lowerFeature.includes('procesador') || lowerFeature.includes('intel') || lowerFeature.includes('ryzen')) return <Cpu size={18} className="text-cyan-400" />
    return <Zap size={18} className="text-cyan-400" />
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4 text-white">Producto no encontrado</h2>
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
        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-6 transition"
      >
        <ArrowLeft size={20} />
        Volver a productos
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Imagen del producto */}
        <div className="card overflow-hidden bg-gradient-to-br from-gray-800/50 to-gray-900/50">
          <img
            src={product.imagen || 'https://via.placeholder.com/600x400?text=ByteVerse'}
            alt={product.nombre}
            className="w-full h-auto object-cover"
          />
        </div>

        {/* Información del producto */}
        <div>
          <div className="mb-4">
            <span className="text-sm text-cyan-400 font-semibold bg-cyan-500/20 px-2 py-1 rounded-full">
              {product.categoria || 'General'}
            </span>
            <h1 className="text-3xl font-bold mt-2 text-white">{product.nombre}</h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} fill="currentColor" stroke="none" />
                ))}
              </div>
              <span className="text-gray-400 text-sm">(124 reseñas)</span>
            </div>
          </div>

          <p className="text-gray-300 mb-6">{product.descripcion}</p>

          {/* Características destacadas */}
          {product.caracteristicas && product.caracteristicas.length > 0 && (
            <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
              <h3 className="text-cyan-400 font-semibold mb-3 flex items-center gap-2">
                <CheckCircle size={18} />
                Características principales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {product.caracteristicas.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-gray-300 text-sm">
                    {getFeatureIcon(feature)}
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <span className="text-4xl font-bold text-cyan-400">
              S/ {product.precio.toFixed(2)}
            </span>
            {product.stock > 0 && product.activo ? (
              <span className="ml-4 text-green-400 text-sm">✓ Stock disponible: {product.stock}</span>
            ) : (
              <span className="ml-4 text-red-400 text-sm">✗ Producto no disponible</span>
            )}
          </div>

          {/* Selector de cantidad */}
          {product.stock > 0 && product.activo && (
            <div className="flex items-center gap-4 mb-6">
              <span className="text-gray-300">Cantidad:</span>
              <div className="flex items-center border border-cyan-500/30 rounded-lg bg-black/30">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 hover:bg-cyan-500/20 transition text-cyan-400"
                >
                  -
                </button>
                <span className="w-12 text-center text-white">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="px-3 py-2 hover:bg-cyan-500/20 transition text-cyan-400"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Botón de compra */}
          <button
            onClick={handleAddToCart}
            disabled={product.stock <= 0 || !product.activo}
            className="btn-primary w-full py-3 text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart size={20} />
            {product.stock > 0 && product.activo ? 'Agregar al Carrito' : 'Producto no disponible'}
          </button>

          {/* Beneficios */}
          <div className="mt-8 p-4 rounded-lg bg-black/30 border border-cyan-500/20">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-cyan-400" />
                <span className="text-sm text-gray-300">Envío gratis</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-cyan-400" />
                <span className="text-sm text-gray-300">Garantía 1 año</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw size={18} className="text-cyan-400" />
                <span className="text-sm text-gray-300">30 días de devolución</span>
              </div>
              <div className="flex items-center gap-2">
                <Star size={18} className="text-cyan-400" />
                <span className="text-sm text-gray-300">Calidad garantizada</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Productos relacionados */}
      {relatedProducts.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4 text-white">⭐ Productos relacionados</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map(relProduct => (
              <Link to={`/products/${relProduct.id}`} key={relProduct.id} className="card p-4 hover:shadow-xl transition hover:border-cyan-500/50">
                <img
                  src={relProduct.imagen || 'https://via.placeholder.com/150?text=Producto'}
                  alt={relProduct.nombre}
                  className="w-full h-32 object-cover rounded mb-2"
                />
                <h3 className="font-semibold text-white">{relProduct.nombre}</h3>
                <p className="text-cyan-400 font-bold">S/ {relProduct.precio.toFixed(2)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductDetailPage