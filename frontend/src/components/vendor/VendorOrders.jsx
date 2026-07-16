import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { downloadApiFile } from '../../utils/downloads';
import {
  CheckIcon,
  ClipboardDocumentListIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const money = value => new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
}).format(Number(value || 0));

const statusClass = status => `order-status status-${String(status || '').toLowerCase()}`;

export default function VendorOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('TODOS');

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/orders?vendedorId=${user.id}`);
      setOrders(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      toast.error('No se pudieron cargar las ventas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user.id]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter(order => {
      const matchesStatus = status === 'TODOS' || order.estado === status;
      const matchesSearch = !term || `${order.compradorNombre || ''} ${order.comprobanteNumero || ''} ${order.boletaNumero || ''} ${order.metodoPago || ''}`.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [orders, search, status]);

  const totals = useMemo(() => {
    const valid = filtered.filter(order => order.estado !== 'CANCELADO');
    return {
      count: valid.length,
      amount: valid.reduce((sum, order) => sum + Number(order.total || 0), 0),
    };
  }, [filtered]);

  const updateStatus = async (order, nextStatus) => {
    try {
      await api.put(`/orders/${order.id || order._id}/status`, { status: nextStatus });
      toast.success('Estado actualizado');
      setSelectedOrder(null);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo actualizar la venta');
    }
  };

  const download = async (order, type) => {
    const number = order.comprobanteNumero || order.boletaNumero || order.id;
    await downloadApiFile(`/orders/${order.id || order._id}/document/${type}`, `${type}-${number}.${type === 'xml' ? 'xml' : 'pdf'}`);
  };

  if (loading) return <div className="min-h-screen grid place-items-center"><span className="loader-ring large" /></div>;

  return (
    <div className="commerce-dashboard-page">
      <div className="commerce-shell">
        <div className="commerce-page-header">
          <div>
            <span className="commerce-eyebrow">Registro comercial</span>
            <h1>Ventas y comprobantes</h1>
            <p>Consulta las ventas atendidas, revisa sus productos y vuelve a descargar boletas, facturas o tickets.</p>
          </div>
          <button type="button" className="commerce-refresh-button" onClick={load}>Actualizar</button>
        </div>

        <div className="commerce-stat-grid order-summary-grid">
          <article className="commerce-stat-card commerce-stat-violet"><p>Ventas encontradas</p><strong>{totals.count}</strong></article>
          <article className="commerce-stat-card commerce-stat-emerald"><p>Importe acumulado</p><strong>{money(totals.amount)}</strong></article>
          <article className="commerce-stat-card commerce-stat-blue"><p>Boletas</p><strong>{filtered.filter(order => order.tipoComprobante === 'boleta').length}</strong></article>
          <article className="commerce-stat-card commerce-stat-amber"><p>Facturas</p><strong>{filtered.filter(order => order.tipoComprobante === 'factura').length}</strong></article>
        </div>

        <section className="commerce-panel orders-panel">
          <div className="orders-toolbar">
            <div className="commerce-search-box">
              <MagnifyingGlassIcon />
              <input className="commerce-search-input" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar cliente, comprobante o método de pago" />
            </div>
            <label className="orders-filter-select"><FunnelIcon /><select value={status} onChange={event => setStatus(event.target.value)}><option value="TODOS">Todos los estados</option><option value="PENDIENTE">Pendiente</option><option value="CONFIRMADO">Confirmado</option><option value="ENVIADO">Enviado</option><option value="ENTREGADO">Entregado</option><option value="CANCELADO">Cancelado</option></select></label>
          </div>

          {filtered.length ? (
            <div className="orders-table-wrap">
              <table className="professional-table">
                <thead><tr><th>Comprobante</th><th>Cliente</th><th>Fecha</th><th>Pago</th><th>Estado</th><th>Total</th><th>Acciones</th></tr></thead>
                <tbody>
                  {filtered.map(order => (
                    <tr key={order.id || order._id}>
                      <td><strong>{order.comprobanteNumero || order.boletaNumero || `#${String(order.id).slice(0, 8)}`}</strong><small>{String(order.tipoComprobante || 'boleta').toUpperCase()} · {order.canalVenta || 'WEB'}</small></td>
                      <td><strong>{order.compradorNombre || 'Cliente de tienda'}</strong><small>{order.clienteDocumento || order.clienteRuc || 'Sin documento'}</small></td>
                      <td>{new Date(order.fecha).toLocaleString('es-PE')}</td>
                      <td><span className="payment-pill">{String(order.metodoPago || '').toUpperCase()}</span></td>
                      <td><span className={statusClass(order.estado)}>{order.estado}</span></td>
                      <td><strong>{money(order.total)}</strong>{Number(order.descuento) > 0 && <small>-{money(order.descuento)} promoción</small>}</td>
                      <td>
                        <div className="table-actions">
                          <button type="button" title="Ver detalle" onClick={() => setSelectedOrder(order)}><EyeIcon /></button>
                          <button type="button" title="Descargar comprobante" onClick={() => download(order, order.tipoComprobante || 'boleta')}><DocumentArrowDownIcon /></button>
                          <button type="button" title="Imprimir ticket" onClick={() => download(order, 'ticket')}><PrinterIcon /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state-card"><ClipboardDocumentListIcon /><h3>No hay ventas con esos filtros</h3><p>Cambia la búsqueda o registra una nueva venta desde el punto de venta.</p></div>
          )}
        </section>
      </div>

      {selectedOrder && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="order-detail-modal">
            <div className="modal-title">
              <div><span className="commerce-eyebrow">Detalle de venta</span><h2>{selectedOrder.comprobanteNumero || selectedOrder.boletaNumero}</h2><p>{new Date(selectedOrder.fecha).toLocaleString('es-PE')}</p></div>
              <button type="button" className="icon-button" onClick={() => setSelectedOrder(null)}><XMarkIcon /></button>
            </div>

            <div className="order-detail-header-grid">
              <div><span>Cliente</span><strong>{selectedOrder.compradorNombre}</strong><small>{selectedOrder.clienteDocumento || selectedOrder.clienteRuc || 'Sin documento'}</small></div>
              <div><span>Vendedor</span><strong>{selectedOrder.vendedorNombre}</strong><small>{selectedOrder.canalVenta || 'WEB'}</small></div>
              <div><span>Pago</span><strong>{String(selectedOrder.metodoPago || '').toUpperCase()}</strong><small>{selectedOrder.pagoEstado || 'REGISTRADO'}</small></div>
              <div><span>Estado</span><strong className={statusClass(selectedOrder.estado)}>{selectedOrder.estado}</strong><small>{selectedOrder.couponCode ? `Cupón ${selectedOrder.couponCode}` : 'Sin promoción'}</small></div>
            </div>

            <div className="order-products-list">
              <div className="order-products-head"><span>Producto</span><span>Cantidad</span><span>Precio</span><span>Importe</span></div>
              {(selectedOrder.productos || []).map((item, index) => (
                <div className="order-product-line" key={`${item.productoId}-${index}`}><strong>{item.nombre}</strong><span>{item.cantidad}</span><span>{money(item.precio)}</span><b>{money(Number(item.precio) * Number(item.cantidad))}</b></div>
              ))}
            </div>

            <div className="order-detail-bottom">
              <div className="order-document-actions">
                <button type="button" className="btn-primary" onClick={() => download(selectedOrder, selectedOrder.tipoComprobante || 'boleta')}><DocumentArrowDownIcon /> Descargar comprobante</button>
                <button type="button" className="btn-secondary" onClick={() => download(selectedOrder, 'ticket')}><PrinterIcon /> Ticket</button>
                <button type="button" className="btn-secondary" onClick={() => download(selectedOrder, 'xml')}><DocumentArrowDownIcon /> XML</button>
              </div>
              <div className="order-total-card">
                <p><span>Subtotal</span><b>{money(selectedOrder.subtotal)}</b></p>
                <p><span>Descuento</span><b>-{money(selectedOrder.descuento)}</b></p>
                <p><span>IGV</span><b>{money(selectedOrder.igv)}</b></p>
                <h3><span>Total</span><b>{money(selectedOrder.total)}</b></h3>
              </div>
            </div>

            {selectedOrder.estado === 'PENDIENTE' && (
              <div className="order-pending-actions">
                <p>Esta venta aún está pendiente. Puedes aprobarla o cancelarla antes de su confirmación.</p>
                <button type="button" className="btn-primary" onClick={() => updateStatus(selectedOrder, 'CONFIRMADO')}><CheckIcon /> Confirmar</button>
                <button type="button" className="btn-danger" onClick={() => updateStatus(selectedOrder, 'CANCELADO')}><XMarkIcon /> Cancelar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
