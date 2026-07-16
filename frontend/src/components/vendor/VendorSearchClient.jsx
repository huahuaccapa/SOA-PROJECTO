import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
  ArrowRightIcon,
  ClipboardDocumentListIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PhoneIcon,
  ShoppingBagIcon,
  TagIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const money = value => new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
}).format(Number(value || 0));

const asArray = value => Array.isArray(value) ? value : [];

export default function VendorSearchClient() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [term, setTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const loadClients = async () => {
      setLoading(true);
      try {
        const response = await api.get('/users?role=COMPRADOR&activo=true');
        setClients(asArray(response.data));
      } catch (error) {
        console.error(error);
        toast.error('No se pudieron cargar los clientes');
      } finally {
        setLoading(false);
      }
    };
    loadClients();
  }, []);

  const filtered = useMemo(() => {
    const query = term.trim().toLowerCase();
    if (!query) return clients.slice(0, 10);
    return clients.filter(client => `${client.nombre} ${client.email || ''} ${client.documento || ''} ${client.telefono || ''}`.toLowerCase().includes(query)).slice(0, 12);
  }, [clients, term]);

  const selectClient = async client => {
    setSelectedClient(client);
    setTerm(client.nombre || '');
    setHistoryLoading(true);
    try {
      const response = await api.get(`/orders?compradorId=${client.id || client._id}`);
      setOrders(asArray(response.data));
    } catch {
      setOrders([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const clearClient = () => {
    setSelectedClient(null);
    setOrders([]);
    setTerm('');
  };

  const stats = useMemo(() => {
    const validOrders = orders.filter(order => order.estado !== 'CANCELADO');
    const spent = validOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    return {
      orders: validOrders.length,
      spent,
      average: validOrders.length ? spent / validOrders.length : 0,
      lastPurchase: validOrders[0]?.fecha || null,
    };
  }, [orders]);

  const preferences = useMemo(() => {
    const frequency = new Map();
    orders.forEach(order => {
      (order.productos || []).forEach(item => {
        const category = item.categoria || 'Tecnología';
        frequency.set(category, (frequency.get(category) || 0) + Number(item.cantidad || 1));
      });
    });
    return [...frequency.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [orders]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><span className="loader-ring large" /></div>;
  }

  return (
    <div className="commerce-dashboard-page">
      <div className="commerce-shell">
        <div className="commerce-page-header">
          <div>
            <span className="commerce-eyebrow">Atención personalizada</span>
            <h1>Clientes</h1>
            <p>Consulta sus compras anteriores y preferencias antes de iniciar una venta presencial.</p>
          </div>
          <Link to="/vendor/pos" className="btn-primary"><ShoppingBagIcon /> Venta de mostrador</Link>
        </div>

        <section className="commerce-panel client-search-panel">
          <div className="client-search-heading">
            <div><UserGroupIcon /><span><strong>{clients.length}</strong> clientes registrados</span></div>
            {selectedClient && <button type="button" className="commerce-refresh-button" onClick={clearClient}><XMarkIcon /> Limpiar selección</button>}
          </div>
          <div className="commerce-search-box">
            <MagnifyingGlassIcon />
            <input className="commerce-search-input" value={term} onChange={event => { setTerm(event.target.value); if (selectedClient && event.target.value !== selectedClient.nombre) setSelectedClient(null); }} placeholder="Buscar por nombre, correo, DNI o teléfono" />
          </div>
          {!selectedClient && (
            <div className="client-result-grid">
              {filtered.map(client => (
                <button type="button" key={client.id || client._id} onClick={() => selectClient(client)}>
                  <span className="client-initial">{client.nombre?.charAt(0) || 'C'}</span>
                  <span><strong>{client.nombre}</strong><small>{client.documento ? `${client.tipoDocumento || 'DNI'} ${client.documento}` : client.email}</small></span>
                  <ArrowRightIcon />
                </button>
              ))}
              {filtered.length === 0 && <div className="empty-state-inline">No se encontraron clientes con esa búsqueda.</div>}
            </div>
          )}
        </section>

        {selectedClient && (
          <>
            <section className="commerce-panel client-profile-hero">
              <div className="client-avatar-large">{selectedClient.nombre?.charAt(0) || 'C'}</div>
              <div className="client-profile-main">
                <span className="status-on">Cliente activo</span>
                <h2>{selectedClient.nombre}</h2>
                <div className="client-contact-list">
                  <span><EnvelopeIcon /> {selectedClient.email || 'Sin correo'}</span>
                  <span><PhoneIcon /> {selectedClient.telefono || 'Sin teléfono'}</span>
                  <span><MapPinIcon /> {selectedClient.direccion || 'Sin dirección registrada'}</span>
                </div>
              </div>
              <button type="button" className="btn-primary" onClick={() => navigate(`/vendor/pos?client=${selectedClient.id || selectedClient._id}`)}>
                <ShoppingBagIcon /> Nueva venta
              </button>
            </section>

            <div className="commerce-stat-grid client-stat-grid">
              <article className="commerce-stat-card commerce-stat-violet"><p>Compras realizadas</p><strong>{stats.orders}</strong></article>
              <article className="commerce-stat-card commerce-stat-emerald"><p>Total comprado</p><strong>{money(stats.spent)}</strong></article>
              <article className="commerce-stat-card commerce-stat-blue"><p>Ticket promedio</p><strong>{money(stats.average)}</strong></article>
              <article className="commerce-stat-card commerce-stat-amber"><p>Última compra</p><strong className="small-stat-value">{stats.lastPurchase ? new Date(stats.lastPurchase).toLocaleDateString('es-PE') : 'Sin compras'}</strong></article>
            </div>

            <div className="client-insights-grid">
              <section className="commerce-panel">
                <div className="commerce-panel-heading split-heading">
                  <div><span className="commerce-eyebrow">Historial comercial</span><h2>Compras recientes</h2></div>
                  <ClipboardDocumentListIcon />
                </div>
                {historyLoading ? <div className="panel-loading"><span className="loader-ring" /> Cargando historial...</div> : orders.length ? orders.slice(0, 8).map(order => (
                  <div className="history-row enhanced" key={order.id || order._id}>
                    <div className="history-icon"><ClipboardDocumentListIcon /></div>
                    <div><strong>{order.comprobanteNumero || order.boletaNumero || `Pedido #${String(order.id || order._id).slice(0, 8)}`}</strong><small>{new Date(order.fecha || order.createdAt).toLocaleString('es-PE')} · {order.estado}</small></div>
                    <div className="history-total"><strong>{money(order.total)}</strong><small>{(order.productos || []).reduce((sum, item) => sum + Number(item.cantidad || 0), 0)} productos</small></div>
                  </div>
                )) : <p className="empty-copy">Este cliente aún no registra compras.</p>}
              </section>

              <section className="commerce-panel">
                <div className="commerce-panel-heading split-heading">
                  <div><span className="commerce-eyebrow">Preferencias</span><h2>Categorías favoritas</h2></div>
                  <TagIcon />
                </div>
                {preferences.length ? preferences.map(([name, count], index) => (
                  <div className="preference-bar-row" key={name}>
                    <div><span>{index + 1}</span><strong>{name}</strong><b>{count} unidades</b></div>
                    <div className="preference-track"><i style={{ width: `${Math.max(18, (count / preferences[0][1]) * 100)}%` }} /></div>
                  </div>
                )) : <p className="empty-copy">Las preferencias aparecerán cuando el cliente realice compras.</p>}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
