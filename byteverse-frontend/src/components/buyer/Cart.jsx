import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../context/AuthContext';
import { TrashIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';

const Cart = () => {
  const { cart, totalItems, totalPrice, removeFromCart, updateQuantity, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    navigate('/checkout');
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white rounded-2xl shadow-xl p-12">
            <div className="text-6xl mb-6">🛒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Tu carrito está vacío</h2>
            <p className="text-gray-600 mb-8">¡Explora nuestros productos y encuentra lo que necesitas!</p>
            <Link to="/products" className="btn-primary inline-block">
              Ver Productos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Carrito de Compras</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6">
                {cart.map((item) => (
                  <div key={item.productId} className="flex flex-col sm:flex-row items-center gap-4 border-b border-gray-100 py-4 last:border-0">
                    <img
                      src={item.imagen || 'https://via.placeholder.com/80x80?text=Producto'}
                      alt={item.nombre}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    
                    <div className="flex-1">
                      <Link to={`/product/${item.productId}`}>
                        <h3 className="font-semibold text-gray-900 hover:text-primary-600 transition-colors">
                          {item.nombre}
                        </h3>
                      </Link>
                      <p className="text-primary-600 font-bold">S/ {item.precio.toFixed(2)}</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center border border-gray-300 rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.productId, item.cantidad - 1)}
                          className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-l-lg transition-colors"
                        >
                          <MinusIcon className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center font-semibold">{item.cantidad}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.cantidad + 1)}
                          className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-r-lg transition-colors"
                          disabled={item.cantidad >= item.stock}
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <button
                        onClick={() => removeFromCart(item.productId)}
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

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Resumen del Pedido</h2>
              
              <div className="space-y-3 text-gray-600">
                <div className="flex justify-between">
                  <span>Productos ({totalItems})</span>
                  <span>S/ {totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IGV (18%)</span>
                  <span>S/ {(totalPrice * 0.18).toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex justify-between text-lg font-bold text-gray-900">
                    <span>Total</span>
                    <span className="text-primary-600">S/ {(totalPrice * 1.18).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  onClick={handleCheckout}
                  className="btn-primary w-full py-3 text-lg"
                >
                  Proceder al Pago
                </button>
                <button
                  onClick={clearCart}
                  className="btn-secondary w-full"
                >
                  Vaciar Carrito
                </button>
              </div>

              <Link to="/products" className="block text-center text-sm text-primary-600 hover:text-primary-700 mt-4">
                Seguir comprando →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;