import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PencilSquareIcon,
  PhoneIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserGroupIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { asArray, formatNumber } from '../../utils/formatters';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  nombre: '', apellido: '', email: '', role: 'COMPRADOR', activo: true,
  telefono: '', direccion: '', documento: '', tipoDocumento: 'DNI',
};

const roleLabel = role => ({ ADMIN: 'Administrador', VENDEDOR: 'Vendedor', COMPRADOR: 'Comprador' }[role] || role);

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('TODOS');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users');
      setUsers(asArray(response.data));
    } catch (error) {
      console.error(error);
      toast.error('No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(item => Boolean(item.activo)).length,
    buyers: users.filter(item => item.role === 'COMPRADOR').length,
    vendors: users.filter(item => item.role === 'VENDEDOR').length,
  }), [users]);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return users.filter(item => {
      const matchesText = !text || [item.nombre, item.apellido, item.email, item.documento, item.telefono]
        .some(value => String(value || '').toLowerCase().includes(text));
      const matchesRole = roleFilter === 'TODOS' || item.role === roleFilter;
      const matchesStatus = statusFilter === 'TODOS'
        || (statusFilter === 'ACTIVO' && Boolean(item.activo))
        || (statusFilter === 'INACTIVO' && !Boolean(item.activo));
      return matchesText && matchesRole && matchesStatus;
    });
  }, [users, query, roleFilter, statusFilter]);

  const openEdit = item => {
    setEditing(item);
    setForm({
      nombre: item.nombre || '', apellido: item.apellido || '', email: item.email || '',
      role: item.role || 'COMPRADOR', activo: Boolean(item.activo), telefono: item.telefono || '',
      direccion: item.direccion || '', documento: item.documento || '', tipoDocumento: item.tipoDocumento || 'DNI',
    });
  };

  const save = async event => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await api.put(`/users/${editing.id || editing._id}`, form);
      toast.success('Usuario actualizado correctamente');
      setEditing(null);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo actualizar el usuario');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async item => {
    const id = String(item.id || item._id);
    if (id === String(currentUser?.id || currentUser?._id)) {
      toast.error('No puedes desactivar tu propia cuenta');
      return;
    }
    if (!window.confirm(`¿Desactivar la cuenta de ${item.nombre}?`)) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Cuenta desactivada');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo desactivar la cuenta');
    }
  };

  if (loading) {
    return <div className="role-loading-page"><span className="loader-ring" /><strong>Cargando usuarios...</strong><p>Organizando compradores, vendedores y administradores.</p></div>;
  }

  return (
    <div className="commerce-dashboard-page admin-users-page">
      <div className="commerce-shell">
        <div className="commerce-page-header">
          <div><span className="commerce-eyebrow">Control de accesos</span><h1>Usuarios del sistema</h1><p>Consulta perfiles, cambia permisos y controla el estado de cada cuenta sin alterar el historial comercial.</p></div>
          <button type="button" className="commerce-refresh-button" onClick={load}><ArrowPathIcon /> Actualizar</button>
        </div>

        <div className="commerce-stat-grid">
          <article className="commerce-stat-card commerce-stat-violet"><span className="commerce-stat-icon"><UserGroupIcon /></span><p>Usuarios totales</p><strong>{formatNumber(stats.total)}</strong></article>
          <article className="commerce-stat-card commerce-stat-emerald"><span className="commerce-stat-icon"><CheckCircleIcon /></span><p>Cuentas activas</p><strong>{formatNumber(stats.active)}</strong></article>
          <article className="commerce-stat-card commerce-stat-blue"><span className="commerce-stat-icon"><UserIcon /></span><p>Compradores</p><strong>{formatNumber(stats.buyers)}</strong></article>
          <article className="commerce-stat-card commerce-stat-amber"><span className="commerce-stat-icon"><ShieldCheckIcon /></span><p>Vendedores</p><strong>{formatNumber(stats.vendors)}</strong></article>
        </div>

        <section className="commerce-panel">
          <div className="admin-user-toolbar">
            <div className="commerce-search-box"><MagnifyingGlassIcon /><input className="commerce-search-input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por nombre, correo, documento o teléfono" /></div>
            <select value={roleFilter} onChange={event => setRoleFilter(event.target.value)} className="admin-filter-select"><option value="TODOS">Todos los roles</option><option value="COMPRADOR">Compradores</option><option value="VENDEDOR">Vendedores</option><option value="ADMIN">Administradores</option></select>
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="admin-filter-select"><option value="TODOS">Todos los estados</option><option value="ACTIVO">Activos</option><option value="INACTIVO">Inactivos</option></select>
          </div>

          <div className="admin-users-result-head"><span>{filtered.length} resultado(s)</span><small>Los usuarios desactivados conservan sus pedidos y registros.</small></div>

          {filtered.length === 0 ? (
            <div className="compact-empty-state"><UserGroupIcon /><strong>No encontramos usuarios</strong><p>Prueba con otro texto o cambia los filtros.</p></div>
          ) : (
            <div className="admin-user-table-wrap">
              <table className="professional-table admin-user-table">
                <thead><tr><th>Usuario</th><th>Contacto</th><th>Rol</th><th>Documento</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>
                  {filtered.map(item => {
                    const id = String(item.id || item._id);
                    return (
                      <tr key={id}>
                        <td><div className="admin-user-cell"><span>{item.nombre?.charAt(0)?.toUpperCase() || 'U'}</span><div><strong>{[item.nombre, item.apellido].filter(Boolean).join(' ') || 'Usuario'}</strong><small>Registrado {item.fechaRegistro ? new Date(item.fechaRegistro).toLocaleDateString('es-PE') : 'sin fecha'}</small></div></div></td>
                        <td><div className="admin-contact-cell"><span><EnvelopeIcon /> {item.email || 'Sin correo'}</span><span><PhoneIcon /> {item.telefono || 'Sin teléfono'}</span></div></td>
                        <td><span className={`role-chip role-${String(item.role || '').toLowerCase()}`}>{roleLabel(item.role)}</span></td>
                        <td><strong>{item.tipoDocumento || 'DNI'}</strong><small>{item.documento || 'No registrado'}</small></td>
                        <td><span className={`account-status ${item.activo ? 'is-active' : 'is-inactive'}`}>{item.activo ? 'Activo' : 'Inactivo'}</span></td>
                        <td><div className="table-actions"><button type="button" onClick={() => openEdit(item)} title="Editar"><PencilSquareIcon /></button>{id !== String(currentUser?.id || currentUser?._id) && item.activo && <button type="button" onClick={() => deactivate(item)} className="danger-table-action" title="Desactivar"><TrashIcon /></button>}</div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {editing && (
        <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setEditing(null)}>
          <form className="admin-form-modal admin-user-edit-modal" onSubmit={save}>
            <div className="modal-title"><div><span className="commerce-eyebrow">Edición administrativa</span><h2>Actualizar usuario</h2><p>El administrador puede modificar datos, permisos y estado.</p></div><button type="button" className="icon-button" onClick={() => setEditing(null)}><XMarkIcon /></button></div>
            <div className="form-grid">
              <label>Nombres<input className="input-field" value={form.nombre} onChange={event => setForm({ ...form, nombre: event.target.value })} required /></label>
              <label>Apellidos<input className="input-field" value={form.apellido} onChange={event => setForm({ ...form, apellido: event.target.value })} /></label>
              <label className="full-field">Correo<input type="email" className="input-field" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} required /></label>
              <label>Rol<select className="input-field" value={form.role} onChange={event => setForm({ ...form, role: event.target.value })}><option value="COMPRADOR">Comprador</option><option value="VENDEDOR">Vendedor</option><option value="ADMIN">Administrador</option></select></label>
              <label>Estado<select className="input-field" value={form.activo ? 'true' : 'false'} onChange={event => setForm({ ...form, activo: event.target.value === 'true' })}><option value="true">Activo</option><option value="false">Inactivo</option></select></label>
              <label>Teléfono<input className="input-field" value={form.telefono} onChange={event => setForm({ ...form, telefono: event.target.value })} /></label>
              <label>Tipo de documento<select className="input-field" value={form.tipoDocumento} onChange={event => setForm({ ...form, tipoDocumento: event.target.value })}><option value="DNI">DNI</option><option value="RUC">RUC</option><option value="CE">Carné de extranjería</option><option value="PASAPORTE">Pasaporte</option></select></label>
              <label>Documento<input className="input-field" value={form.documento} onChange={event => setForm({ ...form, documento: event.target.value })} /></label>
              <label className="full-field">Dirección<div className="input-with-icon"><MapPinIcon /><input className="input-field" value={form.direccion} onChange={event => setForm({ ...form, direccion: event.target.value })} /></div></label>
            </div>
            <div className="modal-form-actions"><button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancelar</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
