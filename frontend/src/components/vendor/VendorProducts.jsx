import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
  CheckBadgeIcon,
  CubeIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  TagIcon,
  TruckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const money = value => new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
}).format(Number(value || 0));

const asArray = value => Array.isArray(value) ? value : [];

export default function VendorProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('TODAS');
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await api.get('/products?activo=true');
        setProducts(asArray(response.data));
      } catch (error) {
        console.error(error);
        if (![401, 503].includes(error.response?.status)) toast.error('No se pudo cargar el catálogo', { id: 'vendor-products-load' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const categories = useMemo(() => ['TODAS', ...new Set(products.map(product => product.categoria).filter(Boolean))], [products]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter(product => {
      const matchesCategory = category === 'TODAS' || product.categoria === category;
      const matchesSearch = !term || `${product.nombre} ${product.descripcion || ''} ${product.categoria || ''}`.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [products, search, category]);

  if (loading) return <div className="min-h-screen grid place-items-center"><span className="loader-ring large" /></div>;

  return (
    <div className="commerce-catalog-page vendor-catalog-page">
      <div className="commerce-shell">
        <div className="commerce-page-header">
          <div>
            <span className="commerce-eyebrow">Consulta de inventario</span>
            <h1>Catálogo y stock</h1>
            <p>El vendedor puede consultar productos, características, precio y disponibilidad. La creación y edición corresponden al administrador.</p>
          </div>
          <button type="button" className="btn-primary" onClick={() => navigate('/vendor/pos')}><ShoppingCartIcon /> Abrir punto de venta</button>
        </div>

        <section className="commerce-panel catalog-toolbar-panel">
          <div className="commerce-search-box">
            <MagnifyingGlassIcon />
            <input className="commerce-search-input" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar productos por nombre o categoría" />
          </div>
          <div className="commerce-filter-chips is-open">
            {categories.map(item => <button type="button" key={item} className={`commerce-filter-chip ${category === item ? 'is-active' : ''}`} onClick={() => setCategory(item)}>{item === 'TODAS' ? 'Todos' : item}</button>)}
          </div>
        </section>

        <div className="commerce-product-grid vendor-product-grid">
          {filtered.map(product => (
            <article className="commerce-product-card" key={product.id || product._id}>
              <button type="button" className="commerce-product-media" onClick={() => setSelectedProduct(product)}>
                <img className="commerce-product-image" src={product.imagen || 'https://via.placeholder.com/420x300?text=Producto'} alt={product.nombre} />
                <span className="commerce-product-badge">{product.categoria || 'Tecnología'}</span>
                {Number(product.stock) <= 0 && <span className="product-soldout-overlay">Agotado</span>}
              </button>
              <div className="commerce-product-content">
                <h2 className="commerce-product-title">{product.nombre}</h2>
                <p className="commerce-product-description">{product.descripcion || 'Producto tecnológico disponible en ByteVerse.'}</p>
                <div className="commerce-product-purchase">
                  <strong className="commerce-product-price">{money(product.precio)}</strong>
                  <button type="button" className="commerce-add-button" onClick={() => navigate(`/vendor/pos?product=${product.id || product._id}`)} disabled={Number(product.stock) <= 0}>Vender</button>
                </div>
                <div className="commerce-product-status">
                  <span className={Number(product.stock) <= 5 ? 'stock-low' : 'stock-ok'}><CubeIcon /> {product.stock} disponibles</span>
                  <button type="button" onClick={() => setSelectedProduct(product)}><EyeIcon /> Detalles</button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {filtered.length === 0 && <div className="empty-state-card"><CubeIcon /><h3>No encontramos productos</h3><p>Prueba con otra búsqueda o categoría.</p></div>}
      </div>

      {selectedProduct && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="professional-product-modal">
            <button type="button" className="icon-button product-modal-close" onClick={() => setSelectedProduct(null)}><XMarkIcon /></button>
            <div className="product-modal-gallery">
              <img src={selectedProduct.imagen || 'https://via.placeholder.com/620x480?text=Producto'} alt={selectedProduct.nombre} />
              <span className={Number(selectedProduct.stock) > 0 ? 'availability-badge is-available' : 'availability-badge'}>
                <CheckBadgeIcon /> {Number(selectedProduct.stock) > 0 ? 'Disponible para venta' : 'Producto agotado'}
              </span>
            </div>
            <div className="product-modal-content">
              <span className="commerce-eyebrow">{selectedProduct.categoria || 'Tecnología'}</span>
              <h2>{selectedProduct.nombre}</h2>
              <p className="product-modal-description">{selectedProduct.descripcion || 'Sin descripción registrada.'}</p>
              <div className="product-modal-price-row"><strong>{money(selectedProduct.precio)}</strong><span>Precio de venta</span></div>
              <div className="product-detail-facts">
                <div><CubeIcon /><span>Stock actual<strong>{selectedProduct.stock} unidades</strong></span></div>
                <div><TagIcon /><span>Categoría<strong>{selectedProduct.categoria || 'General'}</strong></span></div>
                <div><TruckIcon /><span>Entrega<strong>{selectedProduct.deliveryGratis ? 'Envío gratis' : 'Según zona'}</strong></span></div>
                <div><CheckBadgeIcon /><span>Impuesto<strong>{selectedProduct.tieneIGV ? 'Incluye IGV' : 'Sin IGV'}</strong></span></div>
              </div>
              <div className="product-characteristics">
                <h3>Características principales</h3>
                {(selectedProduct.caracteristicas || []).length ? (
                  <ul>{selectedProduct.caracteristicas.map((item, index) => <li key={`${item}-${index}`}><CheckBadgeIcon /> {item}</li>)}</ul>
                ) : <p>No se registraron especificaciones adicionales.</p>}
              </div>
              <button type="button" className="btn-primary product-sale-cta" disabled={Number(selectedProduct.stock) <= 0} onClick={() => navigate(`/vendor/pos?product=${selectedProduct.id || selectedProduct._id}`)}>
                <ShoppingCartIcon /> Agregar a una nueva venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
