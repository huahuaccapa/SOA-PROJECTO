// src/services/productService.js
import api from './api'

// Datos simulados
const mockProducts = [
  {
    id: 1,
    nombre: 'Laptop Gamer ASUS ROG',
    descripcion: 'Intel Core i7, 16GB RAM, RTX 3060, 1TB SSD',
    precio: 5499.99,
    stock: 10,
    categoria: 'Laptops',
    imagen: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&h=200&fit=crop',
  },
  {
    id: 2,
    nombre: 'iPhone 15 Pro Max',
    descripcion: '256GB, Titanio Negro, Cámara 48MP',
    precio: 5999.99,
    stock: 15,
    categoria: 'Smartphones',
    imagen: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=200&fit=crop',
  },
  {
    id: 3,
    nombre: 'Sony WH-1000XM5',
    descripcion: 'Audífonos Noise Cancelling, 30hrs batería',
    precio: 1299.99,
    stock: 25,
    categoria: 'Audífonos',
    imagen: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop',
  },
  {
    id: 4,
    nombre: 'Mouse Logitech MX Master 3S',
    descripcion: 'Inalámbrico, Sensor 8K DPI, USB-C',
    precio: 349.99,
    stock: 50,
    categoria: 'Accesorios',
    imagen: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300&h=200&fit=crop',
  },
  {
    id: 5,
    nombre: 'Monitor LG UltraGear 27"',
    descripcion: '144Hz, 1ms, G-Sync Compatible',
    precio: 1899.99,
    stock: 8,
    categoria: 'Monitores',
    imagen: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=300&h=200&fit=crop',
  },
  {
    id: 6,
    nombre: 'Teclado Mecánico Razer BlackWidow',
    descripcion: 'Switches Green, RGB Chroma',
    precio: 449.99,
    stock: 30,
    categoria: 'Accesorios',
    imagen: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&h=200&fit=crop',
  },
]

export const productService = {
  async getAllProducts() {
    // Simulación de API
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...mockProducts])
      }, 300)
    })
  },

  async getProductById(id) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const product = mockProducts.find(p => p.id === parseInt(id))
        resolve(product || null)
      }, 200)
    })
  },

  async createProduct(product) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newProduct = {
          id: mockProducts.length + 1,
          ...product,
        }
        mockProducts.push(newProduct)
        resolve({ success: true, product: newProduct })
      }, 500)
    })
  },

  async updateProduct(id, product) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = mockProducts.findIndex(p => p.id === parseInt(id))
        if (index !== -1) {
          mockProducts[index] = { ...mockProducts[index], ...product }
          resolve({ success: true })
        } else {
          resolve({ success: false, error: 'Producto no encontrado' })
        }
      }, 500)
    })
  },

  async deleteProduct(id) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = mockProducts.findIndex(p => p.id === parseInt(id))
        if (index !== -1) {
          mockProducts.splice(index, 1)
          resolve({ success: true })
        } else {
          resolve({ success: false, error: 'Producto no encontrado' })
        }
      }, 500)
    })
  },
}