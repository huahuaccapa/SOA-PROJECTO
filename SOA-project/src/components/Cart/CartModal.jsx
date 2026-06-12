//src\components\Cart\CartModal.jsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../contexts/CartContext'
import { useAuth } from '../../contexts/AuthContext'
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'

const CartModal = ({ isOpen, onClose }) => {
  const { cart, updateQuantity, removeFromCart, getCartTotal, clearCart } = useCart()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  if (!isOpen) return null

  const handleCheckout = () => {
    onClose()
    if (isAuthenticated) {
      navigate('/checkout')
    } else {
      navigate('/login')
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold flex items-center">
              <ShoppingBag className="mr-2 w-5 h-5" />
              Mi Carrito ({cart.length})
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X size={24} />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Tu carrito está vacío</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.id} className="flex gap-4 border-b pb-4">
                    <img
                      src={item.imagen || 'https://via.placeholder.com/80?text=Producto'}
                      alt={item.nombre}
                      className="w-20 h-20 object-cover rounded"
                    />
                    
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{item.nombre}</h3>
                      <p className="text-indigo-600 font-bold text-sm">
                        S/ {item.precio.toFixed(2)}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Plus size={16} />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="ml-auto text-red-500 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-bold">
                        S/ {(item.precio * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {cart.length > 0 && (
            <div className="border-t p-4 space-y-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-indigo-600">S/ {getCartTotal().toFixed(2)}</span>
              </div>
              
              <div className="flex gap-3">
                <button onClick={clearCart} className="btn-secondary flex-1">
                  Vaciar
                </button>
                <button onClick={handleCheckout} className="btn-primary flex-1">
                  Pagar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CartModal