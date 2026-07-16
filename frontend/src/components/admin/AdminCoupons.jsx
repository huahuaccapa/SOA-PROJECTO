import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  PlusIcon,
  PowerIcon,
  TicketIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const EMPTY_FORM = {
  code: '',
  type: 'percentage',
  value: 10,
  minPurchase: 0,
  maxDiscount: '',
  expiresAt: '',
  usageLimit: 100,
  active: true,
  description: '',
};

const money = value => new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
}).format(Number(value || 0));

const asArray = value => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.coupons)) return value.coupons;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

const dateInputValue = value => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const formatDate = value => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha inválida';
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function AdminCoupons() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/coupons?active=false');
      setItems(asArray(response.data));
    } catch (requestError) {
      console.error('No se pudieron cargar los cupones:', requestError);
      setItems([]);
      setError('No se pudo conectar con el servicio de promociones. Verifica que coupon-service esté ejecutándose.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const active = items.filter(item => Boolean(item.active)).length;
    const uses = items.reduce((sum, item) => sum + Number(item.usedCount || 0), 0);
    const expiring = items.filter(item => {
      if (!item.expiresAt || !item.active) return false;
      const days = (new Date(item.expiresAt).getTime() - Date.now()) / 86400000;
      return days >= 0 && days <= 7;
    }).length;
    return { active, uses, expiring };
  }, [items]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setOpen(true);
  };

  const openEdit = item => {
    setEditingId(String(item.id || item._id));
    setForm({
      code: item.code || '',
      type: item.type || 'percentage',
      value: Number(item.value || 0),
      minPurchase: Number(item.minPurchase || 0),
      maxDiscount: item.maxDiscount ?? '',
      expiresAt: dateInputValue(item.expiresAt),
      usageLimit: Number(item.usageLimit || 1),
      active: Boolean(item.active),
      description: item.description || '',
    });
    setOpen(true);
  };

  const save = async event => {
    event.preventDefault();
    if (form.type === 'percentage' && Number(form.value) > 100) {
      toast.error('El descuento porcentual no puede superar el 100%');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        value: Number(form.value),
        minPurchase: Number(form.minPurchase || 0),
        maxDiscount: form.maxDiscount === '' ? null : Number(form.maxDiscount),
        usageLimit: Number(form.usageLimit || 1),
      };

      if (editingId) await api.put(`/coupons/${editingId}`, payload);
      else await api.post('/coupons', payload);

      toast.success(editingId ? 'Promoción actualizada' : 'Promoción creada');
      setOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await load();
    } catch (requestError) {
      toast.error(requestError.response?.data?.error || 'No se pudo guardar la promoción');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async item => {
    try {
      await api.put(`/coupons/${item.id || item._id}`, { ...item, active: !item.active });
      toast.success(item.active ? 'Promoción desactivada' : 'Promoción activada');
      await load();
    } catch (requestError) {
      toast.error(requestError.response?.data?.error || 'No se pudo cambiar el estado');
    }
  };

  const remove = async item => {
    if (!window.confirm(`¿Eliminar definitivamente el cupón ${item.code}?`)) return;
    try {
      await api.delete(`/coupons/${item.id || item._id}`);
      toast.success('Cupón eliminado');
      await load();
    } catch (requestError) {
      toast.error(requestError.response?.data?.error || 'No se pudo eliminar el cupón');
    }
  };

  return (
    <div className="commerce-dashboard-page">
      <div className="commerce-shell">
        <div className="commerce-page-header">
          <div>
            <span className="commerce-eyebrow">Marketing comercial</span>
            <h1>Cupones y promociones</h1>
            <p>Administra descuentos, vigencias, compras mínimas y límites de uso desde una sola sección.</p>
          </div>
          <button type="button" className="btn-primary" onClick={openCreate}>
            <PlusIcon className="w-5 h-5" /> Nueva promoción
          </button>
        </div>

        <div className="commerce-stat-grid">
          <article className="commerce-stat-card commerce-stat-violet">
            <p>Promociones creadas</p><strong>{items.length}</strong>
          </article>
          <article className="commerce-stat-card commerce-stat-emerald">
            <p>Promociones activas</p><strong>{stats.active}</strong>
          </article>
          <article className="commerce-stat-card commerce-stat-blue">
            <p>Usos acumulados</p><strong>{stats.uses}</strong>
          </article>
          <article className="commerce-stat-card commerce-stat-amber">
            <p>Vencen en 7 días</p><strong>{stats.expiring}</strong>
          </article>
        </div>

        {error && (
          <section className="commerce-panel service-error-card">
            <div>
              <strong>Servicio de promociones no disponible</strong>
              <p>{error}</p>
            </div>
            <button type="button" className="commerce-refresh-button" onClick={load}>Reintentar</button>
          </section>
        )}

        <section className="commerce-panel">
          <div className="commerce-panel-heading split-heading">
            <div>
              <span className="commerce-eyebrow">Campañas vigentes</span>
              <h2>Promociones registradas</h2>
            </div>
            <button type="button" className="commerce-refresh-button" onClick={load}>Actualizar</button>
          </div>

          {loading ? (
            <div className="panel-loading"><span className="loader-ring" /> Cargando promociones...</div>
          ) : items.length === 0 ? (
            <div className="empty-state-card">
              <TicketIcon />
              <h3>Aún no hay promociones</h3>
              <p>Crea el primer cupón para que pueda aplicarse en el punto de venta.</p>
              <button type="button" className="btn-primary" onClick={openCreate}>Crear promoción</button>
            </div>
          ) : (
            <div className="coupon-grid">
              {items.map(item => {
                const expired = item.expiresAt && new Date(item.expiresAt).getTime() < Date.now();
                return (
                  <article className={`coupon-card ${!item.active || expired ? 'is-muted' : ''}`} key={item.id || item._id || item.code}>
                    <div className="coupon-icon"><TicketIcon /></div>
                    <div className="coupon-card-copy">
                      <div className="coupon-status-row">
                        <span className={item.active && !expired ? 'status-on' : 'status-off'}>
                          {expired ? 'Vencida' : item.active ? 'Activa' : 'Inactiva'}
                        </span>
                        <span><CalendarDaysIcon /> {formatDate(item.expiresAt)}</span>
                      </div>
                      <h2>{item.code}</h2>
                      <p>{item.description || 'Promoción ByteVerse'}</p>
                      <strong>{item.type === 'percentage' ? `${Number(item.value)}%` : money(item.value)} de descuento</strong>
                      <div className="coupon-meta-grid">
                        <span>Compra mínima <b>{money(item.minPurchase)}</b></span>
                        <span>Usos <b>{Number(item.usedCount || 0)} / {Number(item.usageLimit || 0)}</b></span>
                        <span>Tope <b>{item.maxDiscount ? money(item.maxDiscount) : 'Sin límite'}</b></span>
                      </div>
                    </div>
                    <div className="coupon-actions">
                      <button type="button" title={item.active ? 'Desactivar' : 'Activar'} onClick={() => toggle(item)}><PowerIcon /></button>
                      <button type="button" title="Editar" onClick={() => openEdit(item)}><PencilSquareIcon /></button>
                      <button type="button" title="Eliminar" onClick={() => remove(item)}><TrashIcon /></button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {open && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="admin-form-modal" onSubmit={save}>
            <div className="modal-title">
              <div>
                <span className="commerce-eyebrow">Configuración comercial</span>
                <h2>{editingId ? 'Editar promoción' : 'Nueva promoción'}</h2>
                <p>Define las condiciones que se validarán automáticamente al vender.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setOpen(false)}><XMarkIcon /></button>
            </div>

            <div className="form-grid">
              <label>
                Código
                <input
                  className="input-field"
                  required
                  minLength={3}
                  maxLength={20}
                  value={form.code}
                  onChange={event => setForm({ ...form, code: event.target.value.replace(/[^a-z0-9]/gi, '') })}
                  placeholder="VERANO20"
                />
              </label>
              <label>
                Tipo de descuento
                <select className="input-field" value={form.type} onChange={event => setForm({ ...form, type: event.target.value })}>
                  <option value="percentage">Porcentaje</option>
                  <option value="fixed">Monto fijo</option>
                </select>
              </label>
              <label>
                Valor
                <input className="input-field" type="number" min="1" step="0.01" required value={form.value} onChange={event => setForm({ ...form, value: event.target.value })} />
              </label>
              <label>
                Compra mínima
                <input className="input-field" type="number" min="0" step="0.01" value={form.minPurchase} onChange={event => setForm({ ...form, minPurchase: event.target.value })} />
              </label>
              <label>
                Descuento máximo
                <input className="input-field" type="number" min="0" step="0.01" value={form.maxDiscount} onChange={event => setForm({ ...form, maxDiscount: event.target.value })} placeholder="Opcional" />
              </label>
              <label>
                Fecha de vencimiento
                <input className="input-field" type="date" required value={form.expiresAt} onChange={event => setForm({ ...form, expiresAt: event.target.value })} />
              </label>
              <label>
                Límite de usos
                <input className="input-field" type="number" min="1" value={form.usageLimit} onChange={event => setForm({ ...form, usageLimit: event.target.value })} />
              </label>
              <label className="toggle-field">
                Estado
                <button type="button" className={`switch-button ${form.active ? 'is-on' : ''}`} onClick={() => setForm({ ...form, active: !form.active })}>
                  <span /> {form.active ? 'Activa' : 'Inactiva'}
                </button>
              </label>
              <label className="md:col-span-2">
                Descripción
                <textarea className="input-field" rows="3" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Explica brevemente el beneficio de la promoción" />
              </label>
            </div>

            <div className="modal-actions-row">
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn-primary" disabled={saving}>
                <CheckCircleIcon className="w-5 h-5" /> {saving ? 'Guardando...' : 'Guardar promoción'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
