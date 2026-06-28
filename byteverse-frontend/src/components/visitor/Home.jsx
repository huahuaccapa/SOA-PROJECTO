import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      const response = await api.get('/products');
      setFeaturedProducts(response.data.slice(0, 8));
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product) => {
    if (!isAuthenticated) {
      toast.error('Inicia sesión para agregar al carrito');
      return;
    }
    addToCart(product);
  };

  const categories = [
    { name: 'Laptops', icon: '💻', color: 'from-blue-500 to-blue-600' },
    { name: 'Smartphones', icon: '📱', color: 'from-purple-500 to-purple-600' },
    { name: 'Tablets', icon: '📋', color: 'from-green-500 to-green-600' },
    { name: 'Accesorios', icon: '🎧', color: 'from-orange-500 to-orange-600' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-20">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-fade-in">
              ¡Bienvenido a ByteVerse!
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100 max-w-3xl mx-auto">
              Descubre la mejor tecnología al mejor precio. Encuentra lo que necesitas en nuestro catálogo.
            </p>
            <Link to="/products" className="btn-primary bg-white text-primary-600 hover:bg-gray-100 text-lg px-8 py-3">
              Ver Productos
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Categorías</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link
                key={category.name}
                to={`/products?categoria=${category.name}`}
                className={`bg-gradient-to-r ${category.color} p-6 rounded-xl text-white text-center transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl`}
              >
                <div className="text-4xl mb-3">{category.icon}</div>
                <h3 className="font-semibold text-lg">{category.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Productos Destacados</h2>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <div key={product._id} className="card group">
                  <div className="relative overflow-hidden">
                    <img
                      src={product.imagen || 'https://via.placeholder.com/300x200?text=Producto'}
                      alt={product.nombre}
                      className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2 bg-primary-600 text-white px-2 py-1 rounded-lg text-xs font-semibold">
                      {product.categoria}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <Link to={`/product/${product._id}`}>
                      <h3 className="font-semibold text-lg mb-1 hover:text-primary-600 transition-colors">
                        {product.nombre}
                      </h3>
                    </Link>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.descripcion}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary-600">
                        S/ {product.precio.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="btn-primary text-sm px-4 py-2"
                        disabled={product.stock === 0}
                      >
                        {product.stock === 0 ? 'Sin Stock' : 'Agregar'}
                      </button>
                    </div>
                    
                    <div className="mt-2 text-sm text-gray-500">
                      {product.stock > 0 ? (
                        <span className="text-green-600">✔ En Stock</span>
                      ) : (
                        <span className="text-red-600">✖ Sin Stock</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {!loading && featuredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No hay productos disponibles</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;