import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  EyeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  TruckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { downloadApiFile } from '../../utils/downloads';
import { asArray, formatCurrency, formatNumber } from '../../utils/formatters';

const STATUS_META = {
  PENDIENTE: { label: 'Pendiente', icon: ClockIcon, className: 'status-pending', step: 1 },
  CONFIRMADO: { label: 'Confirmado', icon: CheckCircleIcon, className: 'status-confirmed', step: 2 },
  ENVIADO: { label: 'En camino', icon: TruckIcon, className: 'status-shipped', step: 3 },
  ENTREGADO: { label: 'Entregado', icon: ShoppingBagIcon, className: 'status-delivered', step: 4 },
  CANCELADO: { label: 'Cancelado', icon: XMarkIcon, className: 'status-cancelled', step: 0 },
};

const safeDate = value => {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

const Orders = () => {
  const { user, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [cancelling, setCancelling] = useState('');

  const load = async () => {
    if (!user?.id && !user?._id) return;
    setLoading(true);
    try {
      const response = await api.get('/orders');
      setOrders(asArray(response.data));
    } catch (error) {
      if (error.response?.status !== 404) toast.error('No se pudieron cargar tus pedidos');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isAuthenticated && user) load(); }, [isAuthenticated, user?.id, user?._id]);

  const stats = useMemo(() => {
    const valid = orders.filter(order => order.estado !== 'CANCELADO');
    return {
      total: valid.length,
      active: orders.filter(order => ['PENDIENTE', 'CONFIRMADO', 'ENVIADO'].includes(order.estado)).length,
      delivered: orders.filter(order => order.estado === 'ENTREGADO').length,
      spent: valid.reduce((sum, order) => sum + Number(order.total || 0), 0),
    };
  }, [orders]);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return [...orders]
      .filter(order => {
        const matchesText = !text || [order.comprobanteNumero, order.id, order.vendedorNombre, ...(order.productos || []).map(item => item.nombre)]
          .some(value => String(value || '').toLowerCase().includes(text));
        const matchesStatus = statusFilter === 'TODOS' || order.estado === statusFilter;
        return matchesText && matchesStatus;
      })
      .sort((a, b) => (safeDate(b.fecha)?.getTime() || 0) - (safeDate(a.fecha)?.getTime() || 0));
  }, [orders, query, statusFilter]);

  const cancelOrder = async order => {
    if (order.estado !== 'PENDIENTE') {
      toast.error('Solo puedes cancelar pedidos pendientes');
      return;
    }
    if (!window.confirm('¿Cancelar este pedido? Esta acción no se puede revertir.')) return;
    const id = order.id || order._id;
    setCancelling(String(id));
    try {
      const response = await api.delete(`/orders/${id}`);
      const updated = response.data?.order || { ...order, estado: 'CANCELADO' };
      setOrders(current => current.map(item => String(item.id || item._id) === String(id) ? updated : item));
      if (selectedOrder && String(selectedOrder.id || selectedOrder._id) === String(id)) setSelectedOrder(updated);
      toast.success('Pedido cancelado');
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo cancelar el pedido');
    } finally {
      setCancelling('');
    }
  };

  if (!isAuthenticated) {
    return <div className="role-loading-page"><ClipboardDocumentListIcon className="empty-large-icon" /><strong>Inicia sesión para ver tus pedidos</strong><Link to="/login" className="btn-primary">Iniciar sesión</Link></div>;
  }

  if (loading) {
    return <div className="role-loading-page"><span className="loader-ring" /><strong>Cargando tus compras...</strong><p>Buscando comprobantes y estados de entrega.</p></div>;
  }

  return (
    <div className="commerce-dashboard-page buyer-orders-page">
      <div className="commerce-shell">
        <div className="commerce-page-header">
          <div><span className="commerce-eyebrow">Historial de compra</span><h1>Mis pedidos</h1><p>Consulta el seguimiento de tus compras y descarga tus comprobantes cuando los necesites.</p></div>
          <button type="button" className="commerce-refresh-button" onClick={load}><ArrowPathIcon /> Actualizar</button>
        </div>

        <div className="commerce-stat-grid">
          <article className="commerce-stat-card commerce-stat-violet"><span className="commerce-stat-icon"><ClipboardDocumentListIcon /></span><p>Compras válidas</p><strong>{formatNumber(stats.total)}</strong></article>
          <article className="commerce-stat-card commerce-stat-blue"><span className="commerce-stat-icon"><TruckIcon /></span><p>En proceso</p><strong>{formatNumber(stats.active)}</strong></article>
          <article className="commerce-stat-card commerce-stat-emerald"><span className="commerce-stat-icon"><CheckCircleIcon /></span><p>Entregadas</p><strong>{formatNumber(stats.delivered)}</strong></article>
          <article className="commerce-stat-card commerce-stat-amber"><span className="commerce-stat-icon"><ShoppingBagIcon /></span><p>Total comprado</p><strong>{formatCurrency(stats.spent)}</strong></article>
        </div>

        <section className="commerce-panel">
          <div className="buyer-order-toolbar">
            <div className="commerce-search-box"><MagnifyingGlassIcon /><input className="commerce-search-input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por pedido, producto o vendedor" /></div>
            <div className="orders-filter-select"><FunnelIcon /><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="TODOS">Todos los estados</option>{Object.entries(STATUS_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select></div>
          </div>

          {filtered.length === 0 ? (
            <div className="buyer-order-empty"><ShoppingBagIcon /><h2>{orders.length ? 'No encontramos pedidos con esos filtros' : 'Todavía no tienes pedidos'}</h2><p>{orders.length ? 'Cambia el estado o escribe otro término.' : 'Explora nuestro catálogo y realiza tu primera compra.'}</p><Link to="/products" className="btn-primary">Ver productos</Link></div>
          ) : (
            <div className="buyer-order-card-list">
              {filtered.map(order => {
                const id = String(order.id || order._id);
                const status = String(order.estado || 'PENDIENTE').toUpperCase();
                const meta = STATUS_META[status] || STATUS_META.PENDIENTE;
                const StatusIcon = meta.icon;
                return (
                  <article className="buyer-order-card" key={id}>
                    <div className="buyer-order-card-head">
                      <div className={`buyer-order-state-icon ${meta.className}`}><StatusIcon /></div>
                      <div><span>{order.tipoComprobante || 'boleta'} · {order.comprobanteNumero || `#${id.slice(0, 8)}`}</span><h2>{meta.label}</h2><p>{safeDate(order.fecha)?.toLocaleString('es-PE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) || 'Sin fecha'}</p></div>
                      <div className="buyer-order-total"><small>Total</small><strong>{formatCurrency(order.total)}</strong><span>{String(order.metodoPago || '').toUpperCase()}</span></div>
                    </div>

                    {status !== 'CANCELADO' && <div className="buyer-order-progress">{['Pedido recibido', 'Confirmado', 'En camino', 'Entregado'].map((label, index) => <div className={meta.step >= index + 1 ? 'is-complete' : ''} key={label}><i>{meta.step > index + 1 ? '✓' : index + 1}</i><span>{label}</span></div>)}</div>}

                    <div className="buyer-order-product-list">
                      {(order.productos || []).slice(0, 3).map((item, index) => <div key={`${item.nombre}-${index}`}><span className="buyer-order-product-icon">{String(item.nombre || 'P').charAt(0)}</span><div><strong>{item.nombre}</strong><small>{item.cantidad} × {formatCurrency(item.precio)}</small></div><b>{formatCurrency(Number(item.precio) * Number(item.cantidad))}</b></div>)}
                      {(order.productos || []).length > 3 && <small className="more-products-copy">+{order.productos.length - 3} producto(s) adicional(es)</small>}
                    </div>

                    <div className="buyer-order-card-actions">
                      <button type="button" className="btn-secondary" onClick={() => setSelectedOrder(order)}><EyeIcon /> Ver detalle</button>
                      <button type="button" className="btn-secondary" onClick={() => downloadApiFile(`/orders/${id}/pdf`, `${order.tipoComprobante || 'boleta'}-${order.comprobanteNumero || id}.pdf`)}><ArrowDownTrayIcon /> PDF</button>
                      <button type="button" className="btn-secondary" onClick={() => downloadApiFile(`/orders/${id}/xml`, `${order.comprobanteNumero || id}.xml`)}>XML</button>
                      {status === 'PENDIENTE' && <button type="button" className="btn-danger" disabled={cancelling === id} onClick={() => cancelOrder(order)}><XMarkIcon /> {cancelling === id ? 'Cancelando...' : 'Cancelar'}</button>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {selectedOrder && (
        <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setSelectedOrder(null)}>
          <div className="order-detail-modal buyer-order-detail-modal">
            <div className="modal-title"><div><span className="commerce-eyebrow">Detalle de compra</span><h2>{selectedOrder.comprobanteNumero || 'Pedido'}</h2><p>Atendido por {selectedOrder.vendedorNombre || 'ByteVerse'}.</p></div><button type="button" className="icon-button" onClick={() => setSelectedOrder(null)}><XMarkIcon /></button></div>
            <div className="order-detail-header-grid">
              <div><span>Estado</span><strong>{STATUS_META[selectedOrder.estado]?.label || selectedOrder.estado}</strong><small>{safeDate(selectedOrder.fecha)?.toLocaleString('es-PE') || ''}</small></div>
              <div><span>Comprobante</span><strong>{selectedOrder.tipoComprobante || 'Boleta'}</strong><small>{selectedOrder.comprobanteNumero || '-'}</small></div>
              <div><span>Pago</span><strong>{String(selectedOrder.metodoPago || '').toUpperCase()}</strong><small>{selectedOrder.pagoEstado || selectedOrder.pagoDetalles?.estado || 'Registrado'}</small></div>
              <div><span>Canal</span><strong>{selectedOrder.canalVenta || 'WEB'}</strong><small>{selectedOrder.couponCode ? `Cupón ${selectedOrder.couponCode}` : 'Sin cupón'}</small></div>
            </div>
            <div className="order-products-list"><div className="order-products-head"><span>Producto</span><span>Cantidad</span><span>Precio</span><span>Importe</span></div>{(selectedOrder.productos || []).map((item, index) => <div className="order-product-line" key={`${item.nombre}-${index}`}><span>{item.nombre}</span><span>{item.cantidad}</span><span>{formatCurrency(item.precio)}</span><b>{formatCurrency(Number(item.precio) * Number(item.cantidad))}</b></div>)}</div>
            <div className="order-detail-bottom"><div><div className="order-document-actions"><button type="button" className="btn-secondary" onClick={() => downloadApiFile(`/orders/${selectedOrder.id || selectedOrder._id}/pdf`, `${selectedOrder.tipoComprobante || 'boleta'}-${selectedOrder.comprobanteNumero}.pdf`)}>Comprobante PDF</button><button type="button" className="btn-secondary" onClick={() => downloadApiFile(`/orders/${selectedOrder.id || selectedOrder._id}/ticket`, `ticket-${selectedOrder.comprobanteNumero}.pdf`)}>Ticket</button><button type="button" className="btn-secondary" onClick={() => downloadApiFile(`/orders/${selectedOrder.id || selectedOrder._id}/xml`, `${selectedOrder.comprobanteNumero}.xml`)}>XML</button></div>{selectedOrder.direccion && <div className="order-address-card"><strong>Entrega</strong><p>{selectedOrder.direccion}</p><small>{[selectedOrder.distrito, selectedOrder.provincia, selectedOrder.departamento].filter(Boolean).join(', ')}</small></div>}</div><div className="order-total-card"><p><span>Subtotal</span><b>{formatCurrency(selectedOrder.subtotal)}</b></p><p><span>Descuento</span><b>-{formatCurrency(selectedOrder.descuento)}</b></p><p><span>IGV</span><b>{formatCurrency(selectedOrder.igv)}</b></p><h3><span>Total</span><b>{formatCurrency(selectedOrder.total)}</b></h3></div></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
