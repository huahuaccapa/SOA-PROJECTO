// frontend/src/services/api.js
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173'

// Crear instancia de axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
  withCredentials: false,
})

// Log para depuración
console.log('🔗 API URL:', API_URL)
console.log('🔗 FRONTEND URL:', FRONTEND_URL)

// Interceptor para añadir token JWT a todas las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`, config.data || '')
    return config
  },
  (error) => {
    console.error('❌ Request Error:', error)
    return Promise.reject(error)
  }
)

// ✅ INTERCEPTOR CORREGIDO - Redirige al FRONTEND correctamente
api.interceptors.response.use(
  (response) => {
    console.log(`📥 ${response.status} ${response.config.url}`, response.data)
    return response
  },
  (error) => {
    // Manejar errores de autenticación (401)
    if (error.response?.status === 401) {
      console.warn('🔒 Token expirado o inválido')
      localStorage.removeItem('jwt')
      localStorage.removeItem('user')
      
      // ✅ CORREGIDO: Redirigir al FRONTEND, no al backend
      if (!window.location.pathname.includes('/login')) {
        // Usar la URL completa del frontend
        window.location.href = `${FRONTEND_URL}/login`
      }
    }
    
    // Manejar errores de red
    if (!error.response) {
      console.error('❌ Error de red:', error.message)
      return Promise.reject({ 
        success: false, 
        error: 'Error de conexión con el servidor. ¿Está el backend corriendo en el puerto 3000?' 
      })
    }
    
    console.error('❌ Response Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export default api