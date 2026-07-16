import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  EyeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  TruckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { downloadApiFile } from '../../utils/downloads';
import { asArray, formatCurrency, formatNumber } from '../../utils/formatters';

const STATUS_META = {
  PENDIENTE: { label: 'Pendiente', className: 'status-pending' },
  CONFIRMADO: { label: 'Confirmado', className: 'status-confirmed' },
  ENVIADO: { label: 'En camino', className: 'status-shipped' },
  ENTREGADO: { label: 'Entregado', className: 'status-delivered' },
  CANCELADO: { label: 'Cancelado', className: 'status-cancelled' },
};

const NEXT_ACTIONS = {
  PENDIENTE: [
    { status: 'CONFIRMADO', label: 'Confirmar', icon: CheckCircleIcon, primary: true },
    { status: 'CANCELADO', label: 'Cancelar', icon: XMarkIcon, danger: true },
  ],
  CONFIRMADO: [
    { status: 'ENVIADO', label: 'Marcar enviado', icon: TruckIcon, primary: true },
    { status: 'ENTREGADO', label: 'Marcar entregado', icon: CheckCircleIcon },
  ],
  ENVIADO: [{ status: 'ENTREGADO', label: 'Confirmar entrega', icon: CheckCircleIcon, primary: true }],
};

