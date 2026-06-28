//src\services\productService.js
import api from './api'

// Función helper para transformar producto del backend
const transformProduct = (product) => {
  if (!product) return null
  return {
    id: product._id || product.id,
    nombre: product.nombre || product.name,
    descripcion: product.descripcion || '',
    precio: product.precio || product.price || 0,
    stock: product.stock || product.quantity || 0,
    categoria: product.categoria || product.category || '',
    imagen: product.imagen || product.image || 'https://via.placeholder.com/300x200?text=ByteVerse',
    caracteristicas: product.caracteristicas || product.features || [],
    vendedorId: product.vendedorId || product.vendorId || null,
    vendedorNombre: product.vendedorNombre || product.vendorName || '',
    activo: product.activo !== undefined ? product.activo : true,
    tieneIGV: product.tieneIGV !== undefined ? product.tieneIGV : true,
    deliveryGratis: product.deliveryGratis !== undefined ? product.deliveryGratis : false,
    peso: product.peso || '',
    dimensiones: product.dimensiones || '',
    garantia: product.garantia || '12 meses',
    fechaCreacion: product.fechaCreacion || product.createdAt
  }
}

export const productService = {
  async getAllProducts() {
    try {
      console.log('📦 Obteniendo productos...')
      const response = await api.get('/products')
      const products = response.data || []
      return products.map(transformProduct)
    } catch (error) {
      console.error('❌ Error fetching products:', error)
      return []
    }
  },

  async getProductById(id) {
    try {
      const response = await api.get(`/products/${id}`)
      return transformProduct(response.data)
    } catch (error) {
      console.error('❌ Error fetching product:', error)
      return null
    }
  },

  async getProductsByVendor(vendorId) {
    try {
      const response = await api.get(`/products?vendorId=${vendorId}`)
      const products = response.data || []
      return products.map(transformProduct)
    } catch (error) {
      console.error('❌ Error fetching vendor products:', error)
      return []
    }
  },

  async createProduct(productData) {
    try {
      console.log('📦 Creando producto:', productData.nombre)
      const response = await api.post('/products', {
        nombre: productData.nombre,
        descripcion: productData.descripcion,
        precio: parseFloat(productData.precio),
        stock: parseInt(productData.stock),
        categoria: productData.categoria,
        imagen: productData.imagen,
        caracteristicas: productData.caracteristicas || [],
        vendedorId: productData.vendedorId,
        vendedorNombre: productData.vendedorNombre,
        tieneIGV: productData.tieneIGV !== undefined ? productData.tieneIGV : true,
        deliveryGratis: productData.deliveryGratis !== undefined ? productData.deliveryGratis : false,
        peso: productData.peso,
        dimensiones: productData.dimensiones,
        garantia: productData.garantia || '12 meses'
      })
      return { success: true, product: transformProduct(response.data) }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al crear producto'
      }
    }
  },

  async updateProduct(id, productData) {
    try {
      const response = await api.put(`/products/${id}`, productData)
      return { success: true, product: transformProduct(response.data) }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al actualizar producto'
      }
    }
  },

  async deleteProduct(id) {
    try {
      await api.delete(`/products/${id}`)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al eliminar producto'
      }
    }
  },

  async toggleProductActive(id, active) {
    try {
      const response = await api.patch(`/products/${id}/toggle`, { active })
      return { success: true, product: transformProduct(response.data) }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al cambiar estado'
      }
    }
  },

  async requestProductUpdate(id, productData) {
    try {
      const response = await api.post(`/products/${id}/request-update`, productData)
      return { success: true, request: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al solicitar modificación'
      }
    }
  },

  async requestProductDeletion(id, vendorId) {
    try {
      const response = await api.post(`/products/${id}/request-delete`, { vendorId })
      return { success: true, request: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al solicitar eliminación'
      }
    }
  },

  async getVendorRequests(vendorId) {
    try {
      const response = await api.get(`/products/requests?vendorId=${vendorId}`)
      return response.data || []
    } catch (error) {
      console.error('❌ Error fetching vendor requests:', error)
      return []
    }
  },

  async getAllRequests() {
    try {
      const response = await api.get('/products/requests')
      return response.data || []
    } catch (error) {
      console.error('❌ Error fetching all requests:', error)
      return []
    }
  },

  async approveRequest(requestId, approved) {
    try {
      const response = await api.patch(`/products/requests/${requestId}`, { approved })
      return { success: true, request: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al procesar solicitud'
      }
    }
  },

  async getReports(type, vendorId = null) {
    try {
      const url = vendorId 
        ? `/analytics/reports/${type}?vendorId=${vendorId}`
        : `/analytics/reports/${type}`
      const response = await api.get(url)
      return response.data || []
    } catch (error) {
      console.error('❌ Error fetching reports:', error)
      return []
    }
  }
}