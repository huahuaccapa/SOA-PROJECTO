// src/components/vendor/VendorOrders.jsx
import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { EyeIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const VendorOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchOrders();
  }, []);

  // ✅ ACTUALIZADO: vendorId → vendedorId
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/orders?vendedorId=${user.id}`);
      setOrders(response.data);
      console.log('✅ Pedidos del vendedor:', response.data.length);
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      toast.error('Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      toast.success(`Pedido ${status}`);
      fetchOrders();
    } catch (error) {
      console.error('❌ Error updating order:', error);
      toast.error('Error al actualizar pedido');
    }
  };

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
            <h1 className="text-3xl font-bold text-gray-900">Mis Pedidos</h1>
            <p className="text-gray-600 mt-2">Administra los pedidos de tus productos</p>
          </div>
          <button onClick={fetchOrders} className="btn-secondary flex items-center gap-2">
            <span>↻</span> Recargar
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pedido</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id || order._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{order.id?.slice(0, 8) || order._id?.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{order.compradorNombre}</p>
                        <p className="text-xs text-gray-500">{order.compradorId}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary-600">
                      S/ {order.total?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(order.estado)}`}>
                        {order.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.fecha).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedOrder(order)} className="text-blue-600 hover:text-blue-800">
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        {order.estado === 'PENDIENTE' && (
                          <button onClick={() => handleUpdateStatus(order.id, 'CONFIRMADO')} className="text-green-600 hover:text-green-800">
                            <CheckIcon className="w-5 h-5" />
                          </button>
                        )}
                        {order.estado !== 'CANCELADO' && order.estado !== 'ENTREGADO' && (
                          <button onClick={() => handleUpdateStatus(order.id, 'CANCELADO')} className="text-red-600 hover:text-red-800">
                            <XMarkIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl shadow-xl mt-4">
            <p className="text-gray-500">No tienes pedidos</p>
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">Detalle del Pedido</h2>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Pedido</p>
                  <p className="font-medium">#{selectedOrder.id?.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estado</p>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(selectedOrder.estado)}`}>
                    {selectedOrder.estado}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cliente</p>
                  <p className="font-medium">{selectedOrder.compradorNombre}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Vendedor</p>
                  <p className="font-medium">{selectedOrder.vendedorNombre}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Productos</h3>
                {selectedOrder.productos?.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-1">
                    <span>{item.nombre} × {item.cantidad}</span>
                    <span>S/ {(item.precio * item.cantidad).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between"><span>Subtotal</span><span>S/ {selectedOrder.subtotal?.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>IGV (18%)</span><span>S/ {selectedOrder.igv?.toFixed(2)}</span></div>
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-primary-600">S/ {selectedOrder.total?.toFixed(2)}</span>
                </div>
              </div>
              {selectedOrder.direccion && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-1">Dirección de Envío</h3>
                  <p className="text-gray-600">{selectedOrder.direccion}</p>
                  <p className="text-gray-600">{selectedOrder.ciudad}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorOrders;