// src/components/visitor/ProductDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  StarIcon, 
  ShoppingCartIcon, 
  HeartIcon,
  ArrowLeftIcon,
  TruckIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  CubeIcon,
  UserIcon,
  TagIcon
} from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const { addToCart } = useCart();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (id) {
      fetchProduct();
      fetchReviews();
      if (isAuthenticated && user) {
        checkWishlist();
      }
    }
  }, [id, isAuthenticated]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/products/${id}`);
      console.log('📦 Producto:', response.data);
      setProduct(response.data);
    } catch (error) {
      console.error('❌ Error fetching product:', error);
      toast.error('Producto no encontrado');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await api.get(`/reviews?productId=${id}`);
      setReviews(response.data);
      
      if (response.data.length > 0) {
        const avg = response.data.reduce((acc, r) => acc + r.rating, 0) / response.data.length;
        setAverageRating(avg);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const checkWishlist = async () => {
    try {
      if (!user || !user.id) return;
      const response = await api.get(`/wishlist/${user.id}`);
      const inWishlist = response.data.some(item => item.productId === id);
      setIsInWishlist(inWishlist);
    } catch (error) {
      console.error('Error checking wishlist:', error);
    }
  };

  // ✅ Manejar "Agregar al carrito" para visitantes
  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast.error('⚠️ Debes iniciar sesión para agregar productos al carrito');
      navigate('/login');
      return;
    }
    
    if (!product) {
      toast.error('Producto no disponible');
      return;
    }

    const productData = {
      ...product,
      _id: product._id || product.id || id,
      vendedorId: product.vendedorId || '',
      vendedorNombre: product.vendedorNombre || '',
      stock: product.stock || 0
    };

    addToCart(productData, quantity);
  };

  // ✅ Manejar "Comprar ahora"
  const handleBuyNow = () => {
    if (!isAuthenticated) {
      toast.error('⚠️ Debes iniciar sesión para comprar');
      navigate('/login');
      return;
    }
    
    if (!product) {
      toast.error('Producto no disponible');
      return;
    }

    const productData = {
      ...product,
      _id: product._id || product.id || id,
      vendedorId: product.vendedorId || '',
      vendedorNombre: product.vendedorNombre || '',
      stock: product.stock || 0
    };

    addToCart(productData, quantity);
    navigate('/checkout');
  };

  const handleToggleWishlist = async () => {
    if (!isAuthenticated) {
      toast.error('⚠️ Debes iniciar sesión para usar wishlist');
      navigate('/login');
      return;
    }

    try {
      if (isInWishlist) {
        await api.delete(`/wishlist/${user.id}/${id}`);
        setIsInWishlist(false);
        toast.success('Eliminado de wishlist');
      } else {
        await api.post('/wishlist', {
          userId: user.id,
          productId: id,
          productName: product.nombre,
          productPrice: product.precio,
          productImage: product.imagen
        });
        setIsInWishlist(true);
        toast.success('Agregado a wishlist');
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      toast.error('Error al actualizar wishlist');
    }
  };

  // ✅ Renderizar estrellas
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(<StarIcon key={i} className="w-5 h-5 text-yellow-400" />);
      } else {
        stars.push(<StarOutlineIcon key={i} className="w-5 h-5 text-gray-300" />);
      }
    }
    return stars;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Cargando producto...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Producto no encontrado</p>
          <Link to="/products" className="btn-primary mt-4 inline-block">
            Ver productos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link to="/products" className="flex items-center gap-2 text-primary-600 hover:text-primary-700">
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Volver a productos</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-8">
            {/* Imagen */}
            <div className="bg-gray-100 rounded-xl overflow-hidden">
              <img
                src={product.imagen || 'https://via.placeholder.com/600x400?text=Producto'}
                alt={product.nombre}
                className="w-full h-96 object-cover"
              />
            </div>

            {/* Información */}
            <div className="space-y-6">
              {/* Categoría y nombre */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TagIcon className="w-5 h-5 text-primary-600" />
                  <span className="text-sm text-primary-600 font-medium">{product.categoria || 'General'}</span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900">{product.nombre}</h1>
              </div>

              {/* Rating */}
              {reviews.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {renderStars(Math.round(averageRating))}
                  </div>
                  <span className="text-sm text-gray-600">
                    ({reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'})
                  </span>
                </div>
              )}

              {/* Precio */}
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-primary-600">
                  S/ {product.precio?.toFixed(2)}
                </span>
                {product.tieneIGV && (
                  <span className="text-sm text-gray-500">+ IGV (18%)</span>
                )}
              </div>

              {/* Descripción */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-semibold text-gray-900 mb-2">Descripción</h3>
                <p className="text-gray-600">{product.descripcion || 'Sin descripción'}</p>
              </div>

              {/* Stock y vendedor */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <CubeIcon className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-500">Stock</p>
                    <p className={`font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {product.stock > 0 ? `${product.stock} unidades` : 'Agotado'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-500">Vendedor</p>
                    <p className="font-medium text-gray-900">{product.vendedorNombre || 'ByteVerse Store'}</p>
                  </div>
                </div>
              </div>

              {/* Beneficios */}
              <div className="flex flex-wrap gap-4">
                {product.deliveryGratis && (
                  <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                    <TruckIcon className="w-5 h-5 text-green-600" />
                    <span className="text-green-700 font-medium text-sm">Envío gratis</span>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg">
                  <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                  <span className="text-blue-700 font-medium text-sm">Compra segura</span>
                </div>
              </div>

              {/* Cantidad y acciones */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700">Cantidad:</label>
                    <div className="flex items-center border border-gray-300 rounded-lg">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-l-lg transition-colors"
                        disabled={quantity <= 1}
                      >
                        -
                      </button>
                      <span className="w-12 text-center font-semibold">{quantity}</span>
                      <button
                        onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                        className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-r-lg transition-colors"
                        disabled={quantity >= product.stock}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 flex-1">
                    <button
                      onClick={handleAddToCart}
                      className="btn-secondary flex-1 flex items-center justify-center gap-2"
                      disabled={product.stock === 0}
                    >
                      <ShoppingCartIcon className="w-5 h-5" />
                      Agregar al carrito
                    </button>
                    <button
                      onClick={handleBuyNow}
                      className="btn-primary flex-1 flex items-center justify-center gap-2"
                      disabled={product.stock === 0}
                    >
                      Comprar ahora
                    </button>
                    <button
                      onClick={handleToggleWishlist}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        isInWishlist 
                          ? 'border-red-500 bg-red-50 text-red-500' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <HeartIcon className={`w-6 h-6 ${isInWishlist ? 'fill-red-500' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;