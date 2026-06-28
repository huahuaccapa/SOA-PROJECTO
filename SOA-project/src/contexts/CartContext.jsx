//src\contexts\CartContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react'
import { useAuth } from './AuthContext'

const CartContext = createContext()

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}

export const CartProvider = ({ children }) => {
  const { user } = useAuth()
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(false)

  // Cargar carrito al iniciar o cuando cambie el usuario
  useEffect(() => {
    loadCart()
  }, [user?.id])

  const loadCart = async () => {
    if (!user?.id || user?.id === 'invitado') {
      // Usuario invitado - usar localStorage
      const savedCart = localStorage.getItem('cart_guest')
      setCart(savedCart ? JSON.parse(savedCart) : [])
      return
    }

    setLoading(true)
    // Cargar desde localStorage por ahora (backend de cart no está implementado)
    const savedCart = localStorage.getItem(`cart_${user.id}`)
    setCart(savedCart ? JSON.parse(savedCart) : [])
    setLoading(false)
  }

  // Guardar carrito cuando cambie
  useEffect(() => {
    if (user?.id && user?.id !== 'invitado') {
      localStorage.setItem(`cart_${user.id}`, JSON.stringify(cart))
    } else {
      localStorage.setItem('cart_guest', JSON.stringify(cart))
    }
  }, [cart, user?.id])

  const addToCart = (product, quantity = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id)
      
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }
      
      return [...prevCart, { ...product, quantity }]
    })
  }

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId))
  }

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    )
  }

  const clearCart = () => {
    setCart([])
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.precio * item.quantity), 0)
  }

  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0)
  }

  const value = {
    cart,
    loading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartCount,
    loadCart,
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}