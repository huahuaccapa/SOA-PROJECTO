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

  // ✅ AGREGAR AL CARRITO - ACTUALIZADO
  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast.error('Inicia sesión para agregar al carrito');
      return;
    }
    
    if (!product) {
      toast.error('Producto no disponible');
      return;
    }

    // ✅ Asegurar que el producto tenga todos los campos necesarios
    const productData = {
      ...product,
      _id: product._id || product.id || id,
      vendedorId: product.vendedorId || '',
      vendedorNombre: product.vendedorNombre || '',
      stock: product.stock || 0
    };

    addToCart(productData, quantity);
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
        {/* ... resto del componente igual ... */}
      </div>
    </div>
  );
};

export default ProductDetail;