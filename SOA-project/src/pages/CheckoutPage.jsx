//src\pages\CheckoutPage.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import { orderService } from '../services/orderService'
import { CreditCard, Building2, Truck, CheckCircle } from 'lucide-react'

const CheckoutPage = () => {
  const { cart, getCartTotal, clearCart } = useCart()
  const { user, token } = useAuth()
  const { showSuccess, showError, showLoading } = useNotification()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('stripe')
  const [formData, setFormData] = useState({
    direccion: '',
    ciudad: '',
    codigoPostal: '',
    tarjeta: '',
    expiracion: '',
    cvv: '',
  })

  if (cart.length === 0) {
    navigate('/products')
    return null
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const loadingToast = showLoading('Procesando tu pedido...')
    
    // Simular procesamiento de pago y pedido
    setTimeout(async () => {
      const orderData = {
        usuario: user.id || 1,
        productos: cart.map(item => ({
          id: item.id,
          nombre: item.nombre,
          cantidad: item.quantity,
          precio: item.precio,
        })),
        total: getCartTotal(),
        direccion: formData.direccion,
        metodoPago: paymentMethod,
      }
      
      const result = await orderService.createOrder(orderData, token)
      
      if (result.success) {
        clearCart()
        showSuccess('¡Pedido realizado con éxito!')
        navigate('/orders')
      } else {
        showError(result.error)
      }
      
      setLoading(false)
    }, 2000)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Finalizar Compra</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dirección de Envío */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Truck className="mr-2 w-5 h-5" />
                Dirección de Envío
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ciudad
                    </label>
                    <input
                      type="text"
                      name="ciudad"
                      value={formData.ciudad}
                      onChange={handleChange}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Código Postal
                    </label>
                    <input
                      type="text"
                      name="codigoPostal"
                      value={formData.codigoPostal}
                      onChange={handleChange}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Método de Pago */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <CreditCard className="mr-2 w-5 h-5" />
                Método de Pago
              </h2>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="stripe"
                      checked={paymentMethod === 'stripe'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mr-2"
                    />
                    <img src="https://stripe.com/img/logos/logo.png" alt="Stripe" className="h-6" />
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="paypal"
                      checked={paymentMethod === 'paypal'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mr-2"
                    />
                    <img src="https://www.paypal.com/webapps/mpp/logo/paypal_logo" alt="PayPal" className="h-6" />
                  </label>
                </div>
                
                {paymentMethod === 'stripe' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Número de Tarjeta
                      </label>
                      <input
                        type="text"
                        name="tarjeta"
                        value={formData.tarjeta}
                        onChange={handleChange}
                        placeholder="4242 4242 4242 4242"
                        className="input-field"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fecha Expiración
                        </label>
                        <input
                          type="text"
                          name="expiracion"
                          value={formData.expiracion}
                          onChange={handleChange}
                          placeholder="MM/YY"
                          className="input-field"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CVV
                        </label>
                        <input
                          type="text"
                          name="cvv"
                          value={formData.cvv}
                          onChange={handleChange}
                          placeholder="123"
                          className="input-field"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-lg disabled:opacity-50"
            >
              {loading ? 'Procesando...' : `Pagar S/ ${getCartTotal().toFixed(2)}`}
            </button>
          </form>
        </div>

        {/* Resumen del Pedido */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <h2 className="text-xl font-semibold mb-4">Resumen del Pedido</h2>
            
            <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.nombre} x {item.quantity}
                  </span>
                  <span className="font-medium">
                    S/ {(item.precio * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>S/ {getCartTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500 text-sm">
                <span>Envío</span>
                <span>Gratis</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-indigo-600">S/ {getCartTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckoutPage