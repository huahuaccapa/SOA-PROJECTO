// src/components/vendor/VendorSearchClient.jsx
import React, { useState } from 'react';
import api from '../../api/axios';
import { MagnifyingGlassIcon, UserIcon, ClipboardDocumentListIcon, ClockIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const VendorSearchClient = () => {
  const [dni, setDni] = useState('');
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState(null);
  const [orders, setOrders] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  const searchClient = async () => {
    if (!dni.trim()) {
      toast.error('Ingresa un DNI para buscar');
      return;
    }

    setLoading(true);
    setClient(null);
    setOrders([]);
    setRecommendations([]);

    try {
      // ✅ Buscar usuario por DNI
      const userRes = await api.get(`/users?documento=${dni}`);
      const foundUser = userRes.data.find(u => u.documento === dni);
      
      if (!foundUser) {
        toast.error('No se encontró un cliente con este DNI');
        setLoading(false);
        return;
      }

      setClient(foundUser);

      // ✅ Obtener historial de compras del cliente
      const ordersRes = await api.get(`/orders?userId=${foundUser.id}`);
      setOrders(ordersRes.data);

      // ✅ Generar recomendaciones basadas en compras anteriores
      if (ordersRes.data.length > 0) {
        const productIds = ordersRes.data.flatMap(o => 
          o.productos.map(p => p.productoId)
        );
        
        // Obtener productos similares
        const productsRes = await api.get('/products');
        const categories = ordersRes.data.flatMap(o => 
          o.productos.map(p => p.categoria)
        );
        
        const recommended = productsRes.data
          .filter(p => categories.includes(p.categoria) && !productIds.includes(p._id))
          .slice(0, 5);
        
        setRecommendations(recommended);
      }

      toast.success(`Cliente encontrado: ${foundUser.nombre}`);
    } catch (error) {
      console.error('Error searching client:', error);
      toast.error('Error al buscar cliente');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return `S/ ${value?.toFixed(2) || '0.00'}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <MagnifyingGlassIcon className="w-8 h-8 text-primary-600" />
            Buscar Cliente
          </h1>
          <p className="text-gray-600 mt-2">Ingresa el DNI de un cliente para ver su historial de compras</p>
        </div>

        {/* Buscador */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Ingresa el DNI del cliente"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              className="flex-1 input-field"
              onKeyPress={(e) => e.key === 'Enter' && searchClient()}
            />
            <button
              onClick={searchClient}
              disabled={loading}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <MagnifyingGlassIcon className="w-5 h-5" />
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>

        {/* Resultados */}
        {client && (
          <div className="space-y-6">
            {/* Información del cliente */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <UserIcon className="w-6 h-6 text-primary-600" />
                Información del Cliente
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Nombre</p>
                  <p className="font-medium">{client.nombre}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{client.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">DNI</p>
                  <p className="font-medium">{client.documento}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Teléfono</p>
                  <p className="font-medium">{client.telefono || 'No registrado'}</p>
                </div>
              </div>
            </div>

            {/* Historial de compras */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <ClipboardDocumentListIcon className="w-6 h-6 text-primary-600" />
                  Historial de Compras
                  <span className="ml-2 text-sm font-normal text-gray-500">({orders.length} pedidos)</span>
                </h2>
              </div>
              {orders.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <p>Este cliente no tiene compras registradas</p>
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
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orders.map((order) => (
                        <tr key={order._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            #{order._id?.slice(0, 8)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(order.fecha).toLocaleDateString('es-ES')}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {order.productos?.length || 0} productos
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-primary-600">
                            {formatCurrency(order.total)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              order.estado === 'ENTREGADO' ? 'bg-green-100 text-green-800' :
                              order.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {order.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recomendaciones */}
            {recommendations.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ClockIcon className="w-6 h-6 text-primary-600" />
                  Productos Recomendados para {client.nombre}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {recommendations.map((product) => (
                    <div key={product._id} className="bg-gray-50 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                      <img src={product.imagen || 'https://via.placeholder.com/100x100?text=Producto'} alt={product.nombre} className="w-20 h-20 object-cover rounded-lg mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-700 truncate">{product.nombre}</p>
                      <p className="text-xs text-gray-500">{product.categoria}</p>
                      <p className="text-sm font-bold text-primary-600 mt-1">{formatCurrency(product.precio)}</p>
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

export default VendorSearchClient;