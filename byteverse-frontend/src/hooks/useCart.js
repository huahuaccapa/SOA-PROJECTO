import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export const useCart = () => {
  const [cart, setCart] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  // Cargar carrito desde localStorage
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

  // Actualizar totales
  const updateTotals = (cartItems) => {
    const items = cartItems.reduce((acc, item) => acc + (item.cantidad || 0), 0);
    const price = cartItems.reduce((acc, item) => acc + ((item.precio || 0) * (item.cantidad || 0)), 0);
    setTotalItems(items);
    setTotalPrice(price);
  };

  // Guardar carrito
  const saveCart = (newCart) => {
    localStorage.setItem('cart', JSON.stringify(newCart));
    setCart(newCart);
    updateTotals(newCart);
  };

  // ✅ AGREGAR AL CARRITO - ACTUALIZADO
  const addToCart = (product, quantity = 1) => {
    // ✅ Manejar diferentes formatos de ID
    const productId = product._id || product.id || product.productId;
    
    if (!productId) {
      console.error('❌ Producto sin ID:', product);
      toast.error('Error: Producto sin identificador');
      return;
    }

    // Verificar que el producto tenga los datos necesarios
    if (!product.nombre || !product.precio) {
      console.error('❌ Producto incompleto:', product);
      toast.error('Error: Datos del producto incompletos');
      return;
    }

    const existingItem = cart.find(item => item.productId === productId);
    
    let newCart;
    if (existingItem) {
      // Actualizar cantidad
      newCart = cart.map(item =>
        item.productId === productId
          ? { 
              ...item, 
              cantidad: item.cantidad + quantity,
              // ✅ Actualizar campos por si cambiaron
              nombre: product.nombre,
              precio: product.precio,
              imagen: product.imagen || item.imagen,
              stock: product.stock || item.stock,
              vendedorId: product.vendedorId || item.vendedorId
            }
          : item
      );
    } else {
      // ✅ Nuevo item con todos los campos necesarios
      newCart = [...cart, {
        productId: productId,
        nombre: product.nombre,
        precio: product.precio,
        cantidad: quantity,
        imagen: product.imagen || 'https://via.placeholder.com/80x80?text=Producto',
        stock: product.stock || 0,
        vendedorId: product.vendedorId || '',
        vendedorNombre: product.vendedorNombre || ''
      }];
    }
    
    saveCart(newCart);
    toast.success(`${product.nombre} agregado al carrito`);
  };

  // ✅ ELIMINAR DEL CARRITO
  const removeFromCart = (productId) => {
    const newCart = cart.filter(item => item.productId !== productId);
    saveCart(newCart);
    toast.success('Producto eliminado del carrito');
  };

  // ✅ ACTUALIZAR CANTIDAD
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

  // ✅ VACIAR CARRITO
  const clearCart = () => {
    saveCart([]);
    toast.success('Carrito vaciado');
  };

  // ✅ OBTENER TOTAL
  const getCartTotal = () => {
    return totalPrice;
  };

  // ✅ OBTENER ITEMS CON CANTIDADES
  const getCartItems = () => {
    return cart;
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
    getCartItems,
  };
};