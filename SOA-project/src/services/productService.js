// src/services/productService.js
import api from './api'

let mockProducts = [
  {
    id: 1,
    nombre: 'Laptop Gamer ASUS ROG Strix G16',
    descripcion: 'Potente laptop gamer con Intel Core i7-13650HX, 16GB RAM DDR5, RTX 4060 8GB, 1TB SSD NVMe, pantalla 16" 165Hz',
    precio: 5499.99,
    stock: 10,
    categoria: 'Laptops',
    imagen: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&h=200&fit=crop',
    caracteristicas: [
      'Procesador Intel Core i7-13650HX',
      '16GB RAM DDR5 4800MHz',
      'NVIDIA RTX 4060 8GB',
      '1TB SSD NVMe Gen4',
      'Pantalla 16" WUXGA 165Hz',
      'Teclado RGB Retroiluminado'
    ],
    activo: true,
    vendedorId: 3,
    vendedorNombre: 'TechStore Perú',
    fechaCreacion: '2024-01-15T10:00:00',
    tieneIGV: true,
    deliveryGratis: true,
    peso: 2.5,
    dimensiones: '35.4 x 25.9 x 2.3 cm',
    garantia: '12 meses'
  },
  {
    id: 2,
    nombre: 'iPhone 15 Pro Max 256GB',
    descripcion: 'El iPhone más avanzado con titanio, cámara 48MP, chip A17 Pro, 256GB de almacenamiento, batería para todo el día',
    precio: 5999.99,
    stock: 15,
    categoria: 'Smartphones',
    imagen: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=200&fit=crop',
    caracteristicas: [
      'Pantalla 6.7" Super Retina XDR',
      'Chip A17 Pro',
      'Cámara principal 48MP',
      'Cámara zoom 12MP 5x',
      'Batería para todo el día',
      'USB-C 3.0'
    ],
    activo: true,
    vendedorId: 4,
    vendedorNombre: 'GamerWorld',
    fechaCreacion: '2024-01-20T14:30:00',
    tieneIGV: true,
    deliveryGratis: false,
    peso: 0.5,
    dimensiones: '16 x 7.8 x 0.8 cm',
    garantia: '12 meses'
  },
  {
    id: 3,
    nombre: 'Sony WH-1000XM5',
    descripcion: 'Audífonos con cancelación de ruido líder en la industria, 30 horas de batería, carga rápida, calidad de audio excepcional',
    precio: 1299.99,
    stock: 25,
    categoria: 'Audífonos',
    imagen: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop',
    caracteristicas: [
      'Cancelación de ruido avanzada',
      '30 horas de batería',
      'Carga rápida 3 min = 3 horas',
      'Bluetooth 5.2',
      'Auriculares de diadema',
      'Control por gestos'
    ],
    activo: true,
    vendedorId: 3,
    vendedorNombre: 'TechStore Perú',
    fechaCreacion: '2024-01-25T09:00:00',
    tieneIGV: true,
    deliveryGratis: true,
    peso: 0.3,
    dimensiones: '17 x 8.5 x 4 cm',
    garantia: '6 meses'
  },
  {
    id: 4,
    nombre: 'Mouse Logitech MX Master 3S',
    descripcion: 'Mouse inalámbrico premium con sensor 8K DPI, scroll electromagnético, USB-C, batería de 70 días',
    precio: 349.99,
    stock: 50,
    categoria: 'Accesorios',
    imagen: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300&h=200&fit=crop',
    caracteristicas: [
      'Sensor 8K DPI',
      'Conexión Bluetooth y USB',
      'Batería recargable 70 días',
      '7 botones programables',
      'Scroll electromagnético',
      'Compatible con iPad'
    ],
    activo: true,
    vendedorId: 4,
    vendedorNombre: 'GamerWorld',
    fechaCreacion: '2024-02-01T11:30:00',
    tieneIGV: true,
    deliveryGratis: false,
    peso: 0.2,
    dimensiones: '12.5 x 8.5 x 4.5 cm',
    garantia: '12 meses'
  },
  {
    id: 5,
    nombre: 'Monitor LG UltraGear 27" QHD',
    descripcion: 'Monitor gaming 27" QHD, 165Hz, 1ms, G-Sync Compatible, HDR10, color calibrado de fábrica',
    precio: 1899.99,
    stock: 8,
    categoria: 'Monitores',
    imagen: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=300&h=200&fit=crop',
    caracteristicas: [
      'Pantalla 27" IPS QHD',
      '165Hz refresh rate',
      '1ms respuesta',
      'G-Sync compatible',
      'HDR10',
      'Calibración de fábrica'
    ],
    activo: true,
    vendedorId: 3,
    vendedorNombre: 'TechStore Perú',
    fechaCreacion: '2024-02-05T16:45:00',
    tieneIGV: true,
    deliveryGratis: false,
    peso: 5.5,
    dimensiones: '61.5 x 44.5 x 20.5 cm',
    garantia: '24 meses'
  },
  {
    id: 6,
    nombre: 'Teclado Mecánico Razer BlackWidow V4',
    descripcion: 'Teclado mecánico con switches Razer Yellow, RGB Chroma, reposamuñecas magnético, USB passthrough',
    precio: 449.99,
    stock: 30,
    categoria: 'Accesorios',
    imagen: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&h=200&fit=crop',
    caracteristicas: [
      'Switches Razer Yellow',
      'RGB Chroma configurable',
      'Reposamuñecas magnético',
      'USB 3.0 passthrough',
      'Construcción robusta',
      'Acero y plástico premium'
    ],
    activo: true,
    vendedorId: 4,
    vendedorNombre: 'GamerWorld',
    fechaCreacion: '2024-02-10T08:20:00',
    tieneIGV: true,
    deliveryGratis: true,
    peso: 1.2,
    dimensiones: '44 x 15 x 3.5 cm',
    garantia: '12 meses'
  }
]

