import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  EnvelopeIcon,
  IdentificationIcon,
  MapPinIcon,
  PencilSquareIcon,
  PhoneIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { asArray, formatCurrency, formatNumber } from '../../utils/formatters';
import toast from 'react-hot-toast';

const BuyerProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(user || {});
  const [orders, setOrders] = useState([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phoneChecking, setPhoneChecking] = useState(false);
  const [form, setForm] = useState({ nombre: '', apellido: '', telefono: '', direccion: '', documento: '', tipoDocumento: 'DNI' });

  const hydrateForm = value => setForm({
    nombre: value?.nombre || '', apellido: value?.apellido || '', telefono: value?.telefono || '',
    direccion: value?.direccion || '', documento: value?.documento || '', tipoDocumento: value?.tipoDocumento || 'DNI',
  });

  const load = async () => {
    const id = user?.id || user?._id;
    if (!id) return;
    setLoading(true);
    const [profileResult, ordersResult] = await Promise.allSettled([
      api.get(`/users/${id}`, { skipGlobalError: true }),
      api.get('/orders', { skipGlobalError: true }),
    ]);
    const nextProfile = profileResult.status === 'fulfilled' ? profileResult.value.data : user;
    setProfile(nextProfile || user || {});
    hydrateForm(nextProfile || user || {});
    setOrders(ordersResult.status === 'fulfilled' ? asArray(ordersResult.value.data) : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id, user?._id]);

  const stats = useMemo(() => {
    const valid = orders.filter(order => order.estado !== 'CANCELADO');
    return {
      total: valid.length,
      active: orders.filter(order => ['PENDIENTE', 'CONFIRMADO', 'ENVIADO'].includes(order.estado)).length,
      spent: valid.reduce((sum, order) => sum + Number(order.total || 0), 0),
    };
  }, [orders]);

  const completion = useMemo(() => {
    const values = [profile.nombre, profile.email, profile.telefono, profile.direccion, profile.documento];
    return Math.round((values.filter(value => String(value || '').trim()).length / values.length) * 100);
  }, [profile]);

  const save = async event => {
    event.preventDefault();
    if (form.nombre.trim().length < 3) {
      toast.error('El nombre debe tener al menos 3 caracteres');
      return;
    }
    setSaving(true);
    try {
      const id = user?.id || user?._id;
      const response = await api.put(`/users/${id}`, form);
      const updated = response.data?.user || response.data;
      const merged = { ...profile, ...form, ...(updated && typeof updated === 'object' ? updated : {}) };
      localStorage.setItem('user', JSON.stringify({ ...user, ...merged }));
      setProfile(merged);
      hydrateForm(merged);
      setEditing(false);
      toast.success('Perfil actualizado correctamente');
      window.setTimeout(() => window.location.reload(), 350);
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const validatePhone = async () => {
    if (!form.telefono.trim()) {
      toast.error('Ingresa un teléfono para validarlo');
      return;
    }
    setPhoneChecking(true);
    try {
      const response = await api.post('/users/validate-phone', { number: form.telefono, country: 'PE' });
      const payload = response.data || {};
      const valid = payload.isValidNumber ?? payload.valid ?? payload.isValid;
      if (valid === false) toast.error('El servicio indica que el número no es válido');
      else toast.success(valid === true ? 'Número telefónico validado' : 'El número tiene un formato aceptable');
    } catch (error) {
      if (error.response?.status === 503) toast('La validación externa no está configurada; puedes guardar el número igualmente.');
      else toast.error(error.response?.data?.error || 'No se pudo validar el teléfono');
    } finally {
      setPhoneChecking(false);
    }
  };

  if (loading) {
    return <div className="role-loading-page"><span className="loader-ring" /><strong>Cargando tu perfil...</strong><p>Preparando tus datos y estadísticas de compra.</p></div>;
  }

  return (
    <div className="commerce-dashboard-page buyer-profile-page">
      <div className="commerce-shell buyer-profile-shell">
        <section className="buyer-profile-hero">
          <div className="buyer-profile-avatar">{profile?.nombre?.charAt(0)?.toUpperCase() || 'C'}</div>
          <div className="buyer-profile-identity"><span className="commerce-eyebrow">Cuenta de comprador</span><h1>{[profile.nombre, profile.apellido].filter(Boolean).join(' ') || 'Cliente ByteVerse'}</h1><p><EnvelopeIcon /> {profile.email}</p><div><span><ShieldCheckIcon /> Cuenta activa</span><span><CheckCircleIcon /> Perfil {completion}% completo</span></div></div>
          <div className="buyer-profile-completion"><strong>{completion}%</strong><span>Perfil completado</span><div><i style={{ width: `${completion}%` }} /></div><small>Completa tus datos para agilizar futuras compras.</small></div>
        </section>

        <div className="buyer-profile-stat-grid">
          <Link to="/orders"><ClipboardDocumentListIcon /><div><small>Compras válidas</small><strong>{formatNumber(stats.total)}</strong></div></Link>
          <Link to="/orders"><ShoppingBagIcon /><div><small>Total comprado</small><strong>{formatCurrency(stats.spent)}</strong></div></Link>
          <Link to="/orders"><ArrowPathIcon /><div><small>Pedidos en proceso</small><strong>{formatNumber(stats.active)}</strong></div></Link>
        </div>

        <section className="commerce-panel buyer-profile-form-panel">
          <div className="panel-title-row"><div><span className="commerce-eyebrow">Información personal</span><h2>Datos de cuenta y entrega</h2><p>Tu correo y rol están protegidos. Puedes actualizar los datos necesarios para comprar.</p></div>{!editing ? <button type="button" className="btn-secondary" onClick={() => setEditing(true)}><PencilSquareIcon /> Editar información</button> : <button type="button" className="icon-button" onClick={() => { setEditing(false); hydrateForm(profile); }}><XMarkIcon /></button>}</div>

          <form onSubmit={save} className="buyer-profile-form">
            <label><span>Nombres</span><div className="input-with-icon"><UserCircleIcon /><input className="input-field" value={form.nombre} disabled={!editing} onChange={event => setForm({ ...form, nombre: event.target.value })} required /></div></label>
            <label><span>Apellidos</span><div className="input-with-icon"><UserCircleIcon /><input className="input-field" value={form.apellido} disabled={!editing} onChange={event => setForm({ ...form, apellido: event.target.value })} /></div></label>
            <label><span>Correo electrónico</span><div className="input-with-icon"><EnvelopeIcon /><input className="input-field" value={profile.email || ''} disabled /></div><small>Solo el administrador puede cambiar el correo.</small></label>
            <label><span>Teléfono</span><div className="buyer-phone-field"><div className="input-with-icon"><PhoneIcon /><input className="input-field" value={form.telefono} disabled={!editing} onChange={event => setForm({ ...form, telefono: event.target.value.replace(/[^0-9+() -]/g, '') })} placeholder="+51 999 999 999" /></div>{editing && <button type="button" className="btn-secondary" disabled={phoneChecking} onClick={validatePhone}>{phoneChecking ? 'Validando...' : 'Validar'}</button>}</div></label>
            <label><span>Tipo de documento</span><div className="input-with-icon"><IdentificationIcon /><select className="input-field" value={form.tipoDocumento} disabled={!editing} onChange={event => setForm({ ...form, tipoDocumento: event.target.value })}><option value="DNI">DNI</option><option value="RUC">RUC</option><option value="CE">Carné de extranjería</option><option value="PASAPORTE">Pasaporte</option></select></div></label>
            <label><span>Número de documento</span><div className="input-with-icon"><IdentificationIcon /><input className="input-field" value={form.documento} disabled={!editing} onChange={event => setForm({ ...form, documento: event.target.value.replace(/[^A-Za-z0-9-]/g, '') })} /></div></label>
            <label className="full-field"><span>Dirección principal</span><div className="input-with-icon"><MapPinIcon /><input className="input-field" value={form.direccion} disabled={!editing} onChange={event => setForm({ ...form, direccion: event.target.value })} placeholder="Calle, número, urbanización y referencia" /></div></label>
            {editing && <div className="buyer-profile-actions full-field"><button type="button" className="btn-secondary" onClick={() => { setEditing(false); hydrateForm(profile); }}>Cancelar</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button></div>}
          </form>
        </section>
      </div>
    </div>
  );
};

export default BuyerProfile;
