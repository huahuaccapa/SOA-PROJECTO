import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ShoppingBagIcon,
  TagIcon,
  UserGroupIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { asArray, formatCurrency, formatNumber } from '../../utils/formatters';

const STATUS_META = {
  PENDIENTE: { label: 'Pendientes', className: 'status-pending' },
  CONFIRMADO: { label: 'Confirmados', className: 'status-confirmed' },
  ENVIADO: { label: 'En camino', className: 'status-shipped' },
  ENTREGADO: { label: 'Entregados', className: 'status-delivered' },
  CANCELADO: { label: 'Cancelados', className: 'status-cancelled' },
};

const safeDate = value => {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isSameDay = (left, right) => left && right
  && left.getFullYear() === right.getFullYear()
  && left.getMonth() === right.getMonth()
  && left.getDate() === right.getDate();

const AdminDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState({ users: [], products: [], orders: [], coupons: [] });
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setWarning('');

    const requests = await Promise.allSettled([
      api.get('/users', { skipGlobalError: true }),
      api.get('/products', { skipGlobalError: true }),
      api.get('/orders', { skipGlobalError: true }),
      api.get('/coupons?active=false', { skipGlobalError: true }),
    ]);

    const [usersResult, productsResult, ordersResult, couponsResult] = requests;
    const nextData = {
      users: usersResult.status === 'fulfilled' ? asArray(usersResult.value.data) : [],
      products: productsResult.status === 'fulfilled' ? asArray(productsResult.value.data) : [],
      orders: ordersResult.status === 'fulfilled' ? asArray(ordersResult.value.data) : [],
      coupons: couponsResult.status === 'fulfilled' ? asArray(couponsResult.value.data, ['coupons', 'items', 'data']) : [],
    };

    setData(nextData);
    const unavailable = [
      usersResult.status === 'rejected' && 'usuarios',
      productsResult.status === 'rejected' && 'productos',
      ordersResult.status === 'rejected' && 'pedidos',
      couponsResult.status === 'rejected' && 'promociones',
    ].filter(Boolean);

    if (unavailable.length) {
      setWarning(`No se pudo actualizar temporalmente: ${unavailable.join(', ')}. El resto del panel continúa disponible.`);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const insights = useMemo(() => {
    const today = new Date();
    const validOrders = data.orders.filter(order => String(order.estado || '').toUpperCase() !== 'CANCELADO');
    const todayOrders = validOrders.filter(order => isSameDay(safeDate(order.fecha || order.createdAt), today));
    const totalRevenue = validOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const todayRevenue = todayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const averageTicket = validOrders.length ? totalRevenue / validOrders.length : 0;
    const lowStock = data.products.filter(product => Boolean(product.activo ?? true) && Number(product.stock || 0) <= 5);
    const activeCoupons = data.coupons.filter(coupon => Boolean(coupon.active)
      && (!safeDate(coupon.expiresAt) || safeDate(coupon.expiresAt) > today));

    const roles = data.users.reduce((acc, item) => {
      const role = String(item.role || 'COMPRADOR').toUpperCase();
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    const statuses = data.orders.reduce((acc, order) => {
      const status = String(order.estado || 'PENDIENTE').toUpperCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const productSales = new Map();
    validOrders.forEach(order => {
      (Array.isArray(order.productos) ? order.productos : []).forEach(item => {
        const key = String(item.productoId || item.id || item.nombre || 'producto');
        const current = productSales.get(key) || { nombre: item.nombre || 'Producto', units: 0, revenue: 0 };
        current.units += Number(item.cantidad || 0);
        current.revenue += Number(item.cantidad || 0) * Number(item.precio || 0);
        productSales.set(key, current);
      });
    });

    const topProducts = [...productSales.values()]
      .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
      .slice(0, 5);

    const recentOrders = [...data.orders]
      .sort((a, b) => (safeDate(b.fecha)?.getTime() || 0) - (safeDate(a.fecha)?.getTime() || 0))
      .slice(0, 6);

    return {
      validOrders,
      todayOrders,
      totalRevenue,
      todayRevenue,
      averageTicket,
      lowStock,
      activeCoupons,
      roles,
      statuses,
      topProducts,
      recentOrders,
    };
  }, [data]);

  const maxStatus = Math.max(1, ...Object.values(insights.statuses));
  const maxRole = Math.max(1, ...Object.values(insights.roles));

  if (loading) {
    return (
      <div className="role-loading-page">
        <span className="loader-ring" />
        <strong>Preparando el centro de control...</strong>
        <p>Consolidando ventas, clientes, inventario y campañas.</p>
      </div>
    );
  }

  return (
    <div className="commerce-dashboard-page admin-command-page">
      <div className="commerce-shell">
        <section className="admin-command-hero">
          <div>
            <span className="commerce-eyebrow">Centro de administración</span>
            <h1>Hola, {user?.nombre?.split(' ')[0] || 'Administrador'}</h1>
            <p>Controla la operación de ByteVerse con indicadores claros, alertas de inventario y accesos directos a cada módulo.</p>
            <div className="admin-hero-actions">
              <Link to="/admin/products" className="btn-primary"><ShoppingBagIcon /> Gestionar catálogo</Link>
              <Link to="/admin/coupons" className="btn-secondary"><TagIcon /> Crear promoción</Link>
            </div>
          </div>
          <div className="admin-health-card">
            <div className="admin-health-icon"><CheckCircleIcon /></div>
            <div>
              <span>Operación general</span>
              <strong>{warning ? 'Atención requerida' : 'Sistema operativo'}</strong>
              <small>{formatNumber(insights.todayOrders.length)} venta(s) registrada(s) hoy</small>
            </div>
            <button type="button" onClick={loadDashboard} aria-label="Actualizar panel"><ArrowPathIcon /></button>
          </div>
        </section>

        {warning && (
          <div className="dashboard-inline-warning">
            <ExclamationTriangleIcon />
            <span>{warning}</span>
            <button type="button" onClick={loadDashboard}>Reintentar</button>
          </div>
        )}

        <div className="admin-kpi-grid">
          <Link to="/admin/revenue" className="admin-kpi-card kpi-primary">
            <span className="admin-kpi-icon"><CurrencyDollarIcon /></span>
            <div><small>Ingresos acumulados</small><strong>{formatCurrency(insights.totalRevenue)}</strong><p>{formatCurrency(insights.todayRevenue)} generados hoy</p></div>
          </Link>
          <Link to="/admin/orders" className="admin-kpi-card kpi-blue">
            <span className="admin-kpi-icon"><ClipboardDocumentListIcon /></span>
            <div><small>Pedidos válidos</small><strong>{formatNumber(insights.validOrders.length)}</strong><p>Ticket promedio {formatCurrency(insights.averageTicket)}</p></div>
          </Link>
          <Link to="/admin/users" className="admin-kpi-card kpi-green">
            <span className="admin-kpi-icon"><UsersIcon /></span>
            <div><small>Usuarios registrados</small><strong>{formatNumber(data.users.length)}</strong><p>{formatNumber(insights.roles.COMPRADOR || 0)} compradores activos</p></div>
          </Link>
          <Link to="/admin/products" className="admin-kpi-card kpi-amber">
            <span className="admin-kpi-icon"><ExclamationTriangleIcon /></span>
            <div><small>Stock por atender</small><strong>{formatNumber(insights.lowStock.length)}</strong><p>Productos con 5 unidades o menos</p></div>
          </Link>
        </div>

        <div className="admin-dashboard-grid">
          <section className="commerce-panel admin-orders-overview">
            <div className="panel-title-row">
              <div><span className="commerce-eyebrow">Actividad reciente</span><h2>Últimos pedidos</h2></div>
              <Link to="/admin/orders">Ver todos</Link>
            </div>
            {insights.recentOrders.length === 0 ? (
              <div className="compact-empty-state"><ClipboardDocumentListIcon /><strong>Aún no hay pedidos</strong><p>Las nuevas ventas aparecerán en este panel.</p></div>
            ) : (
              <div className="admin-recent-order-list">
                {insights.recentOrders.map(order => {
                  const status = String(order.estado || 'PENDIENTE').toUpperCase();
                  const meta = STATUS_META[status] || { label: status, className: '' };
                  return (
                    <Link to="/admin/orders" className="admin-recent-order" key={order.id || order._id}>
                      <span className="order-channel-badge">{String(order.canalVenta || 'WEB').slice(0, 1)}</span>
                      <div>
                        <strong>{order.compradorNombre || 'Cliente'} <small>#{String(order.comprobanteNumero || order.id || '').slice(-8)}</small></strong>
                        <p>{safeDate(order.fecha)?.toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) || 'Sin fecha'} · {order.productos?.length || 0} producto(s)</p>
                      </div>
                      <span className={`order-status-chip ${meta.className}`}>{meta.label}</span>
                      <b>{formatCurrency(order.total)}</b>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className="commerce-panel admin-status-overview">
            <div className="panel-title-row">
              <div><span className="commerce-eyebrow">Flujo comercial</span><h2>Pedidos por estado</h2></div>
              <ChartBarIcon />
            </div>
            <div className="admin-bar-list">
              {Object.entries(STATUS_META).map(([status, meta]) => {
                const count = insights.statuses[status] || 0;
                return (
                  <div className="admin-bar-row" key={status}>
                    <div><span>{meta.label}</span><strong>{count}</strong></div>
                    <div className="admin-bar-track"><i className={meta.className} style={{ width: `${(count / maxStatus) * 100}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="commerce-panel admin-role-overview">
            <div className="panel-title-row">
              <div><span className="commerce-eyebrow">Comunidad</span><h2>Distribución de usuarios</h2></div>
              <UserGroupIcon />
            </div>
            <div className="role-distribution-list">
              {[
                ['COMPRADOR', 'Compradores'],
                ['VENDEDOR', 'Vendedores'],
                ['ADMIN', 'Administradores'],
              ].map(([role, label]) => {
                const count = insights.roles[role] || 0;
                return (
                  <div key={role}>
                    <div><span>{label}</span><strong>{count}</strong></div>
                    <div className="admin-bar-track"><i className={`role-${role.toLowerCase()}`} style={{ width: `${(count / maxRole) * 100}%` }} /></div>
                  </div>
                );
              })}
            </div>
            <Link to="/admin/users" className="admin-panel-link">Administrar usuarios <span>→</span></Link>
          </section>

          <section className="commerce-panel admin-top-products">
            <div className="panel-title-row">
              <div><span className="commerce-eyebrow">Rendimiento</span><h2>Productos más vendidos</h2></div>
              <ArrowTrendingUpIcon />
            </div>
            {insights.topProducts.length === 0 ? (
              <div className="compact-empty-state"><ShoppingBagIcon /><strong>Sin datos de ventas</strong><p>Se calculará cuando existan pedidos.</p></div>
            ) : (
              <div className="top-product-list">
                {insights.topProducts.map((item, index) => (
                  <div key={`${item.nombre}-${index}`}>
                    <span>{index + 1}</span>
                    <div><strong>{item.nombre}</strong><small>{formatNumber(item.units)} unidades</small></div>
                    <b>{formatCurrency(item.revenue)}</b>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="commerce-panel admin-alert-action-panel">
          <div className="panel-title-row">
            <div><span className="commerce-eyebrow">Acciones prioritarias</span><h2>Continúa administrando</h2></div>
          </div>
          <div className="admin-action-grid">
            <Link to="/admin/products"><ShoppingBagIcon /><div><strong>Catálogo</strong><span>{data.products.length} productos registrados</span></div></Link>
            <Link to="/admin/vendors"><UserGroupIcon /><div><strong>Equipo de ventas</strong><span>{insights.roles.VENDEDOR || 0} vendedores</span></div></Link>
            <Link to="/admin/coupons"><TagIcon /><div><strong>Promociones</strong><span>{insights.activeCoupons.length} campañas vigentes</span></div></Link>
            <Link to="/admin/analytics"><ChartBarIcon /><div><strong>Analítica</strong><span>Revisa tendencias y métricas</span></div></Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
