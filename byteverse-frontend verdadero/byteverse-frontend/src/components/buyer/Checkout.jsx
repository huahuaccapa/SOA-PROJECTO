import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    direccion: '',
    ciudad: '',
    metodoPago: 'tarjeta',
    notas: ''
  });

  // ✅ Redirigir si carrito vacío
  if (cart.length === 0) {
    navigate('/cart');
    return null;
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // ✅ ENVIAR PEDIDO - ACTUALIZADO
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ Obtener vendedorId del primer producto (todos deberían tener el mismo)
      const firstProduct = cart[0];
      const vendedorId = firstProduct?.vendedorId || '';
      const vendedorNombre = firstProduct?.vendedorNombre || 'ByteVerse Store';

      // ✅ Verificar que todos los productos tengan el mismo vendedor
      const differentVendors = cart.some(item => item.vendedorId !== vendedorId);
      if (differentVendors) {
        toast.error('No se pueden comprar productos de diferentes vendedores en un mismo pedido');
        setLoading(false);
        return;
      }

      // ✅ Construir datos de la orden
      const orderData = {
        compradorId: user.id,  // ✅ String (ObjectId)
        compradorNombre: user.nombre || 'Usuario',
        vendedorId: vendedorId || '67a1b2c3d4e5f67890abcdef',  // ✅ String
        vendedorNombre: vendedorNombre || 'ByteVerse Store',
        productos: cart.map(item => ({
          productoId: item.productId,
          nombre: item.nombre,
          cantidad: item.cantidad,
          precio: item.precio
        })),
        metodoPago: formData.metodoPago,
        direccion: formData.direccion,
        ciudad: formData.ciudad,
        notas: formData.notas
      };

      console.log('📦 Enviando orden:', orderData);

      const response = await api.post('/orders', orderData);
      
      if (response.data.success) {
        toast.success('¡Pedido realizado con éxito!');
        clearCart();
        navigate('/orders');
      } else {
        toast.error(response.data.error || 'Error al procesar el pedido');
      }
    } catch (error) {
      console.error('❌ Error creating order:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Error al procesar el pedido';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Calcular totales
  const subtotal = totalPrice;
  const igv = subtotal * 0.18;
  const total = subtotal + igv;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulario */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Información de Envío</h2>
              
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dirección *
                    </label>
                    <input
                      type="text"
                      name="direccion"
                      value={formData.direccion}
                      onChange={handleChange}
                      required
                      className="input-field"
                      placeholder="Calle, número, urbanización"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ciudad *
                    </label>
                    <input
                      type="text"
                      name="ciudad"
                      value={formData.ciudad}
                      onChange={handleChange}
                      required
                      className="input-field"
                      placeholder="Ciudad"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Método de Pago *
                    </label>
                    <select
                      name="metodoPago"
                      value={formData.metodoPago}
                      onChange={handleChange}
                      required
                      className="input-field"
                    >
                      <option value="tarjeta">Tarjeta de Crédito/Débito</option>
                      <option value="yape">Yape</option>
                      <option value="plin">Plin</option>
                      <option value="transferencia">Transferencia Bancaria</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notas (opcional)
                    </label>
                    <textarea
                      name="notas"
                      value={formData.notas}
                      onChange={handleChange}
                      className="input-field"
                      rows="3"
                      placeholder="Instrucciones adicionales..."
                    />
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Resumen de la orden */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Resumen</h2>
              
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.nombre} × {item.cantidad}
                    </span>
                    <span className="font-medium">
                      S/ {(item.precio * item.cantidad).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-gray-200 mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>S/ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>IGV (18%)</span>
                  <span>S/ {igv.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span className="text-primary-600">S/ {total.toFixed(2)}</span>
                </div>
              </div>
              
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary w-full py-3 mt-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Procesando...' : 'Confirmar Pedido'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;