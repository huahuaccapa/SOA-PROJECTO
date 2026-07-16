import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowPathIcon,
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  CubeIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  IdentificationIcon,
  KeyIcon,
  LockClosedIcon,
  MapPinIcon,
  PencilSquareIcon,
  PhoneIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  TicketIcon,
  UserGroupIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { formatNumber } from '../../utils/formatters';
import { onlyDigits, validateCleanText, validateDocument } from '../../utils/validators';

const emptyProfile = {
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  direccion: '',
  documento: '',
  tipoDocumento: 'DNI',
  descripcion: '',
};

const AdminProfile = () => {
  const navigate = useNavigate();
  const { user, updateSessionUser, logout } = useAuth();
  const [profile, setProfile] = useState(emptyProfile);
  const [originalProfile, setOriginalProfile] = useState(emptyProfile);
  const [editing, setEditing] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [securitySaving, setSecuritySaving] = useState(false);
  const [stats, setStats] = useState({ users: 0, vendors: 0, products: 0, orders: 0 });
  const [security, setSecurity] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const initials = useMemo(() => {
    const fullName = `${profile.nombre || user?.nombre || ''} ${profile.apellido || user?.apellido || ''}`.trim();
    return fullName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'AD';
  }, [profile, user]);

  const registrationDate = useMemo(() => {
    const raw = user?.fechaRegistro || user?.createdAt;
    if (!raw) return 'Cuenta administrativa';
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? 'Cuenta administrativa' : `Desde ${date.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}`;
  }, [user]);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoadingProfile(true);
    try {
      const [profileResult, usersResult, vendorsResult, productsResult, ordersResult] = await Promise.all([
        api.get(`/users/${user.id}`, { skipGlobalError: true }),
        api.get('/users', { skipGlobalError: true }).catch(() => ({ data: [] })),
        api.get('/users?role=VENDEDOR', { skipGlobalError: true }).catch(() => ({ data: [] })),
        api.get('/products', { skipGlobalError: true }).catch(() => ({ data: [] })),
        api.get('/orders', { skipGlobalError: true }).catch(() => ({ data: [] })),
      ]);

      const current = profileResult.data?.user || profileResult.data || user;
      const normalized = {
        ...emptyProfile,
        nombre: current.nombre || '',
        apellido: current.apellido || '',
        email: current.email || '',
        telefono: current.telefono || '',
        direccion: current.direccion || '',
        documento: current.documento || '',
        tipoDocumento: current.tipoDocumento || 'DNI',
        descripcion: current.descripcion || '',
      };
      setProfile(normalized);
      setOriginalProfile(normalized);
      updateSessionUser(current);
      setStats({
        users: Array.isArray(usersResult.data) ? usersResult.data.length : 0,
        vendors: Array.isArray(vendorsResult.data) ? vendorsResult.data.length : 0,
        products: Array.isArray(productsResult.data) ? productsResult.data.length : 0,
        orders: Array.isArray(ordersResult.data) ? ordersResult.data.length : 0,
      });
    } catch (error) {
      const fallback = { ...emptyProfile, ...user };
      setProfile(fallback);
      setOriginalProfile(fallback);
      toast.error(error.response?.data?.error || 'No se pudo cargar el perfil administrativo');
    } finally {
      setLoadingProfile(false);
    }
  }, [user?.id, updateSessionUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfile(current => ({
      ...current,
      [name]: name === 'telefono' || name === 'documento' ? value.replace(/[^0-9A-Za-z+ -]/g, '') : value,
    }));
  };

  const cancelEditing = () => {
    setProfile(originalProfile);
    setEditing(false);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    const nameError = validateCleanText(profile.nombre, 'El nombre', 'name');
    const surnameError = profile.apellido ? validateCleanText(profile.apellido, 'El apellido', 'name') : '';
    const addressError = profile.direccion ? validateCleanText(profile.direccion, 'La dirección') : '';
    if (nameError || surnameError || addressError) {
      toast.error(nameError || surnameError || addressError);
      return;
    }
    if (profile.telefono && !/^9\d{8}$/.test(onlyDigits(profile.telefono))) {
      toast.error('El teléfono debe tener 9 dígitos y comenzar con 9');
      return;
    }
    const documentValue = ['DNI', 'RUC'].includes(profile.tipoDocumento)
      ? onlyDigits(profile.documento)
      : String(profile.documento || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const documentError = validateDocument(profile.tipoDocumento, documentValue);
    if (documentError) {
      toast.error(documentError);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nombre: profile.nombre.trim(),
        apellido: profile.apellido.trim(),
        telefono: onlyDigits(profile.telefono),
        direccion: profile.direccion.trim(),
        documento: documentValue,
        tipoDocumento: profile.tipoDocumento,
        descripcion: profile.descripcion.trim(),
      };
      const response = await api.put(`/users/${user.id}`, payload, { skipGlobalError: true });
      const updated = response.data?.user || response.data || { ...user, ...payload };
      const nextProfile = { ...profile, ...payload, email: updated.email || profile.email };
      setProfile(nextProfile);
      setOriginalProfile(nextProfile);
      updateSessionUser(updated);
      setEditing(false);
      toast.success('Perfil administrativo actualizado');
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const changeOwnPassword = async (event) => {
    event.preventDefault();
    if (security.newPassword.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (security.newPassword !== security.confirmPassword) {
      toast.error('Las nuevas contraseñas no coinciden');
      return;
    }
    if (user?.authProvider !== 'google' && !security.currentPassword) {
      toast.error('Ingresa tu contraseña actual');
      return;
    }

    setSecuritySaving(true);
    try {
      const response = await api.post('/auth/change-own-password', {
        currentPassword: security.currentPassword,
        newPassword: security.newPassword,
      }, { skipGlobalError: true });
      toast.success(response.data?.message || 'Contraseña actualizada');
      setSecurity({ currentPassword: '', newPassword: '', confirmPassword: '' });
      await logout({ silent: true });
      navigate('/login', { replace: true, state: { passwordChanged: true } });
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo cambiar la contraseña');
    } finally {
      setSecuritySaving(false);
    }
  };

  const statCards = [
    { label: 'Usuarios', value: stats.users, icon: UserGroupIcon, link: '/admin/users' },
    { label: 'Vendedores', value: stats.vendors, icon: BuildingStorefrontIcon, link: '/admin/vendors' },
    { label: 'Productos', value: stats.products, icon: CubeIcon, link: '/admin/products' },
    { label: 'Pedidos', value: stats.orders, icon: ShoppingBagIcon, link: '/admin/orders' },
  ];

  if (loadingProfile) {
    return <div className="role-loading-page"><ArrowPathIcon className="spin-icon empty-large-icon" /><strong>Cargando perfil administrativo</strong><p>Estamos sincronizando tu información y permisos.</p></div>;
  }

  return (
    <div className="commerce-dashboard-page admin-profile-page">
      <div className="commerce-shell admin-profile-shell">
        <section className="admin-profile-hero">
          <div className="admin-profile-avatar">
            {user?.avatar ? <img src={user.avatar} alt={profile.nombre} onError={(event) => { event.currentTarget.src = '/usuario.png'; }} /> : initials}
          </div>
          <div className="admin-profile-identity">
            <span className="commerce-eyebrow">Cuenta de administración</span>
            <h1>{`${profile.nombre} ${profile.apellido}`.trim() || 'Administrador ByteVerse'}</h1>
            <p><EnvelopeIcon /> {profile.email}</p>
            <div>
              <span><ShieldCheckIcon /> Administrador principal</span>
              <span><CheckBadgeIcon /> Cuenta activa</span>
              <span><CalendarDaysIcon /> {registrationDate}</span>
            </div>
          </div>
          <div className="admin-profile-trust-card">
            <ShieldCheckIcon />
            <div><strong>Control total del sistema</strong><p>Tu cuenta puede administrar usuarios, inventario, ventas, promociones y reportes.</p></div>
          </div>
        </section>

        <section className="admin-profile-stat-grid">
          {statCards.map(({ label, value, icon: Icon, link }) => (
            <Link key={label} to={link}>
              <span><Icon /></span>
              <div><small>{label}</small><strong>{formatNumber(value)}</strong></div>
              <b>Ver gestión →</b>
            </Link>
          ))}
        </section>

        <div className="admin-profile-layout">
          <section className="commerce-panel admin-profile-main-card">
            <div className="panel-title-row">
              <div><span className="commerce-eyebrow">Datos de la cuenta</span><h2>Perfil administrativo</h2><p>Mantén actualizada la información visible para la gestión interna.</p></div>
              {!editing ? (
                <button type="button" className="commerce-refresh-button" onClick={() => setEditing(true)}><PencilSquareIcon /> Editar perfil</button>
              ) : (
                <button type="button" className="commerce-refresh-button" onClick={cancelEditing}><XMarkIcon /> Cancelar</button>
              )}
            </div>

            <form className="admin-profile-form" onSubmit={saveProfile}>
              <label><span>Nombres</span><div className="field-with-icon"><UserIcon /><input name="nombre" value={profile.nombre} onChange={handleProfileChange} disabled={!editing} required /></div></label>
              <label><span>Apellidos</span><div className="field-with-icon"><UserIcon /><input name="apellido" value={profile.apellido} onChange={handleProfileChange} disabled={!editing} /></div></label>
              <label><span>Correo de acceso</span><div className="field-with-icon locked"><EnvelopeIcon /><input value={profile.email} disabled /></div><small>El correo permanece protegido para evitar perder el acceso.</small></label>
              <label><span>Rol asignado</span><div className="field-with-icon locked"><ShieldCheckIcon /><input value="ADMINISTRADOR" disabled /></div><small>El rol no se modifica desde el perfil personal.</small></label>
              <label><span>Teléfono</span><div className="field-with-icon"><PhoneIcon /><input name="telefono" inputMode="numeric" value={profile.telefono} onChange={handleProfileChange} disabled={!editing} placeholder="999999999" maxLength={15} /></div></label>
              <label><span>Documento</span><div className="admin-document-field"><select name="tipoDocumento" value={profile.tipoDocumento} onChange={handleProfileChange} disabled={!editing}><option value="DNI">DNI</option><option value="RUC">RUC</option><option value="CE">CE</option><option value="PASAPORTE">Pasaporte</option></select><div className="field-with-icon"><IdentificationIcon /><input name="documento" value={profile.documento} onChange={handleProfileChange} disabled={!editing} /></div></div></label>
              <label className="full-field"><span>Dirección</span><div className="field-with-icon"><MapPinIcon /><input name="direccion" value={profile.direccion} onChange={handleProfileChange} disabled={!editing} placeholder="Dirección administrativa" /></div></label>
              <label className="full-field"><span>Descripción del perfil</span><textarea name="descripcion" value={profile.descripcion} onChange={handleProfileChange} disabled={!editing} rows={4} placeholder="Responsabilidades o referencia interna del administrador" /></label>

              {editing && <div className="admin-profile-save-row"><button type="button" className="btn-secondary" onClick={cancelEditing}>Descartar</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? <><ArrowPathIcon className="spin-icon" /> Guardando...</> : <><CheckCircleIcon /> Guardar cambios</>}</button></div>}
            </form>
          </section>

          <aside className="admin-profile-sidebar">
            <section className="commerce-panel admin-security-card">
              <div className="panel-title-row"><div><span className="commerce-eyebrow">Seguridad</span><h2>Actualizar contraseña</h2><p>Al cambiarla se cerrará la sesión para proteger la cuenta.</p></div><LockClosedIcon /></div>
              <form onSubmit={changeOwnPassword}>
                {user?.authProvider !== 'google' && <label><span>Contraseña actual</span><div className="field-with-icon"><KeyIcon /><input type="password" value={security.currentPassword} onChange={(event) => setSecurity(current => ({ ...current, currentPassword: event.target.value }))} autoComplete="current-password" /></div></label>}
                {user?.authProvider === 'google' && <div className="admin-google-account-note"><CheckBadgeIcon /><span><strong>Cuenta vinculada con Google</strong><small>Puedes establecer una contraseña local adicional.</small></span></div>}
                <label><span>Nueva contraseña</span><div className="field-with-icon"><LockClosedIcon /><input type="password" value={security.newPassword} onChange={(event) => setSecurity(current => ({ ...current, newPassword: event.target.value }))} autoComplete="new-password" /></div></label>
                <label><span>Confirmar contraseña</span><div className="field-with-icon"><LockClosedIcon /><input type="password" value={security.confirmPassword} onChange={(event) => setSecurity(current => ({ ...current, confirmPassword: event.target.value }))} autoComplete="new-password" /></div></label>
                <button type="submit" className="btn-primary admin-security-submit" disabled={securitySaving}>{securitySaving ? 'Actualizando...' : 'Cambiar contraseña'}</button>
              </form>
            </section>

            <section className="commerce-panel admin-profile-access-card">
              <span className="commerce-eyebrow">Accesos rápidos</span><h2>Centro de control</h2>
              <Link to="/admin/users"><UserGroupIcon /><span><strong>Usuarios y permisos</strong><small>Administrar cuentas y roles</small></span></Link>
              <Link to="/admin/products"><CubeIcon /><span><strong>Catálogo e inventario</strong><small>Productos, precios y stock</small></span></Link>
              <Link to="/admin/orders"><DocumentTextIcon /><span><strong>Pedidos y comprobantes</strong><small>Supervisar ventas emitidas</small></span></Link>
              <Link to="/admin/coupons"><TicketIcon /><span><strong>Cupones y promociones</strong><small>Crear beneficios comerciales</small></span></Link>
            </section>

            <section className="commerce-panel admin-profile-session-card">
              <ClipboardDocumentCheckIcon /><div><strong>Sesión protegida</strong><p>Los cambios sensibles requieren una sesión administrativa válida.</p></div>
              <button type="button" onClick={loadData}><ArrowPathIcon /> Sincronizar datos</button>
              <button type="button" className="danger" onClick={async () => { await logout(); navigate('/login', { replace: true }); }}><XMarkIcon /> Cerrar sesión</button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
