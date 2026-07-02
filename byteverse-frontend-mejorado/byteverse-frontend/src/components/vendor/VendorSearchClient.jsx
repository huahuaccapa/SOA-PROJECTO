// src/components/vendor/VendorSearchClient.jsx
import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { 
  MagnifyingGlassIcon, 
  UserIcon, 
  ClipboardDocumentListIcon, 
  ClockIcon, 
  CurrencyDollarIcon,
  UserGroupIcon,
  XMarkIcon,
  CheckIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const VendorSearchClient = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [orders, setOrders] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [showClientList, setShowClientList] = useState(false);

  // ✅ Cargar todos los compradores al montar el componente
  useEffect(() => {
    fetchAllBuyers();
  }, []);

  // ✅ Obtener todos los compradores registrados
  const fetchAllBuyers = async () => {
    try {
      setLoadingClients(true);
      const response = await api.get('/users?role=COMPRADOR');
      const buyers = response.data || [];
      setClients(buyers);
      setFilteredClients(buyers);
      console.log('✅ Compradores cargados:', buyers.length);
    } catch (error) {
      console.error('❌ Error fetching buyers:', error);
      toast.error('Error al cargar lista de compradores');
    } finally {
      setLoadingClients(false);
    }
  };

  // ✅ Filtrar clientes en tiempo real (nombre, email, DNI)
  const handleSearch = (term) => {
    setSearchTerm(term);
    const filtered = clients.filter(client => {
      const searchLower = term.toLowerCase().trim();
      return (
        client.nombre?.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower) ||
        client.documento?.toLowerCase().includes(searchLower) ||
        client.telefono?.toLowerCase().includes(searchLower)
      );
    });
    setFilteredClients(filtered);
    setShowClientList(true);
  };

  // ✅ Seleccionar un cliente
  const selectClient = async (client) => {
    setSelectedClient(client);
    setShowClientList(false);
    setSearchTerm(client.nombre);
    toast.success(`Cliente seleccionado: ${client.nombre}`);
    
    // Cargar historial y recomendaciones
    await loadClientHistory(client.id || client._id);
  };

  // ✅ Cargar historial de compras del cliente
  const loadClientHistory = async (clientId) => {
    try {
      setLoading(true);
      
      // Obtener pedidos del cliente
      const ordersRes = await api.get(`/orders?userId=${clientId}`);
      const clientOrders = ordersRes.data || [];
      setOrders(clientOrders);
      
      // Generar recomendaciones
      if (clientOrders.length > 0) {
        // Obtener categorías de productos comprados
        const categories = clientOrders.flatMap(o => 
          (o.productos || []).map(p => p.categoria || p.categoriaId)
        ).filter(Boolean);
        
        // Obtener IDs de productos ya comprados
        const purchasedProductIds = clientOrders.flatMap(o => 
          (o.productos || []).map(p => p.productoId)
        ).filter(Boolean);
        
        // Buscar productos similares no comprados
        const productsRes = await api.get('/products');
        const allProducts = productsRes.data || [];
        
        const recommended = allProducts
          .filter(p => {
            // Misma categoría y no comprado
            return categories.includes(p.categoria) && 
                   !purchasedProductIds.includes(p._id) &&
                   p.stock > 0 &&
                   p.activo !== false;
          })
          .slice(0, 5);
        
        setRecommendations(recommended);
      } else {
        setRecommendations([]);
        // Si no tiene compras, recomendar productos populares
        const productsRes = await api.get('/products');
        const allProducts = productsRes.data || [];
        const popular = allProducts
          .filter(p => p.stock > 0 && p.activo !== false)
          .slice(0, 5);
        setRecommendations(popular);
      }
      
    } catch (error) {
      console.error('❌ Error loading client history:', error);
      toast.error('Error al cargar historial del cliente');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Limpiar selección
  const clearSelection = () => {
    setSelectedClient(null);
    setOrders([]);
    setRecommendations([]);
    setSearchTerm('');
    setShowClientList(false);
    setFilteredClients(clients);
  };

  const formatCurrency = (value) => {
    return `S/ ${value?.toFixed(2) || '0.00'}`;
  };

  // ✅ Renderizar estado del pedido
  const getStatusBadge = (status) => {
    const colors = {
      'PENDIENTE': 'bg-yellow-100 text-yellow-800',
      'CONFIRMADO': 'bg-blue-100 text-blue-800',
      'ENVIADO': 'bg-purple-100 text-purple-800',
      'ENTREGADO': 'bg-green-100 text-green-800',
      'CANCELADO': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // ✅ Calcular estadísticas del cliente
  const getClientStats = () => {
    if (!orders.length) {
      return { totalOrders: 0, totalSpent: 0, pendingOrders: 0, averageOrder: 0 };
    }
    
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((acc, o) => acc + (o.total || 0), 0);
    const pendingOrders = orders.filter(o => o.estado === 'PENDIENTE').length;
    const averageOrder = totalOrders > 0 ? totalSpent / totalOrders : 0;
    
    return { totalOrders, totalSpent, pendingOrders, averageOrder };
  };

  if (loadingClients) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <MagnifyingGlassIcon className="w-8 h-8 text-primary-600" />
            Buscar Cliente
          </h1>
          <p className="text-gray-600 mt-2">
            Busca compradores por nombre, email o DNI. Selecciona uno para ver su historial.
          </p>
          <div className="mt-2 text-sm text-gray-500">
            <UserGroupIcon className="w-4 h-4 inline mr-1" />
            {clients.length} compradores registrados en total
          </div>
        </div>

        {/* Buscador */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o DNI..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => setShowClientList(true)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            {selectedClient && (
              <button
                onClick={clearSelection}
                className="btn-secondary flex items-center gap-2 whitespace-nowrap"
              >
                <XMarkIcon className="w-5 h-5" />
                Limpiar selección
              </button>
            )}
          </div>

          {/* Lista de clientes filtrados */}
          {showClientList && searchTerm && (
            <div className="mt-4 max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
              {filteredClients.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No se encontraron compradores con "{searchTerm}"
                </div>
              ) : (
                filteredClients.map((client) => (
                  <button
                    key={client.id || client._id}
                    onClick={() => selectClient(client)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 text-left"
                  >
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold flex-shrink-0">
                      {client.nombre?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{client.nombre}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500">
                        <span className="truncate">{client.email}</span>
                        {client.documento && (
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            DNI: {client.documento}
                          </span>
                        )}
                        {client.telefono && (
                          <span className="text-xs">📞 {client.telefono}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Cliente seleccionado */}
        {selectedClient && (
          <div className="space-y-6">
            {/* Información del cliente */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {selectedClient.nombre?.charAt(0).toUpperCase() || 'C'}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedClient.nombre}</h2>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-600">
                      <span>📧 {selectedClient.email}</span>
                      {selectedClient.telefono && <span>📞 {selectedClient.telefono}</span>}
                      {selectedClient.documento && (
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-sm">
                          DNI: {selectedClient.documento}
                        </span>
                      )}
                      {selectedClient.direccion && <span>📍 {selectedClient.direccion}</span>}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        {selectedClient.activo !== false ? 'Activo' : 'Inactivo'}
                      </span>
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Comprador
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      // Puedes agregar aquí la funcionalidad para iniciar una venta directa
                      toast.success(`Preparando venta para ${selectedClient.nombre}...`);
                    }}
                    className="btn-primary flex items-center gap-2"
                  >
                    <ShoppingBagIcon className="w-5 h-5" />
                    Nueva Venta
                  </button>
                </div>
              </div>
            </div>

            {/* Estadísticas del cliente */}
            {!loading && orders.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-l-blue-500">
                  <p className="text-sm text-gray-500">Total Pedidos</p>
                  <p className="text-2xl font-bold text-gray-900">{getClientStats().totalOrders}</p>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-l-green-500">
                  <p className="text-sm text-gray-500">Total Gastado</p>
                  <p className="text-2xl font-bold text-primary-600">{formatCurrency(getClientStats().totalSpent)}</p>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-l-yellow-500">
                  <p className="text-sm text-gray-500">Pedidos Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-600">{getClientStats().pendingOrders}</p>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-l-purple-500">
                  <p className="text-sm text-gray-500">Promedio por Pedido</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(getClientStats().averageOrder)}</p>
                </div>
              </div>
            )}

            {/* Historial de compras */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <ClipboardDocumentListIcon className="w-6 h-6 text-primary-600" />
                  Historial de Compras
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({orders.length} pedidos)
                  </span>
                </h2>
                {loading && (
                  <div className="inline-block w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                )}
              </div>
              {loading ? (
                <div className="p-12 text-center">
                  <div className="inline-block w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                  <p className="text-gray-500 mt-2">Cargando historial...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-lg font-medium">Este cliente no tiene compras registradas</p>
                  <p className="text-sm mt-1">Cuando realice su primera compra, aparecerá aquí</p>
                  {recommendations.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700">💡 Recomendaciones para este cliente:</p>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {recommendations.slice(0, 3).map((product) => (
                          <div key={product._id} className="bg-gray-50 rounded-lg p-3 text-center">
                            <p className="text-sm font-medium text-gray-700 truncate">{product.nombre}</p>
                            <p className="text-sm font-bold text-primary-600">{formatCurrency(product.precio)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pedido</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Productos</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedor</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orders.map((order) => (
                        <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            #{order._id?.slice(0, 8)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(order.fecha).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {order.productos?.length || 0} productos
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-primary-600">
                            {formatCurrency(order.total)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(order.estado)}`}>
                              {order.estado}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {order.vendedorNombre || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recomendaciones */}
            {recommendations.length > 0 && orders.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ClockIcon className="w-6 h-6 text-primary-600" />
                  Productos Recomendados para {selectedClient.nombre}
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Basado en compras anteriores de {selectedClient.nombre}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {recommendations.map((product) => (
                    <div key={product._id} className="bg-gray-50 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                      <img 
                        src={product.imagen || 'https://via.placeholder.com/100x100?text=Producto'} 
                        alt={product.nombre} 
                        className="w-20 h-20 object-cover rounded-lg mx-auto mb-2"
                      />
                      <p className="text-sm font-medium text-gray-700 truncate">{product.nombre}</p>
                      <p className="text-xs text-gray-500">{product.categoria || 'General'}</p>
                      <p className="text-sm font-bold text-primary-600 mt-1">{formatCurrency(product.precio)}</p>
                      {product.stock > 0 ? (
                        <span className="text-xs text-green-600">✔ Disponible</span>
                      ) : (
                        <span className="text-xs text-red-600">✖ Sin stock</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ✅ Componente auxiliar para el ícono de flecha
const ChevronRightIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export default VendorSearchClient;