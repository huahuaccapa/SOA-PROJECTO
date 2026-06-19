import api from './api'

export const productService = {
  // Obtener todos los productos
  async getAllProducts() {
    try {
      console.log('📦 Obteniendo productos...')
      const response = await api.get('/products')
      console.log(`✅ ${response.data.length} productos obtenidos`)
      return response.data
    } catch (error) {
      console.error('❌ Error fetching products:', error)
      return []
    }
  },

  // Obtener producto por ID
  async getProductById(id) {
    try {
      const response = await api.get(`/products/${id}`)
      return response.data
    } catch (error) {
      console.error('❌ Error fetching product:', error)
      return null
    }
  },

  // Obtener productos por vendedor
  async getProductsByVendor(vendorId) {
    try {
      const response = await api.get(`/products/vendor/${vendorId}`)
      return response.data
    } catch (error) {
      console.error('❌ Error fetching vendor products:', error)
      return []
    }
  },

  // Crear producto
  async createProduct(productData) {
    try {
      console.log('📦 Creando producto:', productData.nombre)
      const response = await api.post('/products', productData)
      console.log('✅ Producto creado:', response.data)
      return response.data
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al crear producto'
      }
    }
  },

  // Actualizar producto
  async updateProduct(id, productData) {
    try {
      const response = await api.put(`/products/${id}`, productData)
      return response.data
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al actualizar producto'
      }
    }
  },

  // Eliminar producto
  async deleteProduct(id) {
    try {
      const response = await api.delete(`/products/${id}`)
      return response.data
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al eliminar producto'
      }
    }
  },

  // Activar/Desactivar producto
  async toggleProductActive(id, active) {
    try {
      const response = await api.patch(`/products/${id}/toggle`, { active })
      return response.data
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al cambiar estado'
      }
    }
  },

  // Solicitar modificación de producto (VENDEDOR)
  async requestProductUpdate(id, productData) {
    try {
      const response = await api.post(`/products/${id}/request-update`, productData)
      return response.data
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al solicitar modificación'
      }
    }
  },

  // Solicitar eliminación de producto (VENDEDOR)
  async requestProductDeletion(id, vendorId) {
    try {
      const response = await api.post(`/products/${id}/request-delete`, { vendorId })
      return response.data
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al solicitar eliminación'
      }
    }
  },

  // Obtener solicitudes de un vendedor
  async getVendorRequests(vendorId) {
    try {
      const response = await api.get(`/products/requests/vendor/${vendorId}`)
      return response.data
    } catch (error) {
      console.error('❌ Error fetching vendor requests:', error)
      return []
    }
  },

  // Obtener todas las solicitudes (ADMIN)
  async getAllRequests() {
    try {
      const response = await api.get('/products/requests')
      return response.data
    } catch (error) {
      console.error('❌ Error fetching all requests:', error)
      return []
    }
  },

  // Aprobar/Rechazar solicitud (ADMIN)
  async approveRequest(requestId, approved) {
    try {
      const response = await api.patch(`/products/requests/${requestId}`, { approved })
      return response.data
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al procesar solicitud'
      }
    }
  },

  // Obtener reportes
  async getReports(type, vendorId = null) {
    try {
      const url = vendorId 
        ? `/analytics/reports/${type}?vendorId=${vendorId}`
        : `/analytics/reports/${type}`
      const response = await api.get(url)
      return response.data
    } catch (error) {
      console.error('❌ Error fetching reports:', error)
      return []
    }
  },

  // Registrar venta
  async registerSale(saleData) {
    try {
      const response = await api.post('/analytics/sales', saleData)
      return response.data
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al registrar venta'
      }
    }
  },

  // Obtener historial de ventas
  async getSalesHistory(vendorId = null) {
    try {
      const url = vendorId 
        ? `/analytics/sales?vendorId=${vendorId}`
        : '/analytics/sales'
      const response = await api.get(url)
      return response.data
    } catch (error) {
      console.error('❌ Error fetching sales history:', error)
      return []
    }
  }
}