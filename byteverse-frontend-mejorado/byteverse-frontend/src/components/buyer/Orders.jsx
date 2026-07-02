// src/components/buyer/Orders.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { EyeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchOrders();
    }
  }, [isAuthenticated, user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        console.warn('⚠️ Usuario sin ID');
        setOrders([]);
        setLoading(false);
        return;
      }

      console.log('📦 Obteniendo pedidos para usuario:', user.id);
      
      const response = await api.get(`/orders?userId=${user.id}`);
      console.log('✅ Pedidos recibidos:', response.data);
      setOrders(response.data || []);
      
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      if (error.response?.status !== 404) {
        toast.error('Error al cargar tus pedidos');
      }
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'PENDIENTE': 'bg-yellow-100 text-yellow-800',
      'CONFIRMADO': 'bg-blue-100 text-blue-800',
      'ENVIADO': 'bg-purple-100 text-purple-800',
      'ENTREGADO': 'bg-green-100 text-green-800',
      'CANCELADO': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status) => {
    const texts = {
      'PENDIENTE': '⏳ Pendiente',
      'CONFIRMADO': '✅ Confirmado',
      'ENVIADO': '🚚 Enviado',
      'ENTREGADO': '📦 Entregado',
      'CANCELADO': '❌ Cancelado'
    };
    return texts[status] || status;
  };

  const handleCancelOrder = async (orderId) => {
    if (!confirm('¿Estás seguro de cancelar este pedido?')) return;
    
    try {
      await api.delete(`/orders/${orderId}`);
      toast.success('Pedido cancelado');
      fetchOrders();
    } catch (error) {
      console.error('❌ Error cancelando orden:', error);
      toast.error('Error al cancelar el pedido');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Debes iniciar sesión para ver tus pedidos</p>
          <Link to="/login" className="btn-primary inline-block mt-4">
            Iniciar Sesión
          </Link>
        </div>
      </div>
    );
  }

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
            <p className="text-gray-600 mt-2">Historial de todas tus compras</p>
          </div>
          <button
            onClick={fetchOrders}
            className="btn-secondary flex items-center gap-2"
          >
            <span>↻</span> Recargar
          </button>
        </div>
        
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="text-6xl mb-6">📦</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No tienes pedidos</h2>
            <p className="text-gray-600 mb-8">Realiza tu primera compra y revisa tus pedidos aquí</p>
            <Link to="/products" className="btn-primary inline-block">
              Ver Productos
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id || order._id} className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-bold text-gray-900">
                          Pedido #{order.id?.slice(0, 8) || order._id?.slice(0, 8)}
                        </h3>
                        <span className={`badge ${getStatusColor(order.estado)}`}>
                          {getStatusText(order.estado)}
                        </span>
                        {order.estado === 'PENDIENTE' && (
                          <button
                            onClick={() => handleCancelOrder(order.id || order._id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Cancelar
                          </button>
                        )}
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
                        S/ {order.total?.toFixed(2) || '0.00'}
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
                              {item.cantidad} × S/ {item.precio?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
                    >
                      <EyeIcon className="w-4 h-4" />
                      Ver Detalle
                    </button>
                    {order.estado === 'PENDIENTE' && (
                      <button
                        onClick={() => handleCancelOrder(order.id || order._id)}
                        className="btn-danger text-sm px-4 py-2 flex items-center gap-2"
                      >
                        <XMarkIcon className="w-4 h-4" />
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">Detalle del Pedido</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Número</p>
                  <p className="font-medium">{selectedOrder.id?.slice(0, 8) || selectedOrder._id?.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estado</p>
                  <span className={`badge ${getStatusColor(selectedOrder.estado)}`}>
                    {getStatusText(selectedOrder.estado)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha</p>
                  <p className="font-medium">
                    {new Date(selectedOrder.fecha).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Vendedor</p>
                  <p className="font-medium">{selectedOrder.vendedorNombre || 'ByteVerse'}</p>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-semibold mb-2">Productos</h3>
                <div className="space-y-2">
                  {selectedOrder.productos?.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.nombre} × {item.cantidad}</span>
                      <span>S/ {(item.precio * item.cantidad).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>S/ {selectedOrder.subtotal?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span>IGV (18%)</span>
                  <span>S/ {selectedOrder.igv?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-primary-600">S/ {selectedOrder.total?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
              
              {selectedOrder.direccion && (
                <div className="border-t border-gray-200 pt-4">
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

export default Orders;