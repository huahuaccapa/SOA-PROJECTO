// src/components/vendor/VendorProfile.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { UserIcon, EnvelopeIcon, PhoneIcon, MapPinIcon, DocumentTextIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const VendorProfile = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    documento: '',
    tipoDocumento: 'DNI',
    descripcion: '',
    categorias: [],
    comision: 10,
    password: '',
    confirmPassword: ''
  });
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0
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
        descripcion: user.descripcion || '',
        categorias: user.categorias || [],
        comision: user.comision || 10,
        password: '',
        confirmPassword: ''
      });
    }
    fetchStats();
  }, [user]);

  // ✅ ACTUALIZADO: vendorId → vendedorId
  const fetchStats = async () => {
    try {
      const [productsRes, ordersRes] = await Promise.all([
        api.get(`/products?vendedorId=${user.id}`),
        api.get(`/orders?vendedorId=${user.id}`)
      ]);

      const products = productsRes.data || [];
      const orders = ordersRes.data || [];

      setStats({
        totalProducts: products.length,
        totalOrders: orders.length,
        totalRevenue: orders.reduce((acc, o) => acc + (o.total || 0), 0)
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
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

    try {
      const updateData = {
        nombre: formData.nombre,
        telefono: formData.telefono,
        direccion: formData.direccion,
        documento: formData.documento,
        tipoDocumento: formData.tipoDocumento,
        descripcion: formData.descripcion,
        categorias: formData.categorias,
        comision: formData.comision
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      await api.put(`/users/${user.id}`, updateData);
      toast.success('Perfil actualizado exitosamente');
      setEditing(false);
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      
      const updatedUser = { ...user, ...updateData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      window.location.reload();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-4xl font-bold">
                {user?.nombre?.charAt(0).toUpperCase() || 'V'}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{user?.nombre || 'Vendedor'}</h1>
                <p className="text-blue-100">{user?.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-block px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm">Vendedor</span>
                  <span className="inline-block px-3 py-1 bg-green-500 bg-opacity-30 rounded-full text-sm">Activo</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 p-6 border-b">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600">{stats.totalProducts}</p>
              <p className="text-sm text-gray-500">Productos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600">{stats.totalOrders}</p>
              <p className="text-sm text-gray-500">Pedidos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600">S/ {stats.totalRevenue.toFixed(2)}</p>
              <p className="text-sm text-gray-500">Ingresos</p>
            </div>
          </div>

          {/* Formulario */}
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Información Personal</h2>
              {!editing && (
                <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2">
                  <PencilIcon className="w-4 h-4" />
                  Editar Perfil
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                  <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} disabled={!editing} className={`input-field ${!editing && 'bg-gray-50'}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                  <input type="email" value={formData.email} disabled className="input-field bg-gray-50 text-gray-500" />
                  <p className="text-xs text-gray-400 mt-1">El correo no puede ser modificado</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} disabled={!editing} className={`input-field ${!editing && 'bg-gray-50'}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} disabled={!editing} className={`input-field ${!editing && 'bg-gray-50'}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Documento</label>
                  <select name="tipoDocumento" value={formData.tipoDocumento} onChange={handleChange} disabled={!editing} className={`input-field ${!editing && 'bg-gray-50'}`}>
                    <option value="DNI">DNI</option>
                    <option value="RUC">RUC</option>
                    <option value="CE">CE</option>
                    <option value="PASAPORTE">Pasaporte</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de Documento</label>
                  <input type="text" name="documento" value={formData.documento} onChange={handleChange} disabled={!editing} className={`input-field ${!editing && 'bg-gray-50'}`} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea name="descripcion" value={formData.descripcion} onChange={handleChange} disabled={!editing} className={`input-field ${!editing && 'bg-gray-50'}`} rows="3" placeholder="Describe tu negocio..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comisión (%)</label>
                  <input type="number" name="comision" value={formData.comision} onChange={handleChange} disabled={!editing} className={`input-field ${!editing && 'bg-gray-50'}`} />
                  <p className="text-xs text-gray-400 mt-1">Comisión por venta (configurada por admin)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categorías</label>
                  <input type="text" value={formData.categorias.join(', ') || 'Sin categorías'} disabled className="input-field bg-gray-50" />
                  <p className="text-xs text-gray-400 mt-1">Categorías asignadas por el admin</p>
                </div>

                {editing && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña (opcional)</label>
                      <input type="password" name="password" value={formData.password} onChange={handleChange} className="input-field" placeholder="••••••••" minLength="6" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
                      <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="input-field" placeholder="••••••••" />
                    </div>
                  </>
                )}
              </div>

              {editing && (
                <div className="flex gap-3 mt-6">
                  <button type="submit" disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                  <button type="button" onClick={() => { setEditing(false); setFormData(prev => ({ ...prev, password: '', confirmPassword: '' })); }} className="btn-secondary flex-1">
                    Cancelar
                  </button>
                </div>
              )}
            </form>

            <div className="border-t border-gray-200 mt-6 pt-6">
              <button onClick={() => { if (confirm('¿Estás seguro de que quieres cerrar sesión?')) logout(); }} className="btn-danger flex items-center gap-2">
                <XMarkIcon className="w-4 h-4" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorProfile;