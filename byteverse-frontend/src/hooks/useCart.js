import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export const useCart = () => {
  const [cart, setCart] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setCart(parsedCart);
        updateTotals(parsedCart);
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    }
  }, []);

  const updateTotals = (cartItems) => {
    const items = cartItems.reduce((acc, item) => acc + item.cantidad, 0);
    const price = cartItems.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    setTotalItems(items);
    setTotalPrice(price);
  };

  const saveCart = (newCart) => {
    localStorage.setItem('cart', JSON.stringify(newCart));
    setCart(newCart);
    updateTotals(newCart);
  };

  const addToCart = (product, quantity = 1) => {
    const existingItem = cart.find(item => item.productId === product._id);
    
    let newCart;
    if (existingItem) {
      newCart = cart.map(item =>
        item.productId === product._id
          ? { ...item, cantidad: item.cantidad + quantity }
          : item
      );
    } else {
      newCart = [...cart, {
        productId: product._id,
        nombre: product.nombre,
        precio: product.precio,
        cantidad: quantity,
        imagen: product.imagen,
        stock: product.stock,
      }];
    }
    
    saveCart(newCart);
    toast.success(`${product.nombre} agregado al carrito`);
  };

  const removeFromCart = (productId) => {
    const newCart = cart.filter(item => item.productId !== productId);
    saveCart(newCart);
    toast.success('Producto eliminado del carrito');
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    const newCart = cart.map(item =>
      item.productId === productId
        ? { ...item, cantidad: quantity }
        : item
    );
    saveCart(newCart);
  };

  const clearCart = () => {
    saveCart([]);
    toast.success('Carrito vaciado');
  };

  const getCartTotal = () => {
    return totalPrice;
  };

  return {
    cart,
    totalItems,
    totalPrice,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
  };
};