let vendorRequests = []
let salesHistory = []

export const productService = {
  // Obtener todos los productos
  async getAllProducts() {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...mockProducts]), 300)
    })
  },

  // Obtener producto por ID
  async getProductById(id) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const product = mockProducts.find(p => p.id === parseInt(id))
        resolve(product || null)
      }, 200)
    })
  },

  // Obtener productos por vendedor
  async getProductsByVendor(vendorId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const products = mockProducts.filter(p => p.vendedorId === parseInt(vendorId))
        resolve([...products])
      }, 300)
    })
  },

  // Crear producto (ADMIN o VENDEDOR)
  async createProduct(product) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newProduct = {
          id: mockProducts.length + 1,
          ...product,
          fechaCreacion: new Date().toISOString(),
          activo: product.activo !== undefined ? product.activo : true
        }
        mockProducts.push(newProduct)
        resolve({ success: true, product: newProduct })
      }, 500)
    })
  },

  // Actualizar producto
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

  // Eliminar producto (solo ADMIN)
  async deleteProduct(id) {
    return new Promise((resolve) => {
      const index = mockProducts.findIndex(p => p.id === parseInt(id))
      if (index !== -1) {
        mockProducts.splice(index, 1)
        resolve({ success: true })
      } else {
        resolve({ success: false, error: 'Producto no encontrado' })
      }
    })
  },

  // Activar/Desactivar producto
  async toggleProductActive(id, active) {
    return new Promise((resolve) => {
      const index = mockProducts.findIndex(p => p.id === parseInt(id))
      if (index !== -1) {
        mockProducts[index].activo = active
        resolve({ success: true })
      } else {
        resolve({ success: false, error: 'Producto no encontrado' })
      }
    })
  },

  // Solicitud de modificación (VENDEDOR)
  async requestProductUpdate(id, productData) {
    return new Promise((resolve) => {
      const newRequest = {
        id: vendorRequests.length + 1,
        productoId: parseInt(id),
        productoNombre: productData.nombre,
        tipo: 'MODIFICACION',
        datos: productData,
        estado: 'PENDIENTE',
        fecha: new Date().toISOString(),
        vendedorId: productData.vendedorId
      }
      vendorRequests.push(newRequest)
      resolve({ success: true, request: newRequest })
    })
  },

  // Solicitud de eliminación (VENDEDOR)
  async requestProductDeletion(id, vendorId) {
    return new Promise((resolve) => {
      const product = mockProducts.find(p => p.id === parseInt(id))
      const newRequest = {
        id: vendorRequests.length + 1,
        productoId: parseInt(id),
        productoNombre: product?.nombre,
        tipo: 'ELIMINACION',
        estado: 'PENDIENTE',
        fecha: new Date().toISOString(),
        vendedorId: vendorId
      }
      vendorRequests.push(newRequest)
      resolve({ success: true, request: newRequest })
    })
  },

  // Obtener solicitudes de vendedor
  async getVendorRequests(vendorId) {
    return new Promise((resolve) => {
      const myRequests = vendorRequests.filter(r => r.vendedorId === vendorId)
      resolve(myRequests)
    })
  },

  // Obtener todas las solicitudes (ADMIN)
  async getAllRequests() {
    return new Promise((resolve) => {
      resolve([...vendorRequests])
    })
  },

  // Aprobar/Rechazar solicitud (ADMIN)
  async approveRequest(requestId, approved) {
    return new Promise((resolve) => {
      const index = vendorRequests.findIndex(r => r.id === parseInt(requestId))
      if (index !== -1) {
        vendorRequests[index].estado = approved ? 'APROBADA' : 'RECHAZADA'
        if (approved && vendorRequests[index].tipo === 'ELIMINACION') {
          // Eliminar producto si es una solicitud de eliminación
          const prodIndex = mockProducts.findIndex(p => p.id === vendorRequests[index].productoId)
          if (prodIndex !== -1) {
            mockProducts.splice(prodIndex, 1)
          }
        } else if (approved && vendorRequests[index].tipo === 'MODIFICACION') {
          // Actualizar producto si es una solicitud de modificación
          const prodIndex = mockProducts.findIndex(p => p.id === vendorRequests[index].productoId)
          if (prodIndex !== -1) {
            mockProducts[prodIndex] = { 
              ...mockProducts[prodIndex], 
              ...vendorRequests[index].datos 
            }
          }
        }
        resolve({ success: true })
      } else {
        resolve({ success: false, error: 'Solicitud no encontrada' })
      }
    })
  },

  // Registrar venta
  async registerSale(saleData) {
    return new Promise((resolve) => {
      const newSale = {
        id: salesHistory.length + 1,
        ...saleData,
        fecha: new Date().toISOString(),
        estado: 'COMPLETADO'
      }
      salesHistory.push(newSale)
      
      // Actualizar stock
      saleData.productos.forEach(item => {
        const product = mockProducts.find(p => p.id === item.id)
        if (product) {
          product.stock -= item.cantidad
        }
      })
      
      resolve({ success: true, sale: newSale })
    })
  },

  // Obtener historial de ventas
  async getSalesHistory(vendorId = null) {
    return new Promise((resolve) => {
      let sales = [...salesHistory]
      if (vendorId) {
        sales = sales.filter(s => s.vendedorId === parseInt(vendorId))
      }
      resolve(sales)
    })
  },

  // Obtener reportes
  async getReports(type, vendorId = null) {
    return new Promise((resolve) => {
      let sales = [...salesHistory]
      if (vendorId) {
        sales = sales.filter(s => s.vendedorId === parseInt(vendorId))
      }
      
      let report = {}
      switch(type) {
        case 'VENTAS_POR_VENDEDOR':
          const vendorSales = {}
          sales.forEach(s => {
            const key = s.vendedorId
            if (!vendorSales[key]) {
              vendorSales[key] = {
                vendedorId: s.vendedorId,
                vendedorNombre: s.vendedorNombre,
                totalVentas: 0,
                cantidadVentas: 0
              }
            }
            vendorSales[key].totalVentas += s.total
            vendorSales[key].cantidadVentas += 1
          })
          report = Object.values(vendorSales)
          break
        case 'VENTAS_POR_MES':
          const monthlySales = {}
          sales.forEach(s => {
            const month = s.fecha.substring(0, 7)
            if (!monthlySales[month]) {
              monthlySales[month] = { mes: month, total: 0, ventas: 0 }
            }
            monthlySales[month].total += s.total
            monthlySales[month].ventas += 1
          })
          report = Object.values(monthlySales)
          break
        case 'PRODUCTOS_POPULARES':
          const productCount = {}
          sales.forEach(s => {
            s.productos.forEach(p => {
              const key = p.id
              if (!productCount[key]) {
                productCount[key] = { 
                  productoId: p.id,
                  productoNombre: p.nombre,
                  cantidadVendida: 0,
                  totalRecaudado: 0
                }
              }
              productCount[key].cantidadVendida += p.cantidad
              productCount[key].totalRecaudado += p.precio * p.cantidad
            })
          })
          report = Object.values(productCount).sort((a, b) => b.cantidadVendida - a.cantidadVendida)
          break
        default:
          report = sales
      }
      resolve(report)
    })
  }
}