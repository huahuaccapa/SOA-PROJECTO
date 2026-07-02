import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    icono: '',
    activo: true
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre.trim()) {
      toast.error('El nombre de la categoría es requerido');
      return;
    }

    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory._id}`, formData);
        toast.success('Categoría actualizada');
      } else {
        await api.post('/categories', formData);
        toast.success('Categoría creada');
      }
      fetchCategories();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(error.response?.data?.error || 'Error al guardar categoría');
    }
  };

  const resetForm = () => {
    setFormData({ nombre: '', descripcion: '', icono: '', activo: true });
    setEditingCategory(null);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      nombre: category.nombre || '',
      descripcion: category.descripcion || '',
      icono: category.icono || '',
      activo: category.activo !== undefined ? category.activo : true
    });
    setShowModal(true);
  };

  const handleDelete = async (categoryId) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return;
    try {
      await api.delete(`/categories/${categoryId}`);
      toast.success('Categoría eliminada');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Error al eliminar categoría');
    }
  };

  const iconOptions = [
    '💻', '📱', '📋', '🎧', '⌚', '🎮', '📷', '🖥️', 
    '🔊', '⌨️', '🖱️', '📡', '🔌', '💾', '📀', '🎯',
    '📺', '📹', '🎬', '📼', '☎️', '🖨️', '🔋', '💡'
  ];

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
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Categorías</h1>
            <p className="text-gray-600 mt-2">Administra las categorías de productos</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Nueva Categoría
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.map((category) => (
            <div key={category._id} className="card group">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{category.icono || '📂'}</span>
                    <div>
                      <h3 className="font-semibold text-lg">{category.nombre}</h3>
                      <p className="text-sm text-gray-500">{category.descripcion || 'Sin descripción'}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    category.activo 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {category.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleEdit(category)}
                    className="btn-secondary text-sm px-3 py-1 flex items-center gap-1"
                  >
                    <PencilIcon className="w-4 h-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(category._id)}
                    className="btn-danger text-sm px-3 py-1 flex items-center gap-1"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl shadow-xl">
            <p className="text-gray-500">No hay categorías creadas</p>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="btn-primary mt-4 inline-flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Crear primera categoría
            </button>
          </div>
        )}
      </div>

      {/* Modal de categoría */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="input-field"
                  placeholder="Ej: Laptops, Smartphones..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  className="input-field"
                  rows="2"
                  placeholder="Descripción de la categoría"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ícono</label>
                <div className="grid grid-cols-6 gap-2">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({...formData, icono: icon})}
                      className={`p-2 text-2xl rounded-lg border-2 transition-all ${
                        formData.icono === icon
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
                {formData.icono && (
                  <p className="text-sm text-gray-500 mt-1">Ícono seleccionado: {formData.icono}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Categoría activa</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editingCategory ? 'Actualizar' : 'Crear'}
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

export default AdminCategories;