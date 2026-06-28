// src\components\Cart\CartModal.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../contexts/CartContext'
import { useAuth } from '../../contexts/AuthContext'
import { 
  X, Minus, Plus, Trash2, ShoppingBag, 
  CreditCard, Truck, Shield, Sparkles,
  Percent, Gift, Clock, ArrowRight
} from 'lucide-react'

const CartModal = ({ isOpen, onClose }) => {
  const { cart, updateQuantity, removeFromCart, getCartTotal, clearCart } = useCart()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [coupon, setCoupon] = useState('')
  const [couponApplied, setCouponApplied] = useState(false)

  if (!isOpen) return null

  const subtotal = getCartTotal()
  const igv = subtotal * 0.18
  const envio = subtotal > 500 ? 0 : 25
  const total = subtotal + igv + envio
  const descuento = couponApplied ? subtotal * 0.10 : 0

  const handleCheckout = () => {
    onClose()
    if (isAuthenticated) {
      navigate('/checkout')
    } else {
      sessionStorage.setItem('redirectAfterLogin', '/checkout')
      navigate('/login')
    }
  }

  const applyCoupon = () => {
    if (coupon.toUpperCase() === 'BYTE10') {
      setCouponApplied(true)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 shadow-2xl border-l border-cyan-500/30 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyan-500/30">
          <h2 className="text-xl font-semibold flex items-center text-white">
            <ShoppingBag className="mr-2 w-5 h-5 text-cyan-400" />
            Mi Carrito ({cart.length})
          </h2>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button 
                onClick={clearCart}
                className="text-red-400 hover:text-red-300 text-sm transition"
              >
                Vaciar
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-lg transition text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Tu carrito está vacío</p>
              <button 
                onClick={onClose}
                className="mt-4 btn-primary text-sm"
              >
                Seguir comprando
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map(item => (
                <div key={item.id} className="flex gap-4 bg-gray-800/30 rounded-lg p-3 hover:bg-gray-800/50 transition">
                  <img
                    src={item.imagen || 'https://via.placeholder.com/80?text=Producto'}
                    alt={item.nombre}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-white truncate">{item.nombre}</h3>
                    <p className="text-cyan-400 font-bold text-sm">
                      S/ {item.precio.toFixed(2)}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 hover:bg-gray-700 rounded-lg transition text-gray-400 hover:text-white"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm text-white">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 hover:bg-gray-700 rounded-lg transition text-gray-400 hover:text-white"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="ml-auto text-red-400 hover:text-red-300 transition p-1 hover:bg-red-500/10 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-bold text-white">
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
          <div className="border-t border-cyan-500/30 p-4 space-y-3 bg-gray-900/50">
            {/* Coupon */}
            <div className="flex gap-2">
              <input
                type="text"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="Código de descuento"
                className="flex-1 input-field text-sm py-1.5"
                disabled={couponApplied}
              />
              <button
                onClick={applyCoupon}
                disabled={couponApplied || !coupon}
                className="btn-secondary text-sm py-1.5 px-4 disabled:opacity-50"
              >
                {couponApplied ? '✓ Aplicado' : 'Aplicar'}
              </button>
            </div>

            {/* Totales */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white">S/ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">IGV (18%)</span>
                <span className="text-white">S/ {igv.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Envío</span>
                <span className={envio === 0 ? 'text-green-400' : 'text-white'}>
                  {envio === 0 ? 'Gratis' : `S/ ${envio.toFixed(2)}`}
                </span>
              </div>
              {couponApplied && (
                <div className="flex justify-between text-green-400">
                  <span>Descuento (10%)</span>
                  <span>- S/ {descuento.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-cyan-500/20">
                <span className="text-white">Total</span>
                <span className="text-cyan-400">S/ {(total - descuento).toFixed(2)}</span>
              </div>
            </div>

            {/* Beneficios */}
            <div className="flex flex-wrap gap-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Truck size={12} className="text-cyan-400" /> Envío gratis desde S/ 500</span>
              <span className="flex items-center gap-1"><Shield size={12} className="text-cyan-400" /> Pago seguro</span>
              <span className="flex items-center gap-1"><Gift size={12} className="text-cyan-400" /> 30 días de devolución</span>
            </div>
            
            {/* Botón de pago */}
            <button 
              onClick={handleCheckout} 
              className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2 group"
            >
              Proceder al Pago
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default CartModal