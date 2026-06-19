import api from './api'

export const orderService = {
  // Crear orden
  async createOrder(orderData) {
    try {
      console.log('📦 Creando orden...')
      const response = await api.post('/orders', orderData)
      console.log('✅ Orden creada:', response.data)
      return response.data
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al crear orden'
      }
    }
  },

  // Obtener órdenes del usuario
  async getOrders() {
    try {
      const response = await api.get('/orders')
      return response.data
    } catch (error) {
      console.error('❌ Error fetching orders:', error)
      return []
    }
  },

  // Obtener órdenes por vendedor
  async getOrdersByVendor(vendorId) {
    try {
      const response = await api.get(`/orders/vendor/${vendorId}`)
      return response.data
    } catch (error) {
      console.error('❌ Error fetching vendor orders:', error)
      return []
    }
  },

  // Obtener orden por ID
  async getOrderById(id) {
    try {
      const response = await api.get(`/orders/${id}`)
      return response.data
    } catch (error) {
      console.error('❌ Error fetching order:', error)
      return null
    }
  },

  // Actualizar estado de orden
  async updateOrderStatus(orderId, status) {
    try {
      const response = await api.patch(`/orders/${orderId}/status`, { status })
      return response.data
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al actualizar estado'
      }
    }
  },

  // Generar boleta
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