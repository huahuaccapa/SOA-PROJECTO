import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRightIcon,
  BoltIcon,
  CheckBadgeIcon,
  ChevronRightIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../context/AuthContext';

const categories = [
  { name: 'Laptops', copy: 'Potencia para crear', icon: ComputerDesktopIcon, tone: 'indigo' },
  { name: 'Smartphones', copy: 'Todo, en tu mano', icon: DevicePhoneMobileIcon, tone: 'violet' },
  { name: 'Tablets', copy: 'Trabajo y diversión', icon: BoltIcon, tone: 'cyan' },
  { name: 'Accesorios', copy: 'Completa tu setup', icon: CpuChipIcon, tone: 'amber' },
];

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
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
    fetchFeaturedProducts();
  }, []);

  const handleAddToCart = (product) => {
    if (!isAuthenticated) {
      toast.error('Inicia sesión para agregar productos al carrito');
      navigate('/login');
      return;
    }
    addToCart(product);
  };

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
        <div className="page-shell hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><span /> Tecnología que sí te sigue el ritmo</div>
            <h1>Tu próximo gran <span>upgrade</span> empieza aquí.</h1>
            <p>
              Equipos originales, precios claros y soporte de personas que realmente entienden de tecnología.
            </p>
            <div className="hero-actions">
              <Link to="/products" className="hero-primary">Explorar catálogo <ArrowRightIcon /></Link>
              {!isAuthenticated && <Link to="/register" className="hero-secondary">Crear una cuenta</Link>}
            </div>
            <div className="hero-proof">
              <span><CheckBadgeIcon /> Productos verificados</span>
              <span><ShieldCheckIcon /> Pago protegido</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="Selección destacada de tecnología">
            <div className="tech-orbit orbit-one" />
            <div className="tech-orbit orbit-two" />
            <div className="device-stage">
              <div className="device-screen">
                <div className="device-toolbar"><i /><i /><i /></div>
                <div className="device-content">
                  <span className="device-pill">BYTEVERSE SELECT</span>
                  <strong>Rendimiento<br />sin límites.</strong>
                  <div className="device-lines"><i /><i /><i /></div>
                </div>
              </div>
              <div className="device-base" />
            </div>
            <div className="floating-card floating-rating">
              <span className="floating-icon">★</span>
              <div><strong>4.9/5</strong><small>clientes felices</small></div>
            </div>
            <div className="floating-card floating-shipping">
              <TruckIcon />
              <div><strong>Envío rápido</strong><small>a todo el Perú</small></div>
            </div>
            <div className="hero-price-tag"><small>Desde</small><strong>S/ 899</strong></div>
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <div className="page-shell trust-grid">
          <div><TruckIcon /><span><strong>Envíos nacionales</strong><small>Seguimiento de tu pedido</small></span></div>
          <div><ShieldCheckIcon /><span><strong>Compra protegida</strong><small>Pagos y datos seguros</small></span></div>
          <div><CheckBadgeIcon /><span><strong>Garantía real</strong><small>Productos seleccionados</small></span></div>
          <div><BoltIcon /><span><strong>Soporte experto</strong><small>Te ayudamos a elegir</small></span></div>
        </div>
      </section>

      <section className="section-block category-section">
        <div className="page-shell">
          <div className="section-heading">
            <div><span className="section-kicker">ENCUENTRA LO TUYO</span><h2>Compra por categoría</h2></div>
            <Link to="/products">Ver todo <ArrowRightIcon /></Link>
          </div>
          <div className="category-grid">
            {categories.map((category) => (
              <Link key={category.name} to={`/products?categoria=${category.name}`} className={`category-card category-${category.tone}`}>
                <span className="category-icon"><category.icon /></span>
                <div><h3>{category.name}</h3><p>{category.copy}</p></div>
                <ChevronRightIcon className="category-arrow" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section-block featured-section">
        <div className="page-shell">
          <div className="section-heading">
            <div><span className="section-kicker">SELECCIÓN BYTEVERSE</span><h2>Lo más buscado</h2></div>
            <Link to="/products">Explorar catálogo <ArrowRightIcon /></Link>
          </div>

          {loading ? (
            <div className="catalog-loading"><div className="spinner" /><p>Preparando la selección...</p></div>
          ) : featuredProducts.length > 0 ? (
            <div className="product-grid">
              {featuredProducts.map((product) => (
                <article key={product._id || product.id} className="product-card">
                  <Link to={`/product/${product._id || product.id}`} className="product-media">
                    <img src={product.imagen || '/favicon.svg'} alt={product.nombre} />
                    <span className="product-tag">{product.categoria || 'Tecnología'}</span>
                  </Link>
                  <div className="product-body">
                    <Link to={`/product/${product._id || product.id}`}><h3>{product.nombre}</h3></Link>
                    <p>{product.descripcion || 'Tecnología seleccionada para tu día a día.'}</p>
                    <div className="product-meta"><span>{product.stock > 0 ? 'Disponible' : 'Agotado'}</span><small>Stock: {product.stock}</small></div>
                    <div className="product-bottom">
                      <strong>S/ {Number(product.precio || 0).toFixed(2)}</strong>
                      <button type="button" onClick={() => handleAddToCart(product)} disabled={product.stock === 0} aria-label={`Agregar ${product.nombre} al carrito`}>
                        <ShoppingBagIcon />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-showcase">
              <span><ShoppingBagIcon /></span>
              <h3>El catálogo se está preparando</h3>
              <p>Cuando el servidor esté conectado, tus productos destacados aparecerán aquí automáticamente.</p>
              <Link to="/products">Ir al catálogo <ArrowRightIcon /></Link>
            </div>
          )}
        </div>
      </section>

      {!isAuthenticated && (
        <section className="cta-section">
          <div className="page-shell cta-card">
            <div><span className="section-kicker">MÁS SIMPLE. MÁS BYTEVERSE.</span><h2>Tu tecnología favorita, en un solo lugar.</h2><p>Crea tu cuenta para guardar tu carrito y consultar todos tus pedidos.</p></div>
            <div><Link to="/register" className="hero-primary">Empezar ahora <ArrowRightIcon /></Link><Link to="/login">Ya tengo una cuenta</Link></div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;