const safeDate = value => {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [channelFilter, setChannelFilter] = useState('TODOS');
  const [updatingId, setUpdatingId] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get('/orders');
      setOrders(asArray(response.data));
    } catch (error) {
      console.error(error);
      toast.error('No se pudieron cargar los pedidos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const valid = orders.filter(order => order.estado !== 'CANCELADO');
    const revenue = valid.reduce((sum, order) => sum + Number(order.total || 0), 0);
    return {
      total: orders.length,
      pending: orders.filter(order => order.estado === 'PENDIENTE').length,
      active: orders.filter(order => ['CONFIRMADO', 'ENVIADO'].includes(order.estado)).length,
      revenue,
    };
  }, [orders]);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return orders.filter(order => {
      const matchesText = !text || [order.comprobanteNumero, order.id, order.compradorNombre, order.vendedorNombre, order.clienteDocumento, order.clienteRuc]
        .some(value => String(value || '').toLowerCase().includes(text));
      const matchesStatus = statusFilter === 'TODOS' || order.estado === statusFilter;
      const matchesChannel = channelFilter === 'TODOS' || String(order.canalVenta || 'WEB').toUpperCase() === channelFilter;
      return matchesText && matchesStatus && matchesChannel;
    });
  }, [orders, query, statusFilter, channelFilter]);

  const updateStatus = async (order, status) => {
    const id = order.id || order._id;
    if (status === 'CANCELADO' && !window.confirm('¿Cancelar este pedido pendiente? Esta acción no se puede revertir.')) return;
    setUpdatingId(String(id));
    try {
      const response = await api.put(`/orders/${id}/status`, { status });
      const updated = response.data?.order;
      setOrders(current => current.map(item => String(item.id || item._id) === String(id) ? (updated || { ...item, estado: status }) : item));
      if (selectedOrder && String(selectedOrder.id || selectedOrder._id) === String(id)) setSelectedOrder(updated || { ...selectedOrder, estado: status });
      toast.success(`Pedido actualizado a ${STATUS_META[status]?.label || status}`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo actualizar el pedido');
    } finally {
      setUpdatingId('');
    }
  };

  if (loading) {
    return <div className="role-loading-page"><span className="loader-ring" /><strong>Cargando pedidos...</strong><p>Consolidando ventas web y atenciones en tienda.</p></div>;
  }

  return (
    <div className="commerce-dashboard-page admin-orders-page">
      <div className="commerce-shell">
        <div className="commerce-page-header">
          <div><span className="commerce-eyebrow">Operación comercial</span><h1>Gestión de pedidos</h1><p>Supervisa ventas, comprobantes, pagos y el flujo correcto de cada pedido.</p></div>
          <div className="admin-header-actions"><button type="button" className="btn-secondary" onClick={() => downloadApiFile('/orders/reports/summary.xml', 'reporte-general.xml')}><ArrowDownTrayIcon /> XML</button><button type="button" className="btn-primary" onClick={() => downloadApiFile('/orders/reports/summary.pdf', 'reporte-general.pdf')}><ArrowDownTrayIcon /> Reporte PDF</button></div>
        </div>

        <div className="commerce-stat-grid">
          <article className="commerce-stat-card commerce-stat-violet"><span className="commerce-stat-icon"><ClipboardDocumentListIcon /></span><p>Pedidos totales</p><strong>{formatNumber(stats.total)}</strong></article>
          <article className="commerce-stat-card commerce-stat-amber"><span className="commerce-stat-icon"><ShoppingBagIcon /></span><p>Por confirmar</p><strong>{formatNumber(stats.pending)}</strong></article>
          <article className="commerce-stat-card commerce-stat-blue"><span className="commerce-stat-icon"><TruckIcon /></span><p>En proceso</p><strong>{formatNumber(stats.active)}</strong></article>
          <article className="commerce-stat-card commerce-stat-emerald"><span className="commerce-stat-icon"><CurrencyDollarIcon /></span><p>Ingresos válidos</p><strong>{formatCurrency(stats.revenue)}</strong></article>
        </div>

        <section className="commerce-panel">
          <div className="admin-order-toolbar">
            <div className="commerce-search-box"><MagnifyingGlassIcon /><input className="commerce-search-input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar pedido, comprobante, cliente o vendedor" /></div>
            <div className="orders-filter-select"><FunnelIcon /><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="TODOS">Todos los estados</option>{Object.entries(STATUS_META).map(([value, meta]) => <option value={value} key={value}>{meta.label}</option>)}</select></div>
            <div className="orders-filter-select"><ShoppingBagIcon /><select value={channelFilter} onChange={event => setChannelFilter(event.target.value)}><option value="TODOS">Todos los canales</option><option value="WEB">Tienda web</option><option value="TIENDA">Venta presencial</option></select></div>
            <button type="button" className="commerce-refresh-button" onClick={load}><ArrowPathIcon /> Actualizar</button>
          </div>

          <div className="admin-users-result-head"><span>{filtered.length} pedido(s)</span><small>Solo se permite avanzar por estados válidos; una venta confirmada no puede cancelarse.</small></div>

          {filtered.length === 0 ? (
            <div className="compact-empty-state"><ClipboardDocumentListIcon /><strong>No hay pedidos con estos filtros</strong><p>Cambia los criterios de búsqueda para ver más resultados.</p></div>
          ) : (
            <div className="orders-table-wrap">
              <table className="professional-table admin-orders-table">
                <thead><tr><th>Pedido</th><th>Cliente / vendedor</th><th>Canal y pago</th><th>Fecha</th><th>Estado</th><th>Total</th><th>Acciones</th></tr></thead>
                <tbody>
                  {filtered.map(order => {
                    const id = String(order.id || order._id);
                    const status = String(order.estado || 'PENDIENTE').toUpperCase();
                    const meta = STATUS_META[status] || { label: status, className: '' };
                    return (
                      <tr key={id}>
                        <td><strong>{order.comprobanteNumero || `#${id.slice(0, 8)}`}</strong><small>{order.tipoComprobante || 'boleta'} · {order.productos?.length || 0} producto(s)</small></td>
                        <td><strong>{order.compradorNombre || 'Cliente'}</strong><small>Atendido por {order.vendedorNombre || 'ByteVerse'}</small></td>
                        <td><span className="payment-pill">{String(order.canalVenta || 'WEB').toUpperCase()}</span><small>{String(order.metodoPago || 'sin método').toUpperCase()}</small></td>
                        <td><strong>{safeDate(order.fecha)?.toLocaleDateString('es-PE') || 'Sin fecha'}</strong><small>{safeDate(order.fecha)?.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) || ''}</small></td>
                        <td><span className={`order-status-chip ${meta.className}`}>{meta.label}</span></td>
                        <td><strong>{formatCurrency(order.total)}</strong><small>{order.descuento ? `Descuento ${formatCurrency(order.descuento)}` : 'Sin descuento'}</small></td>
                        <td><div className="table-actions"><button type="button" onClick={() => setSelectedOrder(order)} title="Ver detalle"><EyeIcon /></button>{(NEXT_ACTIONS[status] || []).slice(0, 1).map(action => <button type="button" key={action.status} disabled={updatingId === id} className={action.danger ? 'danger-table-action' : ''} onClick={() => updateStatus(order, action.status)} title={action.label}><action.icon /></button>)}</div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selectedOrder && (
        <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setSelectedOrder(null)}>
          <div className="order-detail-modal admin-order-detail-modal">
            <div className="modal-title"><div><span className="commerce-eyebrow">Detalle operativo</span><h2>{selectedOrder.comprobanteNumero || 'Pedido'}</h2><p>Información completa de la venta, pago y comprobantes.</p></div><button type="button" className="icon-button" onClick={() => setSelectedOrder(null)}><XMarkIcon /></button></div>

            <div className="order-detail-header-grid">
              <div><span>Cliente</span><strong>{selectedOrder.compradorNombre || 'Cliente'}</strong><small>{selectedOrder.clienteDocumento || selectedOrder.clienteRuc || 'Sin documento'}</small></div>
              <div><span>Vendedor</span><strong>{selectedOrder.vendedorNombre || 'ByteVerse'}</strong><small>{selectedOrder.canalVenta || 'WEB'}</small></div>
              <div><span>Pago</span><strong>{String(selectedOrder.metodoPago || '').toUpperCase()}</strong><small>{selectedOrder.pagoEstado || selectedOrder.pagoDetalles?.estado || 'Registrado'}</small></div>
              <div><span>Estado</span><strong>{STATUS_META[selectedOrder.estado]?.label || selectedOrder.estado}</strong><small>{safeDate(selectedOrder.fecha)?.toLocaleString('es-PE') || ''}</small></div>
            </div>

            <div className="order-products-list">
              <div className="order-products-head"><span>Producto</span><span>Cantidad</span><span>Precio</span><span>Importe</span></div>
              {(selectedOrder.productos || []).map((item, index) => <div className="order-product-line" key={`${item.nombre}-${index}`}><span>{item.nombre}</span><span>{item.cantidad}</span><span>{formatCurrency(item.precio)}</span><b>{formatCurrency(Number(item.precio) * Number(item.cantidad))}</b></div>)}
            </div>

            <div className="order-detail-bottom">
              <div>
                <div className="order-document-actions">
                  <button type="button" className="btn-secondary" onClick={() => downloadApiFile(`/orders/${selectedOrder.id || selectedOrder._id}/pdf`, `${selectedOrder.tipoComprobante || 'boleta'}-${selectedOrder.comprobanteNumero}.pdf`)}>Comprobante PDF</button>
                  <button type="button" className="btn-secondary" onClick={() => downloadApiFile(`/orders/${selectedOrder.id || selectedOrder._id}/xml`, `${selectedOrder.comprobanteNumero}.xml`)}>XML</button>
                  <button type="button" className="btn-secondary" onClick={() => downloadApiFile(`/orders/${selectedOrder.id || selectedOrder._id}/ticket`, `ticket-${selectedOrder.comprobanteNumero}.pdf`)}>Ticket</button>
                </div>
                {selectedOrder.direccion && <div className="order-address-card"><strong>Dirección</strong><p>{selectedOrder.direccion}</p><small>{[selectedOrder.distrito, selectedOrder.provincia, selectedOrder.departamento].filter(Boolean).join(', ')}</small></div>}
                {(NEXT_ACTIONS[selectedOrder.estado] || []).length > 0 && <div className="order-admin-transition-actions">{NEXT_ACTIONS[selectedOrder.estado].map(action => <button type="button" key={action.status} className={action.primary ? 'btn-primary' : action.danger ? 'btn-danger' : 'btn-secondary'} disabled={updatingId === String(selectedOrder.id || selectedOrder._id)} onClick={() => updateStatus(selectedOrder, action.status)}><action.icon /> {action.label}</button>)}</div>}
              </div>
              <div className="order-total-card"><p><span>Subtotal</span><b>{formatCurrency(selectedOrder.subtotal)}</b></p><p><span>Descuento</span><b>-{formatCurrency(selectedOrder.descuento)}</b></p><p><span>IGV</span><b>{formatCurrency(selectedOrder.igv)}</b></p><h3><span>Total</span><b>{formatCurrency(selectedOrder.total)}</b></h3></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
