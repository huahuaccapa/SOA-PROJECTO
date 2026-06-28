import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { 
  PencilIcon, 
  TrashIcon, 
  PlusIcon, 
  EyeIcon,
  XMarkIcon,
  CheckIcon,
  ShoppingBagIcon,
  UserIcon,
  TagIcon,
  CubeIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import ImageUpload from '../common/ImageUpload';
import toast from 'react-hot-toast';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '',
    categoria: '',
    imagen: '',
    vendedorId: '',
    vendedorNombre: '',
    deliveryGratis: false,
    tieneIGV: true
  });
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchVendors();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/products');
      setProducts(response.data);
      console.log('✅ Productos cargados:', response.data.length);
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

  const fetchVendors = async () => {
    try {
      const response = await api.get('/users?role=VENDEDOR');
      setVendors(response.data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
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
        imagen: imageUrl
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
      vendedorId: '',
      vendedorNombre: '',
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
      vendedorId: product.vendedorId || '',
      vendedorNombre: product.vendedorNombre || '',
      deliveryGratis: product.deliveryGratis || false,
      tieneIGV: product.tieneIGV !== undefined ? product.tieneIGV : true
    });
    setImageFile(null);
    setShowModal(true);
  };

  const handleDelete = async (productId) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    try {
      await api.delete(`/products/${productId}`);
      toast.success('Producto eliminado');
      fetchProducts();
    } catch (error) {
      console.error('❌ Error deleting product:', error);
      toast.error('Error al eliminar producto');
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestión de Productos</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Administra todos los productos del sistema</p>
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
                {/* Botón ver detalle en hover */}
                <button
                  onClick={() => handleViewDetail(product)}
                  className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100"
                >
                  <div className="bg-white rounded-full p-3 shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
                    <EyeIcon className="w-6 h-6 text-primary-600" />
                  </div>
                </button>
                {product.stock === 0 && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">Agotado</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 
                  className="font-semibold text-lg mb-1 cursor-pointer hover:text-primary-600 transition-colors"
                  onClick={() => handleViewDetail(product)}
                >
                  {product.nombre}
                </h3>
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
                    onClick={() => handleDelete(product._id)}
                    className="btn-danger text-sm px-3 py-1 flex items-center gap-1 flex-1 sm:flex-none justify-center"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Eliminar
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
            <p className="text-gray-500">No hay productos creados</p>
          </div>
        )}
      </div>

      {/* ===== MODAL DE DETALLE MEJORADO ===== */}
      {showDetailModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            {/* Header con gradiente */}
            <div className="bg-gradient-to-r from-primary-600 to-secondary-600 p-6 text-white rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{selectedProduct.nombre}</h2>
                  <p className="text-primary-100 text-sm">ID: {selectedProduct._id?.slice(0, 8)}</p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Imagen */}
                <div className="bg-gray-100 rounded-xl overflow-hidden">
                  <img
                    src={selectedProduct.imagen || 'https://via.placeholder.com/400x300?text=Producto'}
                    alt={selectedProduct.nombre}
                    className="w-full h-64 object-cover"
                  />
                </div>

                {/* Información */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <TagIcon className="w-5 h-5 text-primary-600" />
                    <span className="font-medium">{selectedProduct.categoria || 'Sin categoría'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                    <span className="text-2xl font-bold text-primary-600">
                      S/ {selectedProduct.precio?.toFixed(2)}
                    </span>
                    {selectedProduct.tieneIGV && (
                      <span className="text-xs text-gray-500">+IGV</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <CubeIcon className="w-5 h-5 text-blue-600" />
                    <span className={selectedProduct.stock > 0 ? 'text-green-600' : 'text-red-600'}>
                      {selectedProduct.stock > 0 ? `Stock: ${selectedProduct.stock}` : 'Sin Stock'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-purple-600" />
                    <span>Vendedor: {selectedProduct.vendedorNombre || 'ByteVerse Store'}</span>
                  </div>

                  {selectedProduct.deliveryGratis && (
                    <div className="flex items-center gap-2 bg-green-50 p-2 rounded-lg">
                      <CheckIcon className="w-5 h-5 text-green-600" />
                      <span className="text-green-700 font-medium">🚚 Envío gratis</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm ${selectedProduct.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {selectedProduct.stock > 0 ? 'Disponible' : 'Agotado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <div className="mt-6 border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-2">Descripción</h3>
                <p className="text-gray-600">{selectedProduct.descripcion || 'Sin descripción'}</p>
              </div>

              {/* Acciones */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleEdit(selectedProduct);
                  }}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <PencilIcon className="w-5 h-5" />
                  Editar Producto
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DE CREAR/EDITAR MEJORADO ===== */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            {/* Header con gradiente */}
            <div className="bg-gradient-to-r from-primary-600 to-secondary-600 p-6 text-white rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">
                    {editingProduct ? '✏️ Editar Producto' : '✨ Nuevo Producto'}
                  </h2>
                  <p className="text-primary-100 text-sm mt-1">
                    {editingProduct ? 'Actualiza los datos del producto' : 'Completa los datos para crear un nuevo producto'}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Producto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="input-field"
                  placeholder="Ej: MacBook Pro 14"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  className="input-field"
                  rows="3"
                  placeholder="Describe las características del producto..."
                />
              </div>

              {/* Precio y Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio (S/) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.precio}
                    onChange={(e) => setFormData({...formData, precio: e.target.value})}
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    className="input-field"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                  className="input-field"
                >
                  <option value="">Seleccionar categoría</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat.nombre}>
                      {cat.icono} {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* ✅ ELIMINADO: Vendedor */}

              {/* Imagen */}
              <div>
                <ImageUpload
                  value={imageFile}
                  onChange={handleImageChange}
                  label="Imagen del Producto"
                  maxSize={10}
                  currentImage={editingProduct?.imagen || ''}
                />
              </div>

              {/* Opciones */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.deliveryGratis}
                    onChange={(e) => setFormData({...formData, deliveryGratis: e.target.checked})}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">🚚 Envío gratis</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.tieneIGV}
                    onChange={(e) => setFormData({...formData, tieneIGV: e.target.checked})}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Incluye IGV (18%)</span>
                </label>
              </div>

              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <button 
                  type="submit" 
                  className="btn-primary flex-1 py-3 text-base flex items-center justify-center gap-2"
                >
                  <CheckIcon className="w-5 h-5" />
                  {editingProduct ? 'Actualizar Producto' : 'Crear Producto'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1 py-3 text-base"
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

export default AdminProducts;