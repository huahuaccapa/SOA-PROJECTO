//src\services\orderService.js
let mockOrders = [
  {
    id: 1001,
    fecha: '2024-01-15T10:30:00',
    total: 5499.99,
    estado: 'CONFIRMADO',
    metodoPago: 'stripe',
    productos: [
      { nombre: 'Laptop Gamer ASUS ROG', cantidad: 1, precio: 5499.99 },
    ],
  },
  {
    id: 1002,
    fecha: '2024-01-20T14:45:00',
    total: 1299.99,
    estado: 'PENDIENTE',
    metodoPago: 'paypal',
    productos: [
      { nombre: 'Sony WH-1000XM5', cantidad: 1, precio: 1299.99 },
    ],
  },
]

export const orderService = {
  async createOrder(orderData, token) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newOrder = {
          id: 2000 + mockOrders.length + 1,
          fecha: new Date().toISOString(),
          total: orderData.total,
          estado: 'CONFIRMADO',
          metodoPago: orderData.metodoPago,
          productos: orderData.productos,
        }
        mockOrders.unshift(newOrder)
        resolve({ success: true, order: newOrder })
      }, 1500)
    })
  },

  async getOrders(token) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...mockOrders])
      }, 300)
    })
  },

  async getOrderById(id) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const order = mockOrders.find(o => o.id === parseInt(id))
        resolve(order || null)
      }, 200)
    })
  },
}