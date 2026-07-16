import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { 
  UserPlusIcon, 
  PencilIcon, 
  TrashIcon, 
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { asArray } from '../../utils/formatters';
import { validateCleanText, validateDocument, validatePassword, validatePhoneByCountry } from '../../utils/validators';
import { getDepartments, getDistricts, getProvinces, loadUbigeos } from '../../utils/ubigeo';

const AdminVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    confirmPassword: '',
    telefono: '',
    direccion: '',
    documento: '',
    tipoDocumento: 'DNI',
    descripcion: '',
    comision: 10,
    activo: true,
    paisTelefono: 'PE',
    departamento: '',
    provincia: '',
    distrito: ''
  });
  const [ubigeos, setUbigeos] = useState([]);

  useEffect(() => {
    fetchVendors();
    loadUbigeos().then(setUbigeos).catch(() => console.warn('No se pudo cargar la API de ubigeo'));
  }, []);

  const departments = getDepartments(ubigeos);
  const provinces = getProvinces(ubigeos, formData.departamento);
  const districts = getDistricts(ubigeos, formData.departamento, formData.provincia);
  const getId = (item) => item?.id || item?._id;

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users?role=VENDEDOR');
      setVendors(asArray(response.data, ['users', 'data', 'vendors']).filter(user => user.role === 'VENDEDOR'));
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast.error('Error al cargar vendedores');
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones
    if (!editingVendor && formData.password !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (!editingVendor) {
      const passwordError = validatePassword(formData.password);
      if (passwordError) { toast.error(passwordError); return; }
    }

    if (!formData.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    if (!formData.email.trim()) {
      toast.error('El email es requerido');
      return;
    }

    const nameError = validateCleanText(formData.nombre, 'El nombre', 'name');
    if (nameError) { toast.error(nameError); return; }
    const lastNameError = formData.apellido ? validateCleanText(formData.apellido, 'El apellido', 'name') : '';
    if (lastNameError) { toast.error(lastNameError); return; }
    const docError = validateDocument(formData.tipoDocumento, formData.documento);
    if (docError) { toast.error(docError); return; }
    const phoneError = validatePhoneByCountry(formData.telefono, formData.paisTelefono);
    if (phoneError) { toast.error(phoneError); return; }
    const addressError = formData.direccion ? validateCleanText(formData.direccion, 'La dirección') : '';
    if (addressError) { toast.error(addressError); return; }

    try {
      const vendorData = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        telefono: formData.telefono,
        direccion: formData.direccion,
        documento: formData.documento,
        tipoDocumento: formData.tipoDocumento,
        descripcion: formData.descripcion,
        comision: formData.comision,
        activo: formData.activo,
        paisTelefono: formData.paisTelefono,
        departamento: formData.departamento,
        provincia: formData.provincia,
        distrito: formData.distrito,
        role: 'VENDEDOR',
        needPasswordChange: !editingVendor,
        ...(!editingVendor || formData.password ? { password: formData.password } : {}),
      };

      if (editingVendor) {
        await api.put(`/users/${getId(editingVendor)}`, vendorData);
        toast.success('Vendedor actualizado');
      } else {
        await api.post('/auth/register', vendorData);
        toast.success('Vendedor creado. Por seguridad deberá cambiar su contraseña al ingresar.');
      }
      
      fetchVendors();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving vendor:', error);
      toast.error(error.response?.data?.error || 'Error al guardar vendedor');
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      apellido: '',
      email: '',
      password: '',
      confirmPassword: '',
      telefono: '',
      direccion: '',
      documento: '',
      tipoDocumento: 'DNI',
      descripcion: '',
      comision: 10,
      activo: true,
      paisTelefono: 'PE',
      departamento: '',
      provincia: '',
      distrito: ''
    });
    setEditingVendor(null);
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      nombre: vendor.nombre || '',
      apellido: vendor.apellido || '',
      email: vendor.email || '',
      password: '',
      confirmPassword: '',
      telefono: vendor.telefono || '',
      direccion: vendor.direccion || '',
      documento: vendor.documento || '',
      tipoDocumento: vendor.tipoDocumento || 'DNI',
      descripcion: vendor.descripcion || '',
      comision: vendor.comision || 10,
      activo: vendor.activo !== undefined ? vendor.activo : true,
      paisTelefono: vendor.paisTelefono || 'PE',
      departamento: vendor.departamento || '',
      provincia: vendor.provincia || '',
      distrito: vendor.distrito || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (vendorId) => {
    if (!confirm('¿Estás seguro de eliminar este vendedor?')) return;
    try {
      await api.delete(`/users/${vendorId}`);
      toast.success('Vendedor eliminado');
      fetchVendors();
    } catch (error) {
      console.error('Error deleting vendor:', error);
      toast.error('Error al eliminar vendedor');
    }
  };

  const handleToggleActive = async (vendor) => {
    try {
      await api.put(`/users/${getId(vendor)}`, { activo: !vendor.activo });
      toast.success(`Vendedor ${vendor.activo ? 'desactivado' : 'activado'}`);
      fetchVendors();
    } catch (error) {
      console.error('Error toggling vendor:', error);
      toast.error('Error al cambiar estado');
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Vendedores</h1>
            <p className="text-gray-600 mt-2">Crea y administra los vendedores de la plataforma</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <UserPlusIcon className="w-5 h-5" />
            Nuevo Vendedor
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vendors.map((vendor) => (
                  <tr key={getId(vendor)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {vendor.nombre?.charAt(0).toUpperCase() || 'V'}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{`${vendor.nombre || ''} ${vendor.apellido || ''}`.trim()}</p>
                          <p className="text-xs text-gray-500">{vendor.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">{vendor.telefono || 'No registrado'}</p>
                      <p className="text-xs text-gray-500">{vendor.direccion || 'Sin dirección'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium">{vendor.documento || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{vendor.tipoDocumento}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        vendor.activo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {vendor.activo ? 'Activo' : 'Inactivo'}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">Comisión: {vendor.comision || 10}%</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleActive(vendor)}
                          className={`p-1 rounded ${
                            vendor.activo 
                              ? 'text-red-600 hover:bg-red-50' 
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={vendor.activo ? 'Desactivar' : 'Activar'}
                        >
                          {vendor.activo ? <XMarkIcon className="w-5 h-5" /> : <CheckIcon className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => handleEdit(vendor)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(getId(vendor))}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Eliminar"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {vendors.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl shadow-xl mt-4">
            <p className="text-gray-500">No hay vendedores registrados</p>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="btn-primary mt-4 inline-flex items-center gap-2"
            >
              <UserPlusIcon className="w-5 h-5" />
              Crear primer vendedor
            </button>
          </div>
        )}
      </div>

      {/* Modal para crear/editar vendedor */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">
                {editingVendor ? 'Editar Vendedor' : 'Crear Vendedor'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Datos Personales */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombres *</label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value.replace(/[^a-zA-ZÀ-ÿ' -]/g, '')})}
                    className="input-field"
                    placeholder="Nombres"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                  <input
                    type="text"
                    value={formData.apellido}
                    onChange={(e) => setFormData({...formData, apellido: e.target.value.replace(/[^a-zA-ZÀ-ÿ' -]/g, '')})}
                    className="input-field"
                    placeholder="Apellidos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="input-field"
                    placeholder="vendedor@email.com"
                  />
                </div>
              </div>

              {/* Contraseña (solo si es nuevo o se quiere cambiar) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {editingVendor ? 'Nueva Contraseña (opcional)' : 'Contraseña *'}
                  </label>
                  <input
                    type="password"
                    required={!editingVendor}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="input-field"
                    placeholder={editingVendor ? 'Dejar vacío para mantener' : 'Mínimo 6 caracteres'}
                    minLength={6}
                  />
                </div>
                {!editingVendor && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña *</label>
                    <input
                      type="password"
                      required={!editingVendor}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                      className="input-field"
                      placeholder="Confirma la contraseña"
                    />
                  </div>
                )}
              </div>

              {/* Contacto */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
                  <select value={formData.paisTelefono} onChange={(e) => setFormData({...formData, paisTelefono: e.target.value})} className="input-field">
                    <option value="PE">Perú</option>
                    <option value="CO">Colombia</option>
                    <option value="MX">México</option>
                    <option value="CL">Chile</option>
                    <option value="AR">Argentina</option>
                    <option value="US">EE. UU.</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input type="text" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value.replace(/[^0-9+() -]/g, '')})} className="input-field" placeholder="999 999 999" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <input type="text" value={formData.direccion} onChange={(e) => setFormData({...formData, direccion: e.target.value})} className="input-field" placeholder="Calle, número" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label><select value={formData.departamento} onChange={(e) => setFormData({...formData, departamento: e.target.value, provincia: '', distrito: ''})} className="input-field"><option value="">Seleccione</option>{departments.map((dep) => <option key={dep} value={dep}>{dep}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label><select value={formData.provincia} onChange={(e) => setFormData({...formData, provincia: e.target.value, distrito: ''})} className="input-field" disabled={!formData.departamento}><option value="">Seleccione</option>{provinces.map((prov) => <option key={prov} value={prov}>{prov}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Distrito</label><select value={formData.distrito} onChange={(e) => setFormData({...formData, distrito: e.target.value})} className="input-field" disabled={!formData.provincia}><option value="">Seleccione</option>{districts.map((dist) => <option key={dist} value={dist}>{dist}</option>)}</select></div>
              </div>

              {/* Documento */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Documento</label>
                  <select
                    value={formData.tipoDocumento}
                    onChange={(e) => setFormData({...formData, tipoDocumento: e.target.value})}
                    className="input-field"
                  >
                    <option value="DNI">DNI</option>
                    <option value="RUC">RUC</option>
                    <option value="CE">CE</option>
                    <option value="PASAPORTE">Pasaporte</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de Documento</label>
                  <input
                    type="text"
                    value={formData.documento}
                    onChange={(e) => setFormData({...formData, documento: e.target.value})}
                    className="input-field"
                    placeholder="Número de documento"
                  />
                </div>
              </div>

              {/* Descripción y Comisión */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                    className="input-field"
                    rows="3"
                    placeholder="Descripción del vendedor..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comisión (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.comision}
                    onChange={(e) => setFormData({...formData, comision: parseFloat(e.target.value)})}
                    className="input-field"
                  />
                  <p className="text-xs text-gray-500 mt-1">Porcentaje de comisión por venta</p>
                </div>
              </div>

              {/* Estado Activo */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Vendedor activo</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editingVendor ? 'Actualizar Vendedor' : 'Crear Vendedor'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVendors;