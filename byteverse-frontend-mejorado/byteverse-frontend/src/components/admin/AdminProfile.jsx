import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { 
  UserIcon, 
  EnvelopeIcon, 
  LockClosedIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const AdminProfile = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    password: '',
    confirmPassword: ''
  });
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVendors: 0,
    totalProducts: 0,
    totalOrders: 0
  });

  useEffect(() => {
    if (user) {
      setFormData({
        nombre: user.nombre || '',
        email: user.email || '',
        telefono: user.telefono || '',
        direccion: user.direccion || '',
        password: '',
        confirmPassword: ''
      });
    }
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      const [usersRes, vendorsRes, productsRes, ordersRes] = await Promise.all([
        api.get('/users').catch(() => ({ data: [] })),
        api.get('/users?role=VENDEDOR').catch(() => ({ data: [] })),
        api.get('/products').catch(() => ({ data: [] })),
        api.get('/orders').catch(() => ({ data: [] }))
      ]);

      setStats({
        totalUsers: usersRes.data?.length || 0,
        totalVendors: vendorsRes.data?.length || 0,
        totalProducts: productsRes.data?.length || 0,
        totalOrders: ordersRes.data?.length || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validaciones
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
        direccion: formData.direccion
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await api.put(`/users/${user.id}`, updateData);
      
      if (response.data.success) {
        toast.success('Perfil actualizado exitosamente');
        setEditing(false);
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
        
        // Actualizar usuario en localStorage
        const updatedUser = { ...user, ...updateData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Recargar página para actualizar context
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.error || 'Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Usuarios', value: stats.totalUsers, icon: UserIcon, color: 'from-purple-500 to-purple-600' },
    { label: 'Vendedores', value: stats.totalVendors, icon: UserIcon, color: 'from-blue-500 to-blue-600' },
    { label: 'Productos', value: stats.totalProducts, icon: UserIcon, color: 'from-green-500 to-green-600' },
    { label: 'Pedidos', value: stats.totalOrders, icon: UserIcon, color: 'from-yellow-500 to-yellow-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-6 py-8 text-white">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-4xl font-bold">
                {user?.nombre?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{user?.nombre || 'Administrador'}</h1>
                <p className="text-primary-100">{user?.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-block px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm">
                    Administrador
                  </span>
                  <span className="inline-block px-3 py-1 bg-green-500 bg-opacity-30 rounded-full text-sm">
                    Activo
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b">
            {statCards.map((stat, index) => (
              <div key={index} className={`bg-gradient-to-r ${stat.color} rounded-xl p-4 text-white`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <stat.icon className="w-8 h-8 opacity-50" />
                </div>
              </div>
            ))}
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
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    disabled={!editing}
                    className={`input-field ${!editing && 'bg-gray-50'}`}
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
                    placeholder="Calle, ciudad"
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
                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
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
                        direccion: user?.direccion || ''
                      }));
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </form>

            {/* Acciones adicionales */}
            <div className="border-t border-gray-200 mt-6 pt-6">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                      logout();
                    }
                  }}
                  className="btn-danger flex items-center gap-2"
                >
                  <XMarkIcon className="w-4 h-4" />
                  Cerrar Sesión
                </button>
                <button
                  onClick={fetchStats}
                  className="btn-secondary flex items-center gap-2"
                >
                  <CheckIcon className="w-4 h-4" />
                  Actualizar Estadísticas
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;