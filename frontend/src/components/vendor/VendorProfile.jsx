import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  BanknotesIcon,
  CheckBadgeIcon,
  CheckIcon,
  ClipboardDocumentListIcon,
  EnvelopeIcon,
  IdentificationIcon,
  MapPinIcon,
  PencilSquareIcon,
  PhoneIcon,
  ReceiptPercentIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const money = value => new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
}).format(Number(value || 0));

const asArray = value => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

export default function VendorProfile() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(user || {});
  const [form, setForm] = useState({ nombre: '', apellido: '', direccion: '' });
  const [orders, setOrders] = useState([]);
  const [promotionCount, setPromotionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [profileResponse, ordersResponse, couponsResponse] = await Promise.all([
        api.get(`/users/${user.id}`),
        api.get(`/orders?vendedorId=${user.id}`),
        api.get('/coupons?active=true').catch(() => ({ data: [] })),
      ]);
      const loadedProfile = profileResponse.data || user;
      setProfile(loadedProfile);
      setForm({
        nombre: loadedProfile.nombre || '',
        apellido: loadedProfile.apellido || '',
        direccion: loadedProfile.direccion || '',
      });
      setOrders(asArray(ordersResponse.data));
      setPromotionCount(asArray(couponsResponse.data).length);
    } catch (error) {
      console.error('Vendor profile:', error);
      if (![401, 503].includes(error.response?.status)) toast.error('No se pudo cargar el perfil del vendedor', { id: 'vendor-profile-load' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const validOrders = orders.filter(order => order.estado !== 'CANCELADO');
    const todayOrders = validOrders.filter(order => String(order.fecha || '').slice(0, 10) === today);
    const total = validOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    return {
      todaySales: todayOrders.length,
      totalSales: validOrders.length,
      total,
      average: validOrders.length ? total / validOrders.length : 0,
    };
  }, [orders]);

  const cancelEdit = () => {
    setForm({
      nombre: profile.nombre || '',
      apellido: profile.apellido || '',
      direccion: profile.direccion || '',
    });
    setEditing(false);
  };

  const save = async event => {
    event.preventDefault();
    if (form.nombre.trim().length < 3) return toast.error('Ingresa un nombre válido');
    if (form.apellido && form.apellido.trim().length < 2) return toast.error('Ingresa un apellido válido');

    setSaving(true);
    try {
      const response = await api.put(`/users/${user.id}`, {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        direccion: form.direccion.trim(),
      });
      const updated = response.data || { ...profile, ...form };
      setProfile(updated);
      setEditing(false);
      localStorage.setItem('user', JSON.stringify({ ...user, ...updated }));
      toast.success('Datos personales actualizados');
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen grid place-items-center"><span className="loader-ring large" /></div>;

  const fullName = `${profile.nombre || 'Vendedor'} ${profile.apellido || ''}`.trim();

  return (
    <div className="commerce-dashboard-page vendor-profile-page">
      <div className="commerce-shell">
        <section className="vendor-profile-hero">
          <div className="vendor-profile-identity">
            <div className="vendor-profile-avatar">
              {profile.avatar ? <img src={profile.avatar} alt={fullName} /> : <UserCircleIcon />}
            </div>
            <div>
              <span className="commerce-eyebrow light">Cuenta de atención presencial</span>
              <h1>{fullName}</h1>
              <p>{profile.email}</p>
              <div className="vendor-profile-badges">
                <span><CheckBadgeIcon /> Vendedor activo</span>
                <span><ShieldCheckIcon /> Permisos controlados</span>
              </div>
            </div>
          </div>
          <div className="vendor-profile-permission">
            <ShieldCheckIcon />
            <div>
              <strong>Perfil protegido</strong>
              <p>Solo puedes modificar nombres, apellidos y dirección. El administrador controla correo, documento, teléfono, comisión, rol y estado.</p>
            </div>
          </div>
        </section>

        <div className="commerce-stat-grid vendor-profile-stats">
          <article className="commerce-stat-card commerce-stat-violet"><p>Ventas de hoy</p><strong>{stats.todaySales}</strong></article>
          <article className="commerce-stat-card commerce-stat-emerald"><p>Ventas atendidas</p><strong>{stats.totalSales}</strong></article>
          <article className="commerce-stat-card commerce-stat-blue"><p>Total vendido</p><strong>{money(stats.total)}</strong></article>
          <article className="commerce-stat-card commerce-stat-amber"><p>Ticket promedio</p><strong>{money(stats.average)}</strong></article>
        </div>

        <div className="vendor-profile-layout">
          <section className="commerce-panel">
            <div className="commerce-panel-heading split-heading">
              <div>
                <span className="commerce-eyebrow">Datos personales</span>
                <h2>Información del vendedor</h2>
                <p>Los campos administrados por la tienda se muestran en modo de solo lectura.</p>
              </div>
              {!editing && (
                <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
                  <PencilSquareIcon /> Editar permitidos
                </button>
              )}
            </div>

            <form className="vendor-profile-form" onSubmit={save}>
              <label>
                Nombres
                <div className="field-with-icon"><UserCircleIcon /><input required minLength={3} disabled={!editing} value={form.nombre} onChange={event => setForm({ ...form, nombre: event.target.value.replace(/[^a-zA-ZÀ-ÿ' -]/g, '') })} /></div>
              </label>
              <label>
                Apellidos
                <div className="field-with-icon"><UserCircleIcon /><input disabled={!editing} value={form.apellido} onChange={event => setForm({ ...form, apellido: event.target.value.replace(/[^a-zA-ZÀ-ÿ' -]/g, '') })} /></div>
              </label>
              <label className="full-field">
                Dirección
                <div className="field-with-icon"><MapPinIcon /><input disabled={!editing} value={form.direccion} onChange={event => setForm({ ...form, direccion: event.target.value.replace(/[<>`{}]/g, '') })} placeholder="Dirección registrada" /></div>
              </label>

              <label>
                Correo electrónico
                <div className="field-with-icon locked"><EnvelopeIcon /><input disabled value={profile.email || ''} /></div>
              </label>
              <label>
                Teléfono
                <div className="field-with-icon locked"><PhoneIcon /><input disabled value={profile.telefono || 'No registrado'} /></div>
              </label>
              <label>
                Documento
                <div className="field-with-icon locked"><IdentificationIcon /><input disabled value={`${profile.tipoDocumento || 'DNI'} · ${profile.documento || 'No registrado'}`} /></div>
              </label>
              <label>
                Comisión
                <div className="field-with-icon locked"><ReceiptPercentIcon /><input disabled value={`${Number(profile.comision || 0).toFixed(2)} %`} /></div>
              </label>

              {editing && (
                <div className="vendor-profile-actions full-field">
                  <button type="submit" className="btn-primary" disabled={saving}><CheckIcon /> {saving ? 'Guardando...' : 'Guardar cambios'}</button>
                  <button type="button" className="btn-secondary" onClick={cancelEdit}><XMarkIcon /> Cancelar</button>
                </div>
              )}
            </form>
          </section>

          <aside className="vendor-profile-side">
            <section className="commerce-panel permission-list-card">
              <span className="commerce-eyebrow">Funciones habilitadas</span>
              <h2>Tu trabajo en tienda</h2>
              <ul>
                <li><ClipboardDocumentListIcon /><span><strong>Registrar ventas</strong>Atender clientes desde el punto de venta.</span></li>
                <li><BanknotesIcon /><span><strong>Cobrar y emitir comprobantes</strong>Efectivo, tarjeta, Yape, Plin o transferencia.</span></li>
                <li><ReceiptPercentIcon /><span><strong>Aplicar promociones</strong>{promotionCount} promociones activas disponibles.</span></li>
                <li><ShieldCheckIcon /><span><strong>Sin administración sensible</strong>No puedes crear productos, usuarios ni modificar permisos.</span></li>
              </ul>
            </section>

            <button type="button" className="vendor-profile-logout" onClick={() => window.confirm('¿Deseas cerrar sesión?') && logout()}>
              <XMarkIcon /> Cerrar sesión
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
