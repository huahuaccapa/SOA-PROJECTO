// src\services\cartService.js
export const cartService = {
  async getCart(userId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const savedCart = localStorage.getItem(`cart_${userId}`)
        resolve(savedCart ? JSON.parse(savedCart) : [])
      }, 200)
    })
  },

  async saveCart(userId, cart) {
    return new Promise((resolve) => {
      setTimeout(() => {
        localStorage.setItem(`cart_${userId}`, JSON.stringify(cart))
        resolve({ success: true })
      }, 200)
    })
  },
}