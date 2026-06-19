// src/services/orderService.js
let mockOrders = []

export const orderService = {
  // Crear orden con boleta
  async createOrder(orderData, token) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newOrder = {
          id: 2000 + mockOrders.length + 1,
          fecha: new Date().toISOString(),
          total: orderData.total,
          subtotal: orderData.subtotal || orderData.total / 1.18,
          igv: orderData.igv || (orderData.total - orderData.total / 1.18),
          estado: 'CONFIRMADO',
          metodoPago: orderData.metodoPago,
          productos: orderData.productos,
          vendedorId: orderData.vendedorId,
          vendedorNombre: orderData.vendedorNombre,
          compradorId: orderData.compradorId,
          compradorNombre: orderData.compradorNombre,
          direccion: orderData.direccion,
          boleta: {
            numero: `B001-${String(mockOrders.length + 1).padStart(6, '0')}`,
            fecha: new Date().toISOString(),
            cliente: orderData.compradorNombre,
            ruc: orderData.ruc || '00000000000',
            items: orderData.productos.map(p => ({
              descripcion: p.nombre,
              cantidad: p.cantidad,
              precioUnitario: p.precio,
              total: p.precio * p.cantidad
            })),
            subtotal: orderData.subtotal || orderData.total / 1.18,
            igv: orderData.igv || (orderData.total - orderData.total / 1.18),
            total: orderData.total
          }
        }
        mockOrders.unshift(newOrder)
        
        // Registrar venta en productService
        const { productService } = require('./productService')
        productService.registerSale({
          vendedorId: orderData.vendedorId,
          vendedorNombre: orderData.vendedorNombre,
          productos: orderData.productos,
          total: orderData.total,
          compradorId: orderData.compradorId
        })
        
        resolve({ success: true, order: newOrder })
      }, 1500)
    })
  },

  // Obtener órdenes de usuario
  async getOrders(token) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...mockOrders])
      }, 300)
    })
  },

  // Obtener órdenes por vendedor
  async getOrdersByVendor(vendorId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const orders = mockOrders.filter(o => o.vendedorId === vendorId)
        resolve([...orders])
      }, 300)
    })
  },

  // Obtener orden por ID
  async getOrderById(id) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const order = mockOrders.find(o => o.id === parseInt(id))
        resolve(order || null)
      }, 200)
    })
  },

  // Generar boleta
  async generateBoleta(orderId) {
    return new Promise((resolve) => {
      const order = mockOrders.find(o => o.id === parseInt(orderId))
      if (order && order.boleta) {
        resolve({ success: true, boleta: order.boleta })
      } else {
        resolve({ success: false, error: 'Boleta no encontrada' })
      }
    })
  }
}