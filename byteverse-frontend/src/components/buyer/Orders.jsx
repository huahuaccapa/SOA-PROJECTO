import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { EyeIcon } from '@heroicons/react/24/outline';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get(`/orders?userId=${user.id}`);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'PENDIENTE': 'badge-warning',
      'CONFIRMADO': 'badge-success',
      'CANCELADO': 'badge-danger'
    };
    return colors[status] || 'badge-info';
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Mis Pedidos</h1>
        
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="text-6xl mb-6">📦</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No tienes pedidos</h2>
            <p className="text-gray-600 mb-8">Realiza tu primera compra y revisa tus pedidos aquí</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-gray-900">
                          Pedido #{order.id?.slice(0, 8) || order._id?.slice(0, 8)}
                        </h3>
                        <span className={`badge ${getStatusColor(order.estado)}`}>
                          {order.estado}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(order.fecha).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary-600">
                        S/ {order.total.toFixed(2)}
                      </p>
                      {order.boletaNumero && (
                        <p className="text-xs text-gray-500">Boleta: {order.boletaNumero}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-100 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {order.productos?.map((item, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
                            📦
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{item.nombre}</p>
                            <p className="text-sm text-gray-500">
                              {item.cantidad} × S/ {item.precio.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
                      <EyeIcon className="w-4 h-4" />
                      Ver Detalle
                    </button>
                    {order.estado === 'PENDIENTE' && (
                      <button className="btn-danger text-sm px-4 py-2">
                        Cancelar Pedido
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;