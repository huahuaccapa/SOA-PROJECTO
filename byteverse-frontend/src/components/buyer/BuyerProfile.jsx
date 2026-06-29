// src/components/buyer/BuyerProfile.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { 
  UserIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  MapPinIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ShoppingBagIcon,
  ClipboardDocumentListIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const BuyerProfile = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    pendingOrders: 0
  });
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    documento: '',
    tipoDocumento: 'DNI',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        nombre: user.nombre || '',
        email: user.email || '',
        telefono: user.telefono || '',
        direccion: user.direccion || '',
        documento: user.documento || '',
        tipoDocumento: user.tipoDocumento || 'DNI',
        password: '',
        confirmPassword: ''
      });
    }
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      if (!user?.id) return;
      
      const response = await api.get(`/orders?userId=${user.id}`);
      const orders = response.data || [];
      
      setStats({
        totalOrders: orders.length,
        totalSpent: orders.reduce((acc, o) => acc + (o.total || 0), 0),
        pendingOrders: orders.filter(o => o.estado === 'PENDIENTE').length
      });
    } catch (error) {
      console.error('Error fetching buyer stats:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (formData.password && formData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      const updateData = {
        nombre: formData.nombre,
        telefono: formData.telefono,
        direccion: formData.direccion,
        documento: formData.documento,
        tipoDocumento: formData.tipoDocumento
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await api.put(`/users/${user.id}`, updateData);
      
      if (response.data.success) {
        toast.success('Perfil actualizado exitosamente');
        setEditing(false);
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
        
        const updatedUser = { ...user, ...updateData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.error || 'Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return `S/ ${value?.toFixed(2) || '0.00'}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header con gradiente */}
          <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-6 py-8 text-white">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-4xl font-bold">
                {user?.nombre?.charAt(0).toUpperCase() || 'C'}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{user?.nombre || 'Comprador'}</h1>
                <p className="text-primary-100">{user?.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-block px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm">
                    Comprador
                  </span>
                  <span className="inline-block px-3 py-1 bg-green-500 bg-opacity-30 rounded-full text-sm">
                    Activo
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 border-b">
            <div className="text-center bg-blue-50 rounded-xl p-4">
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <ClipboardDocumentListIcon className="w-5 h-5" />
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
              </div>
              <p className="text-sm text-gray-600">Pedidos Realizados</p>
            </div>
            <div className="text-center bg-green-50 rounded-xl p-4">
              <div className="flex items-center justify-center gap-2 text-green-600">
                <ShoppingBagIcon className="w-5 h-5" />
                <p className="text-2xl font-bold">{formatCurrency(stats.totalSpent)}</p>
              </div>
              <p className="text-sm text-gray-600">Total Gastado</p>
            </div>
            <div className="text-center bg-yellow-50 rounded-xl p-4">
              <div className="flex items-center justify-center gap-2 text-yellow-600">
                <ClockIcon className="w-5 h-5" />
                <p className="text-2xl font-bold">{stats.pendingOrders}</p>
              </div>
              <p className="text-sm text-gray-600">Pedidos Pendientes</p>
            </div>
          </div>

          {/* Formulario */}
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Información Personal</h2>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <PencilIcon className="w-4 h-4" />
                  Editar Perfil
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    disabled={!editing}
                    className={`input-field ${!editing && 'bg-gray-50'}`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="input-field bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">El correo no puede ser modificado</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    disabled={!editing}
                    className={`input-field ${!editing && 'bg-gray-50'}`}
                    placeholder="999 999 999"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleChange}
                    disabled={!editing}
                    className={`input-field ${!editing && 'bg-gray-50'}`}
                    placeholder="Calle, número, urbanización"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo Documento
                  </label>
                  <select
                    name="tipoDocumento"
                    value={formData.tipoDocumento}
                    onChange={handleChange}
                    disabled={!editing}
                    className={`input-field ${!editing && 'bg-gray-50'}`}
                  >
                    <option value="DNI">DNI</option>
                    <option value="RUC">RUC</option>
                    <option value="CE">CE</option>
                    <option value="PASAPORTE">Pasaporte</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Documento
                  </label>
                  <input
                    type="text"
                    name="documento"
                    value={formData.documento}
                    onChange={handleChange}
                    disabled={!editing}
                    className={`input-field ${!editing && 'bg-gray-50'}`}
                    placeholder="Número de documento"
                  />
                </div>

                {editing && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nueva Contraseña (opcional)
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="••••••••"
                        minLength="6"
                      />
                      <p className="text-xs text-gray-400 mt-1">Mínimo 6 caracteres</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirmar Contraseña
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="••••••••"
                      />
                    </div>
                  </>
                )}
              </div>

              {editing && (
                <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary flex-1 py-3 text-base flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckIcon className="w-5 h-5" />
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setFormData(prev => ({ 
                        ...prev, 
                        password: '', 
                        confirmPassword: '',
                        nombre: user?.nombre || '',
                        telefono: user?.telefono || '',
                        direccion: user?.direccion || '',
                        documento: user?.documento || '',
                        tipoDocumento: user?.tipoDocumento || 'DNI'
                      }));
                    }}
                    className="btn-secondary flex-1 py-3 text-base flex items-center justify-center gap-2"
                  >
                    <XMarkIcon className="w-5 h-5" />
                    Cancelar
                  </button>
                </div>
              )}
            </form>

            <div className="border-t border-gray-200 mt-6 pt-6 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                    logout();
                  }
                }}
                className="btn-danger flex items-center gap-2"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                Cerrar Sesión
              </button>
              <button
                onClick={fetchStats}
                className="btn-secondary flex items-center gap-2"
              >
                <RefreshIcon className="w-4 h-4" />
                Actualizar Estadísticas
              </button>
            </div>

            <div className="mt-6 bg-gray-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Información de la Cuenta</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                <div>
                  <span className="font-medium">ID:</span> {user?.id || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Rol:</span> {user?.role || 'Comprador'}
                </div>
                <div>
                  <span className="font-medium">Fecha registro:</span> {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES') : 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Estado:</span> {user?.activo !== false ? 'Activo' : 'Inactivo'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componentes auxiliares
const ClockIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const RefreshIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

export default BuyerProfile;