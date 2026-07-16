import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowPathIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CreditCardIcon,
  GiftIcon,
  HeartIcon,
  MapPinIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  SparklesIcon,
  TicketIcon,
  TruckIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../hooks/useCart';
import { asArray, formatCurrency, formatNumber } from '../../utils/formatters';
import toast from 'react-hot-toast';

const STATUS_META = {
  PENDIENTE: { label: 'Pendiente', icon: ClockIcon, className: 'status-pending' },
  CONFIRMADO: { label: 'Confirmado', icon: CheckCircleIcon, className: 'status-confirmed' },
  ENVIADO: { label: 'En camino', icon: TruckIcon, className: 'status-shipped' },
  ENTREGADO: { label: 'Entregado', icon: ShoppingBagIcon, className: 'status-delivered' },
  CANCELADO: { label: 'Cancelado', icon: ClipboardDocumentListIcon, className: 'status-cancelled' },
};

const safeDate = value => {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

const BuyerDashboard = () => {
  const { user } = useAuth();
  const { addToCart, totalItems } = useCart();
  const [data, setData] = useState({ orders: [], products: [], coupons: [], wishlist: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    const userId = user?.id || user?._id;
    const calls = [
      api.get('/orders', { skipGlobalError: true }),
      api.get('/products', { skipGlobalError: true }),
      api.get('/coupons?active=true', { skipGlobalError: true }),
      userId ? api.get(`/wishlist/${userId}`, { skipGlobalError: true }) : Promise.resolve({ data: [] }),
    ];
    const [orders, products, coupons, wishlist] = await Promise.allSettled(calls);

    setData({
      orders: orders.status === 'fulfilled' ? asArray(orders.value.data) : [],
      products: products.status === 'fulfilled' ? asArray(products.value.data) : [],
      coupons: coupons.status === 'fulfilled' ? asArray(coupons.value.data, ['coupons', 'items', 'data']) : [],
      wishlist: wishlist.status === 'fulfilled' ? asArray(wishlist.value.data) : [],
    });

    setLoading(false);
    setRefreshing(false);
  }, [user?.id, user?._id]);

  useEffect(() => {
    load();
  }, [load]);

  const insights = useMemo(() => {
    const orders = [...data.orders].sort((a, b) => (safeDate(b.fecha)?.getTime() || 0) - (safeDate(a.fecha)?.getTime() || 0));
    const validOrders = orders.filter(order => String(order.estado || '').toUpperCase() !== 'CANCELADO');
    const totalSpent = validOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const activeOrders = orders.filter(order => ['PENDIENTE', 'CONFIRMADO', 'ENVIADO'].includes(String(order.estado || '').toUpperCase()));

    const categoryFrequency = new Map();
    validOrders.forEach(order => {
      (order.productos || []).forEach(item => {
        const category = String(item.categoria || '').trim();
        if (category) categoryFrequency.set(category, (categoryFrequency.get(category) || 0) + Number(item.cantidad || 1));
      });
    });
    const favoriteCategories = [...categoryFrequency.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);

    const purchasedNames = new Set(validOrders.flatMap(order => (order.productos || []).map(item => String(item.nombre || '').toLowerCase())));
    const recommended = data.products
      .filter(product => Boolean(product.activo ?? true) && Number(product.stock || 0) > 0)
      .sort((a, b) => {
        const aScore = favoriteCategories.indexOf(a.categoria);
        const bScore = favoriteCategories.indexOf(b.categoria);
        const normalizedA = aScore === -1 ? 999 : aScore;
        const normalizedB = bScore === -1 ? 999 : bScore;
        if (normalizedA !== normalizedB) return normalizedA - normalizedB;
        const aPurchased = purchasedNames.has(String(a.nombre || '').toLowerCase()) ? 1 : 0;
        const bPurchased = purchasedNames.has(String(b.nombre || '').toLowerCase()) ? 1 : 0;
        return aPurchased - bPurchased || Number(b.stock || 0) - Number(a.stock || 0);
      })
      .slice(0, 4);

    const fields = [user?.nombre, user?.email, user?.telefono, user?.direccion, user?.documento];
    const profileCompletion = Math.round((fields.filter(value => String(value || '').trim()).length / fields.length) * 100);

    return {
      orders,
      validOrders,
      totalSpent,
      activeOrders,
      favoriteCategories,
      recommended,
      profileCompletion,
      latestOrder: orders[0],
    };
  }, [data, user]);

  const copyCoupon = async code => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Cupón ${code} copiado`);
    } catch {
      toast.success(`Usa el cupón: ${code}`);
    }
  };

  if (loading) {
    return (
      <div className="role-loading-page">
        <span className="loader-ring" />
        <strong>Preparando tu espacio...</strong>
        <p>Cargando pedidos, beneficios y recomendaciones.</p>
      </div>
    );
  }

  const latestStatus = String(insights.latestOrder?.estado || '').toUpperCase();
  const LatestIcon = STATUS_META[latestStatus]?.icon || ClipboardDocumentListIcon;

  return (
    <div className="commerce-dashboard-page buyer-dashboard-page">
      <div className="commerce-shell">
        <section className="buyer-welcome-hero">
          <div className="buyer-welcome-copy">
            <span className="commerce-eyebrow">Mi cuenta ByteVerse</span>
            <h1>Hola, {user?.nombre?.split(' ')[0] || 'cliente'} 👋</h1>
            <p>Revisa el estado de tus compras, aprovecha promociones y descubre tecnología seleccionada para ti.</p>
            <div className="buyer-hero-actions">
              <Link to="/products" className="btn-primary"><ShoppingBagIcon /> Explorar catálogo</Link>
              <Link to="/orders" className="btn-secondary"><ClipboardDocumentListIcon /> Mis pedidos</Link>
            </div>
          </div>
          <div className="buyer-loyalty-card">
            <span className="buyer-loyalty-shine" />
            <div className="buyer-loyalty-head"><span>BYTEVERSE MEMBER</span><SparklesIcon /></div>
            <strong>{user?.nombre || 'Cliente ByteVerse'}</strong>
            <p>{formatNumber(insights.validOrders.length)} compras · {formatCurrency(insights.totalSpent)} acumulado</p>
            <div><span>Perfil completado</span><b>{insights.profileCompletion}%</b></div>
            <div className="buyer-progress"><i style={{ width: `${insights.profileCompletion}%` }} /></div>
          </div>
        </section>

        <div className="buyer-summary-grid">
          <Link to="/orders" className="buyer-summary-card">
            <span><ClipboardDocumentListIcon /></span>
            <div><small>Compras realizadas</small><strong>{formatNumber(insights.validOrders.length)}</strong><p>Historial y comprobantes</p></div>
          </Link>
          <Link to="/orders" className="buyer-summary-card">
            <span><TruckIcon /></span>
            <div><small>Pedidos en proceso</small><strong>{formatNumber(insights.activeOrders.length)}</strong><p>Seguimiento actualizado</p></div>
          </Link>
          <Link to="/cart" className="buyer-summary-card">
            <span><ShoppingCartIcon /></span>
            <div><small>Productos en carrito</small><strong>{formatNumber(totalItems)}</strong><p>Continúa tu compra</p></div>
          </Link>
          <Link to="/profile" className="buyer-summary-card">
            <span><UserCircleIcon /></span>
            <div><small>Perfil completado</small><strong>{insights.profileCompletion}%</strong><p>Datos de compra y envío</p></div>
          </Link>
        </div>

        <div className="buyer-dashboard-grid">
          <section className="commerce-panel buyer-current-order">
            <div className="panel-title-row">
              <div><span className="commerce-eyebrow">Seguimiento</span><h2>Tu compra más reciente</h2></div>
              <button type="button" onClick={() => load(true)} disabled={refreshing}><ArrowPathIcon className={refreshing ? 'spin-icon' : ''} /></button>
            </div>
            {!insights.latestOrder ? (
              <div className="compact-empty-state"><ShoppingBagIcon /><strong>Comienza tu primera compra</strong><p>El estado de tu próximo pedido aparecerá aquí.</p><Link to="/products">Ver productos</Link></div>
            ) : (
              <div className="buyer-order-highlight">
                <div className={`buyer-order-state-icon ${STATUS_META[latestStatus]?.className || ''}`}><LatestIcon /></div>
                <div className="buyer-order-main">
                  <div><span>Pedido #{String(insights.latestOrder.comprobanteNumero || insights.latestOrder.id || '').slice(-10)}</span><b>{formatCurrency(insights.latestOrder.total)}</b></div>
                  <h3>{STATUS_META[latestStatus]?.label || latestStatus}</h3>
                  <p>{safeDate(insights.latestOrder.fecha)?.toLocaleString('es-PE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) || 'Fecha no disponible'}</p>
                  <div className="buyer-order-products-preview">
                    {(insights.latestOrder.productos || []).slice(0, 3).map((item, index) => <span key={`${item.nombre}-${index}`}>{item.nombre} × {item.cantidad}</span>)}
                  </div>
                </div>
                <Link to="/orders" className="buyer-detail-link">Ver detalle <ArrowRightIcon /></Link>
              </div>
            )}
          </section>

          <section className="commerce-panel buyer-profile-readiness">
            <div className="panel-title-row">
              <div><span className="commerce-eyebrow">Cuenta segura</span><h2>Datos para tus compras</h2></div>
              <UserCircleIcon />
            </div>
            <div className="buyer-readiness-list">
              <div className={user?.direccion ? 'is-ready' : ''}><MapPinIcon /><span><strong>Dirección de entrega</strong><small>{user?.direccion || 'Agrega una dirección para comprar más rápido'}</small></span><CheckCircleIcon /></div>
              <div className={user?.documento ? 'is-ready' : ''}><CreditCardIcon /><span><strong>Documento</strong><small>{user?.documento ? `${user?.tipoDocumento || 'DNI'} ${user.documento}` : 'Necesario para tus comprobantes'}</small></span><CheckCircleIcon /></div>
              <div className={user?.telefono ? 'is-ready' : ''}><UserCircleIcon /><span><strong>Contacto</strong><small>{user?.telefono || 'Añade un teléfono de contacto'}</small></span><CheckCircleIcon /></div>
            </div>
            <Link to="/profile" className="admin-panel-link">Actualizar mis datos <span>→</span></Link>
          </section>
        </div>

        {data.coupons.length > 0 && (
          <section className="commerce-panel buyer-benefits-panel">
            <div className="panel-title-row">
              <div><span className="commerce-eyebrow">Beneficios disponibles</span><h2>Promociones para tu próxima compra</h2></div>
              <GiftIcon />
            </div>
            <div className="buyer-coupon-strip">
              {data.coupons.slice(0, 3).map(coupon => (
                <button type="button" key={coupon.id || coupon._id || coupon.code} onClick={() => copyCoupon(coupon.code)}>
                  <span className="buyer-coupon-icon"><TicketIcon /></span>
                  <div><strong>{coupon.code}</strong><p>{coupon.description || `${coupon.type === 'percentage' ? `${coupon.value}%` : formatCurrency(coupon.value)} de descuento`}</p><small>Compra mínima {formatCurrency(coupon.minPurchase)} · Toca para copiar</small></div>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="commerce-panel buyer-recommendation-panel">
          <div className="panel-title-row">
            <div>
              <span className="commerce-eyebrow">Selección para ti</span>
              <h2>{insights.favoriteCategories.length ? `Basado en tu interés por ${insights.favoriteCategories[0]}` : 'Productos que podrían gustarte'}</h2>
            </div>
            <Link to="/products">Ver catálogo</Link>
          </div>
          {insights.recommended.length === 0 ? (
            <div className="compact-empty-state"><HeartIcon /><strong>Pronto habrá recomendaciones</strong><p>Explora el catálogo para conocer tus preferencias.</p></div>
          ) : (
            <div className="buyer-product-grid">
              {insights.recommended.map(product => (
                <article key={product.id || product._id} className="buyer-product-card">
                  <Link to={`/product/${product.id || product._id}`} className="buyer-product-image">
                    <img src={product.imagen || 'https://via.placeholder.com/400x300?text=ByteVerse'} alt={product.nombre} />
                    <span>{product.categoria || 'Tecnología'}</span>
                  </Link>
                  <div>
                    <Link to={`/product/${product.id || product._id}`}><h3>{product.nombre}</h3></Link>
                    <p>{product.descripcion || 'Producto tecnológico disponible en ByteVerse.'}</p>
                    <div><strong>{formatCurrency(product.precio)}</strong><button type="button" onClick={() => addToCart(product, 1)}><ShoppingCartIcon /> Agregar</button></div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default BuyerDashboard;
