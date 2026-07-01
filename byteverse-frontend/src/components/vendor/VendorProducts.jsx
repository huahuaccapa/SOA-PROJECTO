// src/components/vendor/VendorProducts.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { 
  PlusIcon, 
  PencilIcon, 
  EyeIcon,
  XMarkIcon,
  CheckIcon,
  ShoppingBagIcon,
  TagIcon,
  CubeIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import ImageUpload from '../common/ImageUpload';
import toast from 'react-hot-toast';

const VendorProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '',
    categoria: '',
    imagen: '',
    deliveryGratis: false,
    tieneIGV: true
  });
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // ✅ ACTUALIZADO: vendorId → vendedorId
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/products?vendedorId=${user.id}`);
      setProducts(response.data);
      console.log('✅ Productos del vendedor:', response.data.length);
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleImageChange = (file) => {
    setImageFile(file);
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, imagen: previewUrl }));
    } else {
      setFormData(prev => ({ ...prev, imagen: '' }));
    }
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const response = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error al subir la imagen');
      return null;
    }
  };

  // ✅ ACTUALIZADO: Crear o actualizar producto
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    if (formData.precio <= 0) {
      toast.error('El precio debe ser mayor a 0');
      return;
    }
    if (formData.stock < 0) {
      toast.error('El stock no puede ser negativo');
      return;
    }

    try {
      let imageUrl = formData.imagen;
      
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const productData = {
        ...formData,
        precio: parseFloat(formData.precio),
        stock: parseInt(formData.stock),
        imagen: imageUrl,
        vendedorId: user.id,
        vendedorNombre: user.nombre
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, productData);
        toast.success('Producto actualizado');
      } else {
        await api.post('/products', productData);
        toast.success('Producto creado');
      }

      fetchProducts();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('❌ Error saving product:', error);
      toast.error(error.response?.data?.error || 'Error al guardar producto');
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      precio: '',
      stock: '',
      categoria: '',
      imagen: '',
      deliveryGratis: false,
      tieneIGV: true
    });
    setImageFile(null);
    setEditingProduct(null);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      nombre: product.nombre || '',
      descripcion: product.descripcion || '',
      precio: product.precio || '',
      stock: product.stock || '',
      categoria: product.categoria || '',
      imagen: product.imagen || '',
      deliveryGratis: product.deliveryGratis || false,
      tieneIGV: product.tieneIGV !== undefined ? product.tieneIGV : true
    });
    setImageFile(null);
    setShowModal(true);
  };

  const handleToggleActive = async (product) => {
    try {
      const newStatus = !product.activo;
      await api.put(`/products/${product._id}`, { 
        ...product, 
        activo: newStatus 
      });
      toast.success(`Producto ${newStatus ? 'activado' : 'desactivado'}`);
      fetchProducts();
    } catch (error) {
      console.error('❌ Error toggling product:', error);
      toast.error('Error al cambiar estado');
    }
  };

  const handleViewDetail = (product) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
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
      <div className="container-fluid">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Mis Productos</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Gestiona tu catálogo de productos</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <PlusIcon className="w-5 h-5" />
            Nuevo Producto
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {products.map((product) => (
            <div key={product._id} className="card group">
              <div className="relative">
                <img
                  src={product.imagen || 'https://via.placeholder.com/300x200?text=Producto'}
                  alt={product.nombre}
                  className="w-full h-40 sm:h-48 object-cover cursor-pointer"
                  onClick={() => handleViewDetail(product)}
                />
                <div className="absolute top-2 right-2 bg-primary-600 text-white px-2 py-1 rounded-lg text-xs font-semibold">
                  {product.categoria || 'General'}
                </div>
                {product.stock === 0 && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">Agotado</span>
                  </div>
                )}
                {!product.activo && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">Inactivo</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-1">{product.nombre}</h3>
                <p className="text-gray-600 text-sm mb-2 line-clamp-2">{product.descripcion}</p>
                <p className="text-2xl font-bold text-primary-600">S/ {product.precio?.toFixed(2)}</p>
                <p className="text-sm text-gray-500">Stock: {product.stock} unidades</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="btn-secondary text-sm px-3 py-1 flex items-center gap-1 flex-1 sm:flex-none justify-center"
                  >
                    <PencilIcon className="w-4 h-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggleActive(product)}
                    className={`text-sm px-3 py-1 flex items-center gap-1 flex-1 sm:flex-none justify-center rounded-lg ${
                      product.activo 
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {product.activo ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => handleViewDetail(product)}
                    className="btn-outline text-sm px-3 py-1 flex items-center gap-1 flex-1 sm:flex-none justify-center"
                  >
                    <EyeIcon className="w-4 h-4" />
                    Ver
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl shadow-xl">
            <ShoppingBagIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No tienes productos creados</p>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="btn-primary mt-4 inline-flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Crear tu primer producto
            </button>
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      {showDetailModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-primary-600 to-secondary-600 p-6 text-white rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{selectedProduct.nombre}</h2>
                  <p className="text-primary-100 text-sm">ID: {selectedProduct._id?.slice(0, 8)}</p>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-100 rounded-xl overflow-hidden">
                  <img src={selectedProduct.imagen || 'https://via.placeholder.com/400x300?text=Producto'} alt={selectedProduct.nombre} className="w-full h-64 object-cover" />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <TagIcon className="w-5 h-5 text-primary-600" />
                    <span className="font-medium">{selectedProduct.categoria || 'Sin categoría'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                    <span className="text-2xl font-bold text-primary-600">S/ {selectedProduct.precio?.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CubeIcon className="w-5 h-5 text-blue-600" />
                    <span className={selectedProduct.stock > 0 ? 'text-green-600' : 'text-red-600'}>
                      {selectedProduct.stock > 0 ? `Stock: ${selectedProduct.stock}` : 'Sin Stock'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm ${selectedProduct.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {selectedProduct.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  {selectedProduct.deliveryGratis && (
                    <div className="flex items-center gap-2 bg-green-50 p-2 rounded-lg">
                      <CheckIcon className="w-5 h-5 text-green-600" />
                      <span className="text-green-700 font-medium">🚚 Envío gratis</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-2">Descripción</h3>
                <p className="text-gray-600">{selectedProduct.descripcion || 'Sin descripción'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de crear/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-primary-600 to-secondary-600 p-6 text-white rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{editingProduct ? '✏️ Editar Producto' : '✨ Nuevo Producto'}</h2>
                  <p className="text-primary-100 text-sm mt-1">
                    {editingProduct ? 'Actualiza los datos de tu producto' : 'Completa los datos para crear un nuevo producto'}
                  </p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Producto <span className="text-red-500">*</span></label>
                <input type="text" required value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} className="input-field" placeholder="Ej: MacBook Pro 14" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} className="input-field" rows="3" placeholder="Describe las características del producto..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio (S/) <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01" required value={formData.precio} onChange={(e) => setFormData({...formData, precio: e.target.value})} className="input-field" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock <span className="text-red-500">*</span></label>
                  <input type="number" required value={formData.stock} onChange={(e) => setFormData({...formData, stock: e.target.value})} className="input-field" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select value={formData.categoria} onChange={(e) => setFormData({...formData, categoria: e.target.value})} className="input-field">
                  <option value="">Seleccionar categoría</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat.nombre}>{cat.icono} {cat.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <ImageUpload value={imageFile} onChange={handleImageChange} label="Imagen del Producto" maxSize={10} currentImage={editingProduct?.imagen || ''} />
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.deliveryGratis} onChange={(e) => setFormData({...formData, deliveryGratis: e.target.checked})} className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                  <span className="text-sm font-medium text-gray-700">🚚 Envío gratis</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.tieneIGV} onChange={(e) => setFormData({...formData, tieneIGV: e.target.checked})} className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                  <span className="text-sm font-medium text-gray-700">Incluye IGV (18%)</span>
                </label>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <button type="submit" className="btn-primary flex-1 py-3 text-base flex items-center justify-center gap-2">
                  <CheckIcon className="w-5 h-5" />
                  {editingProduct ? 'Actualizar Producto' : 'Crear Producto'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 py-3 text-base">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorProducts;