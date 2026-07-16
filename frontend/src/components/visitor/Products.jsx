// src/components/visitor/Products.jsx
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

const Products = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('categoria') || '');
  const [categories, setCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [selectedCategory]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const url = selectedCategory 
        ? `/products?categoria=${encodeURIComponent(selectedCategory)}` 
        : '/products';
      console.log('📦 Fetching products:', url);
      const response = await api.get(url);
      console.log('✅ Productos recibidos:', response.data.length);
      setProducts(response.data);
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/products');
      const uniqueCategories = [...new Set(response.data.map(p => p.categoria).filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // ✅ Manejar "Agregar al carrito" para visitantes
  const handleAddToCart = (product) => {
    if (!isAuthenticated) {
      toast.error('⚠️ Debes iniciar sesión para agregar productos al carrito');
      navigate('/login');
      return;
    }

    const productData = {
      ...product,
      _id: product._id || product.id,
      vendedorId: product.vendedorId || '',
      vendedorNombre: product.vendedorNombre || '',
      stock: product.stock || 0
    };

    addToCart(productData);
  };

  // ✅ Manejar clic en producto para visitantes
  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = (product.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (product.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="commerce-catalog-page">
      <div className="commerce-shell">
        {/* Header */}
        <div className="commerce-catalog-header">
          <span className="commerce-eyebrow">Tecnología seleccionada</span><h1>Catálogo de productos</h1><p>Encuentra equipos y accesorios pensados para trabajar, crear y disfrutar.</p>
          
          {/* Search and Filters */}
          <div className="commerce-search-row">
            <div className="commerce-search-box">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="commerce-search-input"
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden btn-secondary flex items-center justify-center gap-2"
            >
              <FunnelIcon className="w-5 h-5" />
              Filtros
            </button>
          </div>

          {/* Categories */}
          <div className={`commerce-filter-chips ${showFilters ? 'is-open' : ''}`}>
            <button
              onClick={() => setSelectedCategory('')}
              className={`commerce-filter-chip ${
                selectedCategory === ''
                  ? 'is-active'
                  : ''
              }`}
            >
              Todos
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`commerce-filter-chip ${
                  selectedCategory === category
                    ? 'is-active'
                    : ''
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Cargando productos...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No se encontraron productos</p>
          </div>
        ) : (
          <div className="commerce-product-grid">
            {filteredProducts.map((product) => (
              <article key={product._id || product.id} className="commerce-product-card group">
                <div 
                  className="commerce-product-media"
                  onClick={() => handleProductClick(product._id || product.id)}
                >
                  <img
                    src={product.imagen || 'https://via.placeholder.com/300x200?text=Producto'}
                    alt={product.nombre || 'Producto'}
                    className="commerce-product-image"
                  />
                  <div className="commerce-product-badge">
                    {product.categoria || 'General'}
                  </div>
                  {product.stock === 0 && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">Agotado</span>
                    </div>
                  )}
                </div>
                
                <div className="commerce-product-content">
                  <div 
                    className="cursor-pointer"
                    onClick={() => handleProductClick(product._id || product.id)}
                  >
                    <h3 className="commerce-product-title">
                      {product.nombre || 'Producto'}
                    </h3>
                  </div>
                  <p className="commerce-product-description">{product.descripcion || ''}</p>
                  
                  <div className="commerce-product-purchase">
                    <div>
                      <span className="commerce-product-price">
                        S/ {(product.precio || 0).toFixed(2)}
                      </span>
                      {product.tieneIGV && (
                        <span className="text-xs text-gray-500 ml-1">+IGV</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="commerce-add-button"
                      disabled={product.stock === 0}
                    >
                      {product.stock === 0 ? 'Sin Stock' : 'Agregar'}
                    </button>
                  </div>
                  
                  <div className="commerce-product-status">
                    <span className={`${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {product.stock > 0 ? `✔ ${product.stock} unidades` : '✖ Sin Stock'}
                    </span>
                    {product.deliveryGratis && (
                      <span className="text-green-600 font-medium">🚚 Envío gratis</span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;