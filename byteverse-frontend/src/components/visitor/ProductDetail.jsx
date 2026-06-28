import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { StarIcon, ShoppingCartIcon, HeartIcon } from '@heroicons/react/24/solid';
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
    fetchProduct();
    fetchReviews();
    if (isAuthenticated) {
      checkWishlist();
    }
  }, [id, isAuthenticated]);

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/products/${id}`);
      setProduct(response.data);
    } catch (error) {
      console.error('Error fetching product:', error);
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
      const response = await api.get(`/wishlist/${user.id}`);
      const inWishlist = response.data.some(item => item.productId === id);
      setIsInWishlist(inWishlist);
    } catch (error) {
      console.error('Error checking wishlist:', error);
    }
  };

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast.error('Inicia sesión para agregar al carrito');
      return;
    }
    addToCart(product, quantity);
  };

  const handleToggleWishlist = async () => {
    if (!isAuthenticated) {
      toast.error('Inicia sesión para usar wishlist');
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
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
            {/* Product Image */}
            <div className="relative">
              <img
                src={product.imagen || 'https://via.placeholder.com/600x400?text=Producto'}
                alt={product.nombre}
                className="w-full h-[400px] object-cover rounded-xl"
              />
              {product.stock === 0 && (
                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center rounded-xl">
                  <span className="text-white font-bold text-2xl">Agotado</span>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex flex-col">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.nombre}</h1>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="bg-primary-100 text-primary-800 text-sm font-medium px-3 py-1 rounded-full">
                      {product.categoria}
                    </span>
                    {product.deliveryGratis && (
                      <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                        🚚 Envío gratis
                      </span>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={handleToggleWishlist}
                  className="p-3 rounded-full hover:bg-red-50 transition-colors"
                >
                  {isInWishlist ? (
                    <HeartIcon className="w-8 h-8 text-red-500" />
                  ) : (
                    <HeartIcon className="w-8 h-8 text-gray-300 hover:text-red-500" />
                  )}
                </button>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star}>
                      {star <= Math.round(averageRating) ? (
                        <StarIcon className="w-5 h-5 text-yellow-400" />
                      ) : (
                        <StarOutlineIcon className="w-5 h-5 text-gray-300" />
                      )}
                    </span>
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  ({reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'})
                </span>
              </div>

              {/* Price */}
              <div className="mb-6">
                <span className="text-4xl font-bold text-primary-600">
                  S/ {product.precio.toFixed(2)}
                </span>
                {product.tieneIGV && (
                  <span className="text-sm text-gray-500 ml-2">(Incluye IGV)</span>
                )}
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Descripción</h3>
                <p className="text-gray-600 leading-relaxed">{product.descripcion}</p>
              </div>

              {/* Characteristics */}
              {product.caracteristicas && product.caracteristicas.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Características</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    {product.caracteristicas.map((char, index) => (
                      <li key={index}>{char}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Vendor Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Vendedor: <span className="font-semibold">{product.vendedorNombre}</span>
                </p>
              </div>

              {/* Quantity and Add to Cart */}
              <div className="flex items-center gap-4 mt-auto">
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-l-lg transition-colors"
                    disabled={quantity <= 1}
                  >
                    -
                  </button>
                  <span className="w-16 text-center font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-r-lg transition-colors"
                    disabled={product.stock <= quantity}
                  >
                    +
                  </button>
                </div>
                
                <button
                  onClick={handleAddToCart}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 py-3"
                  disabled={product.stock === 0}
                >
                  <ShoppingCartIcon className="w-5 h-5" />
                  {product.stock === 0 ? 'Agotado' : 'Agregar al Carrito'}
                </button>
              </div>

              <p className="text-sm text-gray-500 mt-2">
                {product.stock > 0 ? `${product.stock} unidades disponibles` : 'Sin stock disponible'}
              </p>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-8 bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold mb-6">Reseñas de Clientes</h2>
          
          {reviews.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No hay reseñas para este producto. ¡Sé el primero en opinar!
            </p>
          ) : (
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review._id} className="border-b border-gray-100 pb-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold">
                        {review.userName?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">{review.userName}</p>
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star}>
                              {star <= review.rating ? (
                                <StarIcon className="w-4 h-4 text-yellow-400" />
                              ) : (
                                <StarOutlineIcon className="w-4 h-4 text-gray-300" />
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  {review.title && (
                    <h3 className="font-semibold text-gray-900 mb-1">{review.title}</h3>
                  )}
                  <p className="text-gray-600">{review.comment}</p>
                  {review.verifiedPurchase && (
                    <p className="text-green-600 text-sm mt-2">✔ Compra verificada</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;