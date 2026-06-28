//src\pages\CheckoutPage.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import { orderService } from '../services/orderService'
import { CreditCard, Building2, Truck, CheckCircle, Sparkles, Shield, Clock } from 'lucide-react'
import tarjetaIcon from '../assets/icono tarjeta.png'
import paypalIcon from '../assets/iconopaypal.png'

const CheckoutPage = () => {
  const { cart, getCartTotal, clearCart } = useCart()
  const { user, token } = useAuth()
  const { showSuccess, showError, showLoading } = useNotification()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('stripe')
  const [formData, setFormData] = useState({
    direccion: user?.direccion?.linea || '',
    ciudad: user?.direccion?.distrito || '',
    codigoPostal: '',
    tarjeta: '',
    expiracion: '',
    cvv: '',
    nombreTarjeta: '',
  })
  const [errors, setErrors] = useState({})

  if (cart.length === 0) {
    navigate('/products')
    return null
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.direccion) newErrors.direccion = 'La dirección es requerida'
    if (!formData.ciudad) newErrors.ciudad = 'La ciudad es requerida'
    if (paymentMethod === 'stripe') {
      if (!formData.tarjeta) newErrors.tarjeta = 'Número de tarjeta requerido'
      else if (!/^\d{16}$/.test(formData.tarjeta.replace(/\s/g, ''))) newErrors.tarjeta = 'Tarjeta inválida (16 dígitos)'
      if (!formData.expiracion) newErrors.expiracion = 'Fecha de expiración requerida'
      else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(formData.expiracion)) newErrors.expiracion = 'Formato MM/YY'
      if (!formData.cvv) newErrors.cvv = 'CVV requerido'
      else if (!/^\d{3,4}$/.test(formData.cvv)) newErrors.cvv = 'CVV inválido (3-4 dígitos)'
      if (!formData.nombreTarjeta) newErrors.nombreTarjeta = 'Nombre en la tarjeta requerido'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e) => {
    let { name, value } = e.target
    if (name === 'tarjeta') {
      value = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim()
    }
    if (name === 'expiracion') {
      value = value.replace(/^(\d{2})(\d)/, '$1/$2').slice(0, 5)
    }
    setFormData({ ...formData, [name]: value })
    if (errors[name]) {
      setErrors({ ...errors, [name]: null })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) {
      showError('Por favor completa todos los campos correctamente')
      return
    }
    
    setLoading(true)
    const loadingToast = showLoading('Procesando tu pedido seguro...')
    
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
        ciudad: formData.ciudad,
        metodoPago: paymentMethod,
      }
      
      const result = await orderService.createOrder(orderData, token)
      
      if (result.success) {
        clearCart()
        showSuccess('¡Pedido realizado con éxito! 🎉 Recibirás un correo de confirmación')
        navigate('/orders')
      } else {
        showError(result.error || 'Error al procesar el pedido')
      }
      
      setLoading(false)
    }, 2000)
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
          Finalizar Compra
        </h1>
        <p className="text-gray-400 mt-2">Completa tus datos y asegura tu pedido</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dirección de Envío */}
            <div className="card p-6 hover:border-cyan-500/50 transition-all duration-300">
              <h2 className="text-xl font-semibold mb-4 flex items-center text-cyan-400">
                <Truck className="mr-2 w-5 h-5 animate-pulse-glow" />
                Dirección de Envío
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Dirección completa *
                  </label>
                  <input
                    type="text"
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleChange}
                    className={`input-field ${errors.direccion ? 'border-red-500' : ''}`}
                    placeholder="Calle, número, urbanización"
                  />
                  {errors.direccion && <p className="text-red-400 text-xs mt-1">{errors.direccion}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Ciudad / Distrito *
                    </label>
                    <input
                      type="text"
                      name="ciudad"
                      value={formData.ciudad}
                      onChange={handleChange}
                      className={`input-field ${errors.ciudad ? 'border-red-500' : ''}`}
                      placeholder="Miraflores, Lima"
                    />
                    {errors.ciudad && <p className="text-red-400 text-xs mt-1">{errors.ciudad}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Código Postal
                    </label>
                    <input
                      type="text"
                      name="codigoPostal"
                      value={formData.codigoPostal}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="15074"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Método de Pago */}
            <div className="card p-6 hover:border-cyan-500/50 transition-all duration-300">
              <h2 className="text-xl font-semibold mb-4 flex items-center text-cyan-400">
                <CreditCard className="mr-2 w-5 h-5" />
                Método de Pago Seguro
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <label className={`flex items-center justify-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-300 ${paymentMethod === 'stripe' ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/20' : 'border-gray-700 hover:border-cyan-500/50'}`}>
                    <input
                      type="radio"
                      value="stripe"
                      checked={paymentMethod === 'stripe'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="hidden"
                    />
                    <img src={tarjetaIcon} alt="Tarjeta" className="w-8 h-8" />
                    <span className="font-medium">Tarjeta de Crédito/Débito</span>
                  </label>
                  <label className={`flex items-center justify-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-300 ${paymentMethod === 'paypal' ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/20' : 'border-gray-700 hover:border-cyan-500/50'}`}>
                    <input
                      type="radio"
                      value="paypal"
                      checked={paymentMethod === 'paypal'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="hidden"
                    />
                    <img src={paypalIcon} alt="PayPal" className="w-8 h-8" />
                    <span className="font-medium">PayPal</span>
                  </label>
                </div>
                
                {paymentMethod === 'stripe' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Número de Tarjeta *
                        </label>
                        <input
                          type="text"
                          name="tarjeta"
                          value={formData.tarjeta}
                          onChange={handleChange}
                          placeholder="4242 4242 4242 4242"
                          className={`input-field ${errors.tarjeta ? 'border-red-500' : ''}`}
                          maxLength="19"
                        />
                        {errors.tarjeta && <p className="text-red-400 text-xs mt-1">{errors.tarjeta}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Nombre en Tarjeta *
                        </label>
                        <input
                          type="text"
                          name="nombreTarjeta"
                          value={formData.nombreTarjeta}
                          onChange={handleChange}
                          placeholder="Como aparece en la tarjeta"
                          className={`input-field ${errors.nombreTarjeta ? 'border-red-500' : ''}`}
                        />
                        {errors.nombreTarjeta && <p className="text-red-400 text-xs mt-1">{errors.nombreTarjeta}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Fecha Expiración *
                        </label>
                        <input
                          type="text"
                          name="expiracion"
                          value={formData.expiracion}
                          onChange={handleChange}
                          placeholder="MM/YY"
                          className={`input-field ${errors.expiracion ? 'border-red-500' : ''}`}
                          maxLength="5"
                        />
                        {errors.expiracion && <p className="text-red-400 text-xs mt-1">{errors.expiracion}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          CVV *
                        </label>
                        <input
                          type="password"
                          name="cvv"
                          value={formData.cvv}
                          onChange={handleChange}
                          placeholder="123"
                          className={`input-field ${errors.cvv ? 'border-red-500' : ''}`}
                          maxLength="4"
                        />
                        {errors.cvv && <p className="text-red-400 text-xs mt-1">{errors.cvv}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Shield size={14} className="text-green-400" />
                      <span>Pago 100% seguro con encriptación SSL</span>
                    </div>
                  </div>
                )}

                {paymentMethod === 'paypal' && (
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center animate-fadeIn">
                    <p className="text-yellow-400 text-sm">Serás redirigido a PayPal para completar el pago de forma segura</p>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-lg disabled:opacity-50 group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Procesando pago seguro...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Pagar S/ {getCartTotal().toFixed(2)}
                  </>
                )}
              </span>
            </button>
          </form>
        </div>

        {/* Resumen del Pedido mejorado */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24 hover:border-cyan-500/50 transition-all duration-300">
            <h2 className="text-xl font-semibold mb-4 flex items-center text-cyan-400">
              <Clock className="mr-2 w-5 h-5" />
              Resumen del Pedido
            </h2>
            
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar mb-4">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between text-sm p-2 rounded-lg hover:bg-white/5 transition-all">
                  <div className="flex-1">
                    <p className="font-medium text-white">{item.nombre}</p>
                    <p className="text-gray-500 text-xs">Cantidad: {item.quantity}</p>
                  </div>
                  <span className="font-medium text-cyan-400">
                    S/ {(item.precio * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="border-t border-cyan-500/20 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal</span>
                <span>S/ {getCartTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Envío</span>
                <span className="text-green-400">Gratis</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Impuestos (IGV 18%)</span>
                <span>S/ {(getCartTotal() * 0.18).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold pt-2 border-t border-cyan-500/20">
                <span className="text-white">Total</span>
                <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  S/ {(getCartTotal() * 1.18).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-2 text-xs text-green-400">
                <CheckCircle size={14} />
                <span>Envío gratis en todos los pedidos</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-green-400 mt-1">
                <Shield size={14} />
                <span>Garantía de devolución de 30 días</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default CheckoutPage