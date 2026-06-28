//src\services\orderService.js
import api from './api'

// Función helper para transformar orden del backend
const transformOrder = (order) => {
  if (!order) return null
  return {
    id: order.id || order._id,
    compradorId: order.compradorId || order.userId,
    compradorNombre: order.compradorNombre || order.userName,
    vendedorId: order.vendedorId || order.vendorId,
    vendedorNombre: order.vendedorNombre || order.vendorName,
    productos: (order.productos || order.items || []).map(item => ({
      productoId: item.productoId || item.productId || item.id,
      nombre: item.nombre || item.name,
      cantidad: item.cantidad || item.quantity || 1,
      precio: item.precio || item.price || 0
    })),
    subtotal: order.subtotal || 0,
    igv: order.igv || 0,
    total: order.total || 0,
    estado: order.estado || order.status || 'PENDIENTE',
    metodoPago: order.metodoPago || order.paymentMethod || 'stripe',
    direccion: order.direccion || order.address || '',
    ciudad: order.ciudad || order.city || '',
    fecha: order.fecha || order.createdAt || new Date().toISOString(),
    boletaNumero: order.boletaNumero || order.invoiceNumber
  }
}

export const orderService = {
  async createOrder(orderData) {
    try {
      console.log('📦 Creando orden...')
      const response = await api.post('/orders', {
        compradorId: orderData.usuario || orderData.userId,
        compradorNombre: orderData.usuarioNombre || orderData.userName,
        vendedorId: orderData.vendedorId || orderData.vendorId,
        vendedorNombre: orderData.vendedorNombre || orderData.vendorName,
        productos: orderData.productos || orderData.items || [],
        metodoPago: orderData.metodoPago || orderData.paymentMethod || 'stripe',
        direccion: orderData.direccion || orderData.address || '',
        ciudad: orderData.ciudad || orderData.city || ''
      })
      return { success: true, order: transformOrder(response.data) }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al crear orden'
      }
    }
  },

  async getOrders() {
    try {
      const response = await api.get('/orders')
      const orders = response.data || []
      return orders.map(transformOrder)
    } catch (error) {
      console.error('❌ Error fetching orders:', error)
      return []
    }
  },

  async getOrdersByVendor(vendorId) {
    try {
      const response = await api.get(`/orders?vendorId=${vendorId}`)
      const orders = response.data || []
      return orders.map(transformOrder)
    } catch (error) {
      console.error('❌ Error fetching vendor orders:', error)
      return []
    }
  },

  async getOrderById(id) {
    try {
      const response = await api.get(`/orders/${id}`)
      return transformOrder(response.data)
    } catch (error) {
      console.error('❌ Error fetching order:', error)
      return null
    }
  },

  async updateOrderStatus(orderId, status) {
    try {
      const response = await api.patch(`/orders/${orderId}/status`, { status })
      return { success: true, order: transformOrder(response.data) }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al actualizar estado'
      }
    }
  },

  async generateBoleta(orderId) {
    try {
      const response = await api.get(`/orders/${orderId}/boleta`)
      return response.data
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al generar boleta'
      }
    }
  }
}