//src\pages\OrdersPage.jsx
import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { orderService } from '../services/orderService'
import { Package, Clock, CheckCircle, XCircle } from 'lucide-react'

const OrdersPage = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const { token } = useAuth()

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    setLoading(true)
    const data = await orderService.getOrders(token)
    setOrders(data)
    setLoading(false)
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'CONFIRMADO':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'PENDIENTE':
        return <Clock className="w-5 h-5 text-yellow-500" />
      case 'CANCELADO':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Package className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'CONFIRMADO':
        return 'bg-green-100 text-green-800'
      case 'PENDIENTE':
        return 'bg-yellow-100 text-yellow-800'
      case 'CANCELADO':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No tienes pedidos</h2>
        <p className="text-gray-500">Realiza tu primera compra en ByteVerse</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Mis Pedidos</h1>
      
      <div className="space-y-6">
        {orders.map(order => (
          <div key={order.id} className="card p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
              <div>
                <p className="text-sm text-gray-500">Pedido #{order.id}</p>
                <p className="text-sm text-gray-500">
                  {new Date(order.fecha).toLocaleDateString('es-PE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 mt-2 md:mt-0 ${getStatusColor(order.estado)}`}>
                {getStatusIcon(order.estado)}
                <span>{order.estado}</span>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <div className="space-y-2">
                {order.productos.map((product, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>
                      {product.nombre} x {product.cantidad}
                    </span>
                    <span className="font-medium">
                      S/ {(product.precio * product.cantidad).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="border-t pt-4 mt-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Método de Pago</p>
                <p className="font-medium">{order.metodoPago?.toUpperCase() || 'Stripe'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold text-indigo-600">
                  S/ {order.total.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default OrdersPage