//src\services\cartService.js
import api from './api'

export const cartService = {
  // Obtener carrito del usuario
  async getCart(userId) {
    try {
      const response = await api.get(`/cart/${userId}`)
      return response.data
    } catch (error) {
      // Si no hay carrito en backend, usar localStorage
      const savedCart = localStorage.getItem(`cart_${userId}`)
      return savedCart ? JSON.parse(savedCart) : []
    }
  },

  // Guardar carrito
  async saveCart(userId, cart) {
    try {
      const response = await api.post(`/cart/${userId}`, { items: cart })
      localStorage.setItem(`cart_${userId}`, JSON.stringify(cart))
      return response.data
    } catch (error) {
      // Fallback a localStorage
      localStorage.setItem(`cart_${userId}`, JSON.stringify(cart))
      return { success: true }
    }
  },

  // Añadir item al carrito
  async addToCart(userId, productId, quantity = 1) {
    try {
      const response = await api.post(`/cart/${userId}/add`, { productId, quantity })
      return response.data
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al añadir al carrito'
      }
    }
  },

  // Eliminar item del carrito
  async removeFromCart(userId, productId) {
    try {
      const response = await api.delete(`/cart/${userId}/remove/${productId}`)
      return response.data
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al eliminar del carrito'
      }
    }
  },

  // Vaciar carrito
  async clearCart(userId) {
    try {
      const response = await api.delete(`/cart/${userId}/clear`)
      localStorage.removeItem(`cart_${userId}`)
      return response.data
    } catch (error) {
      localStorage.removeItem(`cart_${userId}`)
      return { success: true }
    }
  }
}