import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowRightIcon,
  BanknotesIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  MagnifyingGlassIcon,
  ReceiptPercentIcon,
  ShoppingCartIcon,
  TagIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const money = value => new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
}).format(Number(value || 0));

const asArray = value => Array.isArray(value) ? value : [];

const isSameDay = (value, reference = new Date()) => {
  const date = new Date(value);
  return date.getFullYear() === reference.getFullYear()
    && date.getMonth() === reference.getMonth()
    && date.getDate() === reference.getDate();
};

export default function VendorDashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [productsResponse, ordersResponse, promotionsResponse] = await Promise.all([
        api.get('/products?activo=true'),
        api.get(`/orders?vendedorId=${user.id}`),
        api.get('/coupons?active=true').catch(() => ({ data: [] })),
      ]);
      setProducts(asArray(productsResponse.data));
      setOrders(asArray(ordersResponse.data));
      setPromotions(asArray(promotionsResponse.data));
    } catch (error) {
      console.error('Vendor dashboard:', error);
      if (![401, 503].includes(error.response?.status)) {
        toast.error('No se pudo cargar el panel del vendedor', { id: 'vendor-dashboard-load' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user.id]);

  const metrics = useMemo(() => {
    const todayOrders = orders.filter(order => isSameDay(order.fecha || order.createdAt));
    const completed = todayOrders.filter(order => !['CANCELADO', 'PENDIENTE'].includes(order.estado));
    const todayRevenue = completed.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const uniqueCustomers = new Set(todayOrders.map(order => order.compradorId).filter(id => id && id !== 'MOSTRADOR')).size;
    const lowStock = products.filter(product => Number(product.stock) > 0 && Number(product.stock) <= 5);
    return {
      todaySales: completed.length,
      todayRevenue,
      averageTicket: completed.length ? todayRevenue / completed.length : 0,
      customers: uniqueCustomers,
      lowStock,
    };
  }, [orders, products]);

  const recentOrders = orders.slice(0, 6);

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><span className="loader-ring large" /></div>;
  }

  return (
    <div className="commerce-dashboard-page vendor-dashboard">
      <div className="commerce-shell">
        <div className="vendor-hero-panel">
          <div>
            <span className="commerce-eyebrow">Caja y atención presencial</span>
            <h1>Hola, {user?.nombre?.split(' ')[0]}</h1>
            <p>Tu tarea principal es atender al cliente en tienda, registrar la venta, aplicar promociones y entregar su comprobante.</p>
            <div className="vendor-hero-actions">
              <Link to="/vendor/pos" className="btn-primary"><ShoppingCartIcon /> Iniciar nueva venta</Link>
              <Link to="/vendor/search-client" className="btn-secondary"><MagnifyingGlassIcon /> Buscar cliente</Link>
            </div>
          </div>
          <div className="vendor-shift-card">
            <span className="shift-status"><i /> Turno activo</span>
            <strong>{new Date().toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long' })}</strong>
            <small>Ventas de hoy</small>
            <b>{money(metrics.todayRevenue)}</b>
          </div>
        </div>

        <div className="commerce-stat-grid">
          <Link to="/vendor/orders" className="commerce-stat-card commerce-stat-violet">
            <div><div><p>Ventas de hoy</p><strong>{metrics.todaySales}</strong></div><span className="commerce-stat-icon"><CheckCircleIcon /></span></div>
          </Link>
          <article className="commerce-stat-card commerce-stat-emerald">
            <div><div><p>Ingresos de hoy</p><strong>{money(metrics.todayRevenue)}</strong></div><span className="commerce-stat-icon"><BanknotesIcon /></span></div>
          </article>
          <article className="commerce-stat-card commerce-stat-blue">
            <div><div><p>Ticket promedio</p><strong>{money(metrics.averageTicket)}</strong></div><span className="commerce-stat-icon"><ChartBarIcon /></span></div>
          </article>
          <Link to="/vendor/products" className="commerce-stat-card commerce-stat-amber">
            <div><div><p>Stock bajo</p><strong>{metrics.lowStock.length}</strong></div><span className="commerce-stat-icon"><CubeIcon /></span></div>
          </Link>
        </div>

        <div className="vendor-work-grid">
          <section className="commerce-panel vendor-primary-actions">
            <div className="commerce-panel-heading split-heading">
              <div><span className="commerce-eyebrow">Flujo recomendado</span><h2>Atención de una venta</h2></div>
              <Link to="/vendor/pos">Abrir caja <ArrowRightIcon /></Link>
            </div>
            <div className="vendor-step-grid">
              <article><span>1</span><UserGroupIcon /><h3>Identifica al cliente</h3><p>Búscalo por nombre, DNI, correo o realiza una venta de mostrador.</p></article>
              <article><span>2</span><ShoppingCartIcon /><h3>Agrega productos</h3><p>Consulta stock y selecciona las cantidades solicitadas.</p></article>
              <article><span>3</span><ReceiptPercentIcon /><h3>Aplica promociones</h3><p>Valida automáticamente los cupones vigentes.</p></article>
              <article><span>4</span><ClipboardDocumentListIcon /><h3>Cobra y entrega</h3><p>Registra el pago y descarga boleta, factura o ticket.</p></article>
            </div>
          </section>

          <section className="commerce-panel vendor-promotions-panel">
            <div className="commerce-panel-heading split-heading">
              <div><span className="commerce-eyebrow">Beneficios activos</span><h2>Promociones disponibles</h2></div>
              <TagIcon />
            </div>
            {promotions.length ? promotions.slice(0, 4).map(promotion => (
              <div className="vendor-promotion-row" key={promotion.id || promotion._id || promotion.code}>
                <span>{promotion.code}</span>
                <div><strong>{promotion.type === 'percentage' ? `${Number(promotion.value)}% de descuento` : money(promotion.value)}</strong><small>Compra mínima {money(promotion.minPurchase)}</small></div>
              </div>
            )) : <p className="empty-copy">No hay promociones activas en este momento.</p>}
          </section>
        </div>

        <div className="vendor-work-grid lower">
          <section className="commerce-panel">
            <div className="commerce-panel-heading split-heading">
              <div><span className="commerce-eyebrow">Actividad reciente</span><h2>Últimas ventas</h2></div>
              <Link to="/vendor/orders">Ver todas <ArrowRightIcon /></Link>
            </div>
            {recentOrders.length ? recentOrders.map(order => (
              <div className="vendor-order-row" key={order.id || order._id}>
                <div className="order-row-icon"><ClipboardDocumentListIcon /></div>
                <div><strong>{order.compradorNombre || 'Cliente de tienda'}</strong><small>{order.comprobanteNumero || order.boletaNumero || `#${String(order.id).slice(0, 8)}`} · {new Date(order.fecha).toLocaleString('es-PE')}</small></div>
                <span className={`order-status status-${String(order.estado || '').toLowerCase()}`}>{order.estado}</span>
                <b>{money(order.total)}</b>
              </div>
            )) : <p className="empty-copy">Aún no registraste ventas.</p>}
          </section>

          <section className="commerce-panel">
            <div className="commerce-panel-heading split-heading">
              <div><span className="commerce-eyebrow">Inventario</span><h2>Productos por reponer</h2></div>
              <Link to="/vendor/products">Ver catálogo <ArrowRightIcon /></Link>
            </div>
            {metrics.lowStock.length ? metrics.lowStock.slice(0, 6).map(product => (
              <div className="low-stock-row" key={product.id || product._id}>
                <img src={product.imagen || 'https://via.placeholder.com/60?text=P'} alt={product.nombre} />
                <div><strong>{product.nombre}</strong><small>{product.categoria || 'Tecnología'}</small></div>
                <span>{product.stock} unidades</span>
              </div>
            )) : <p className="empty-copy">El stock disponible se encuentra en niveles adecuados.</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
