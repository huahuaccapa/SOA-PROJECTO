// src/components/vendor/VendorCart.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { 
  ShoppingCartIcon, 
  TrashIcon, 
  PlusIcon, 
  MinusIcon,
  CurrencyDollarIcon,
  UserIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  TruckIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const VendorCart = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showClientModal, setShowClientModal] = useState(false);

  useEffect(() => {
    fetchCartItems();
    fetchClients();
  }, []);

  // ✅ Obtener items del carrito de ventas del vendedor
  const fetchCartItems = async () => {
    try {
      setLoading(true);
      // Endpoint para obtener el carrito de ventas del vendedor
      const response = await api.get(`/vendor/cart/${user.id}`);
      setCartItems(response.data || []);
    } catch (error) {
      console.error('Error fetching vendor cart:', error);
      // Si no hay carrito, inicializar vacío
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Obtener clientes del vendedor
  const fetchClients = async () => {
    try {
      const response = await api.get(`/orders?vendorId=${user.id}`);
      const orders = response.data || [];
      const uniqueClients = [];
      const clientMap = new Map();
      
      orders.forEach(order => {
        if (!clientMap.has(order.compradorId)) {
          clientMap.set(order.compradorId, {
            id: order.compradorId,
            nombre: order.compradorNombre,
            email: order.compradorEmail || '',
            telefono: order.compradorTelefono || '',
            totalCompras: 0,
            ultimaCompra: order.fecha
          });
        }
        const client = clientMap.get(order.compradorId);
        client.totalCompras += 1;
        if (new Date(order.fecha) > new Date(client.ultimaCompra)) {
          client.ultimaCompra = order.fecha;
        }
      });
      
      setClients(Array.from(clientMap.values()));
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  // ✅ Agregar producto al carrito de ventas
  const addToCart = async (product) => {
    try {
      await api.post('/vendor/cart', {
        vendorId: user.id,
        productId: product._id,
        cantidad: 1,
        precio: product.precio,
        nombre: product.nombre,
        imagen: product.imagen
      });
      toast.success('Producto agregado al carrito de ventas');
      fetchCartItems();
    } catch (error) {
      console.error('Error adding to vendor cart:', error);
      toast.error('Error al agregar al carrito');
    }
  };

  // ✅ Eliminar del carrito de ventas
  const removeFromCart = async (itemId) => {
    try {
      await api.delete(`/vendor/cart/${itemId}`);
      toast.success('Producto eliminado del carrito');
      fetchCartItems();
    } catch (error) {
      console.error('Error removing from vendor cart:', error);
      toast.error('Error al eliminar del carrito');
    }
  };

  // ✅ Actualizar cantidad
  const updateQuantity = async (itemId, cantidad) => {
    if (cantidad < 1) {
      removeFromCart(itemId);
      return;
    }
    try {
      await api.put(`/vendor/cart/${itemId}`, { cantidad });
      fetchCartItems();
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Error al actualizar cantidad');
    }
  };

  // ✅ Procesar venta (crear pedido)
  const processSale = async () => {
    if (!selectedClient) {
      toast.error('Selecciona un cliente para la venta');
      setShowClientModal(true);
      return;
    }

    if (cartItems.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    try {
      const total = cartItems.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
      const igv = total * 0.18;
      
      const orderData = {
        compradorId: selectedClient.id,
        compradorNombre: selectedClient.nombre,
        vendedorId: user.id,
        vendedorNombre: user.nombre,
        productos: cartItems.map(item => ({
          productoId: item.productId,
          nombre: item.nombre,
          cantidad: item.cantidad,
          precio: item.precio
        })),
        total: total + igv,
        subtotal: total,
        igv: igv,
        estado: 'CONFIRMADO',
        metodoPago: 'efectivo',
        fecha: new Date().toISOString()
      };

      const response = await api.post('/orders', orderData);
      
      if (response.data.success) {
        toast.success(`¡Venta realizada a ${selectedClient.nombre}!`);
        // Limpiar carrito
        await api.delete(`/vendor/cart/${user.id}/clear`);
        setCartItems([]);
        setSelectedClient(null);
        fetchClients();
      }
    } catch (error) {
      console.error('Error processing sale:', error);
      toast.error('Error al procesar la venta');
    }
  };

  // ✅ Buscar clientes
  const filteredClients = clients.filter(client =>
    client.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const total = cartItems.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  const igv = total * 0.18;
  const totalConIGV = total + igv;

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
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCartIcon className="w-8 h-8 text-primary-600" />
              Carrito de Ventas
            </h1>
            <p className="text-gray-600 mt-1">Gestiona las ventas desde tu carrito</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowClientModal(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <UserIcon className="w-5 h-5" />
              {selectedClient ? `Cliente: ${selectedClient.nombre}` : 'Seleccionar Cliente'}
            </button>
            <button
              onClick={processSale}
              disabled={cartItems.length === 0 || !selectedClient}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CurrencyDollarIcon className="w-5 h-5" />
              Realizar Venta
            </button>
          </div>
        </div>

        {/* Cliente seleccionado */}
        {selectedClient && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                {selectedClient.nombre?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-green-900">{selectedClient.nombre}</p>
                <p className="text-sm text-green-700">Cliente seleccionado</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedClient(null)}
              className="text-green-700 hover:text-green-900"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Carrito vacío */}
        {cartItems.length === 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <ShoppingCartIcon className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Carrito de Ventas Vacío</h2>
            <p className="text-gray-600">Agrega productos desde tu lista de productos</p>
            <Link to="/vendor/products" className="btn-primary inline-block mt-4">
              Ver Mis Productos
            </Link>
          </div>
        )}

        {/* Items del carrito */}
        {cartItems.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6">
                  {cartItems.map((item) => (
                    <div key={item._id} className="flex flex-col sm:flex-row items-center gap-4 border-b border-gray-100 py-4 last:border-0">
                      <img
                        src={item.imagen || 'https://via.placeholder.com/80x80?text=Producto'}
                        alt={item.nombre}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{item.nombre}</h3>
                        <p className="text-primary-600 font-bold">S/ {item.precio.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center border border-gray-300 rounded-lg">
                          <button
                            onClick={() => updateQuantity(item._id, item.cantidad - 1)}
                            className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-l-lg transition-colors"
                          >
                            <MinusIcon className="w-4 h-4" />
                          </button>
                          <span className="w-12 text-center font-semibold">{item.cantidad}</span>
                          <button
                            onClick={() => updateQuantity(item._id, item.cantidad + 1)}
                            className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-r-lg transition-colors"
                          >
                            <PlusIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item._id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Resumen */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-24">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Resumen de Venta</h2>
                
                <div className="space-y-3 text-gray-600">
                  <div className="flex justify-between">
                    <span>Productos ({cartItems.length})</span>
                    <span>S/ {total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IGV (18%)</span>
                    <span>S/ {igv.toFixed(2)}</span>
                  </div>
                  {selectedClient && (
                    <div className="flex justify-between text-sm">
                      <span>Cliente</span>
                      <span className="font-medium text-gray-900">{selectedClient.nombre}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <div className="flex justify-between text-lg font-bold text-gray-900">
                      <span>Total</span>
                      <span className="text-primary-600">S/ {totalConIGV.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <button
                    onClick={processSale}
                    disabled={!selectedClient || cartItems.length === 0}
                    className="btn-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CheckIcon className="w-5 h-5" />
                    Confirmar Venta
                  </button>
                  {!selectedClient && (
                    <p className="text-sm text-yellow-600 text-center">
                      ⚠️ Selecciona un cliente para realizar la venta
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de selección de cliente */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">Seleccionar Cliente</h2>
              <button onClick={() => setShowClientModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Buscar cliente por nombre o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredClients.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No se encontraron clientes</p>
              ) : (
                filteredClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => {
                      setSelectedClient(client);
                      setShowClientModal(false);
                      toast.success(`Cliente seleccionado: ${client.nombre}`);
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
                  >
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold">
                      {client.nombre?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">{client.nombre}</p>
                      <p className="text-sm text-gray-500">
                        {client.totalCompras} compras • Última: {new Date(client.ultimaCompra).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorCart;