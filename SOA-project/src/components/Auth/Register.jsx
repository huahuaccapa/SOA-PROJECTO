//src\components\Auth\Register.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useNotification } from '../../contexts/NotificationContext'
import { User, Mail, Lock, MapPin, Home, Sparkles, CheckCircle, XCircle, ShoppingBag } from 'lucide-react'

const Register = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    departamento: '',
    provincia: '',
    distrito: '',
    direccionLinea: '',
    referencia: ''
  })
  const [errors, setErrors] = useState({})
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [ubigeos, setUbigeos] = useState(null)
  const [departamentos, setDepartamentos] = useState([])
  const [provincias, setProvincias] = useState([])
  const [distritos, setDistritos] = useState([])
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const { register } = useAuth()
  const { showSuccess, showError } = useNotification()
  const navigate = useNavigate()

  useEffect(() => {
    const loadUbigeos = async () => {
      try {
        const response = await fetch('https://free.e-api.net.pe/ubigeos.json')
        const data = await response.json()
        setUbigeos(data)
        const deps = Object.keys(data).sort()
        setDepartamentos(deps)
      } catch (error) {
        console.error('Error loading ubigeos:', error)
        showError('No se pudo cargar la lista de ubicaciones')
      }
    }
    loadUbigeos()
  }, [])

  useEffect(() => {
    let strength = 0
    if (formData.password.length >= 6) strength++
    if (formData.password.match(/[a-z]/) && formData.password.match(/[A-Z]/)) strength++
    if (formData.password.match(/[0-9]/)) strength++
    if (formData.password.match(/[^a-zA-Z0-9]/)) strength++
    setPasswordStrength(strength)
  }, [formData.password])

  const validateField = (name, value) => {
    const newErrors = { ...errors }
    switch (name) {
      case 'nombre':
        if (!value.trim()) newErrors.nombre = 'El nombre es requerido'
        else if (value.length < 3) newErrors.nombre = 'Mínimo 3 caracteres'
        else delete newErrors.nombre
        break
      case 'email':
        if (!value) newErrors.email = 'El email es requerido'
        else if (!/\S+@\S+\.\S+/.test(value)) newErrors.email = 'Email inválido'
        else delete newErrors.email
        break
      case 'password':
        if (!value) newErrors.password = 'La contraseña es requerida'
        else if (value.length < 6) newErrors.password = 'Mínimo 6 caracteres'
        else if (passwordStrength < 3) newErrors.password = 'Contraseña débil'
        else delete newErrors.password
        break
      case 'confirmPassword':
        if (value !== formData.password) newErrors.confirmPassword = 'Las contraseñas no coinciden'
        else delete newErrors.confirmPassword
        break
      default:
        break
    }
    setErrors(newErrors)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    validateField(name, value)
  }

  const handleDepartamentoChange = (e) => {
    const dept = e.target.value
    setFormData({ ...formData, departamento: dept, provincia: '', distrito: '' })
    if (dept && ubigeos[dept]) {
      const provs = Object.keys(ubigeos[dept]).sort()
      setProvincias(provs)
      setDistritos([])
    } else {
      setProvincias([])
      setDistritos([])
    }
  }

  const handleProvinciaChange = (e) => {
    const prov = e.target.value
    setFormData({ ...formData, provincia: prov, distrito: '' })
    if (prov && formData.departamento && ubigeos[formData.departamento][prov]) {
      const dists = Object.keys(ubigeos[formData.departamento][prov]).sort()
      setDistritos(dists)
    } else {
      setDistritos([])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const requiredFields = ['nombre', 'email', 'password', 'confirmPassword', 'departamento', 'provincia', 'distrito', 'direccionLinea']
    let hasError = false
    requiredFields.forEach(field => {
      if (!formData[field]) {
        setErrors(prev => ({ ...prev, [field]: 'Campo requerido' }))
        hasError = true
      }
    })
    
    if (formData.password !== formData.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Las contraseñas no coinciden' }))
      hasError = true
    }
    
    if (hasError) {
      showError('Por favor completa todos los campos requeridos')
      return
    }
    
    setLoading(true)
    
    const userData = {
      nombre: formData.nombre,
      email: formData.email,
      password: formData.password,
      rol: 'COMPRADOR',
      direccion: {
        departamento: formData.departamento,
        provincia: formData.provincia,
        distrito: formData.distrito,
        linea: formData.direccionLinea,
        referencia: formData.referencia
      }
    }
    
    const result = await register(userData)
    
    if (result.success) {
      showSuccess('¡Registro exitoso! 🎉 Ahora puedes iniciar sesión como comprador')
      setTimeout(() => navigate('/login'), 1500)
    } else {
      showError(result.error || 'Error al registrar usuario')
    }
    
    setLoading(false)
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return 'bg-gray-600'
    if (passwordStrength === 1) return 'bg-red-500'
    if (passwordStrength === 2) return 'bg-yellow-500'
    if (passwordStrength === 3) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getPasswordStrengthText = () => {
    if (passwordStrength === 0) return 'Sin contraseña'
    if (passwordStrength === 1) return 'Muy débil'
    if (passwordStrength === 2) return 'Débil'
    if (passwordStrength === 3) return 'Fuerte'
    return 'Muy fuerte'
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8">
      <div className="relative max-w-md w-full">
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 rounded-3xl blur-2xl opacity-30 animate-pulse"></div>
        
        <div className="relative bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto custom-scrollbar border border-cyan-500/30">
          <div className="text-center mb-6">
            <div className="inline-block p-3 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 mb-3">
              <ShoppingBag className="w-8 h-8 text-cyan-400" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Crear Cuenta
            </h1>
            <p className="text-gray-400 text-sm mt-1">Únete como comprador a ByteVerse</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="transform transition-all duration-300" style={{ transform: focusedField === 'nombre' ? 'translateY(-2px)' : 'none' }}>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Nombre Completo <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4" />
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('nombre')}
                  onBlur={() => setFocusedField(null)}
                  className={`input-field pl-9 ${errors.nombre ? 'border-red-500' : ''}`}
                  placeholder="Juan Pérez"
                />
              </div>
              {errors.nombre && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><XCircle size={12} /> {errors.nombre}</p>}
            </div>

            <div className="transform transition-all duration-300" style={{ transform: focusedField === 'email' ? 'translateY(-2px)' : 'none' }}>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Correo Electrónico <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  className={`input-field pl-9 ${errors.email ? 'border-red-500' : ''}`}
                  placeholder="tu@email.com"
                />
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><XCircle size={12} /> {errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Contraseña <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`input-field pl-9 ${errors.password ? 'border-red-500' : ''}`}
                  placeholder="••••••••"
                />
              </div>
              {formData.password && (
                <div className="mt-2">
                  <div className="flex gap-1 h-1.5">
                    {[1, 2, 3, 4].map((level) => (
                      <div key={level} className={`flex-1 rounded-full transition-all ${passwordStrength >= level ? getPasswordStrengthColor() : 'bg-gray-700'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <CheckCircle size={12} className={passwordStrength >= 3 ? 'text-green-400' : 'text-gray-500'} />
                    Fortaleza: {getPasswordStrengthText()}
                  </p>
                </div>
              )}
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Confirmar Contraseña <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`input-field pl-9 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                  placeholder="••••••••"
                />
              </div>
              {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>

            <div className="border-t border-cyan-500/20 pt-3">
              <h3 className="font-medium mb-2 text-cyan-400 flex items-center gap-2">
                <MapPin size={16} />
                Dirección de Envío
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Departamento <span className="text-red-400">*</span></label>
                  <select
                    value={formData.departamento}
                    onChange={handleDepartamentoChange}
                    className="input-field"
                  >
                    <option value="">Seleccionar</option>
                    {departamentos.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Provincia <span className="text-red-400">*</span></label>
                  <select
                    value={formData.provincia}
                    onChange={handleProvinciaChange}
                    className="input-field"
                    disabled={!formData.departamento}
                  >
                    <option value="">Seleccionar</option>
                    {provincias.map(prov => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Distrito <span className="text-red-400">*</span></label>
                  <select
                    name="distrito"
                    value={formData.distrito}
                    onChange={handleChange}
                    className="input-field"
                    disabled={!formData.provincia}
                  >
                    <option value="">Seleccionar</option>
                    {distritos.map(dist => (
                      <option key={dist} value={dist}>{dist}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Dirección <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4" />
                    <input
                      type="text"
                      name="direccionLinea"
                      value={formData.direccionLinea}
                      onChange={handleChange}
                      className="input-field pl-9"
                      placeholder="Av. Siempre Viva 123"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Referencia (Opcional)</label>
                  <input
                    type="text"
                    name="referencia"
                    value={formData.referencia}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Cerca al parque principal"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <p className="text-xs text-blue-400 flex items-start gap-2">
                <Sparkles size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  Al registrarte, crearás una cuenta de <strong className="text-cyan-400">COMPRADOR</strong>. 
                  Si deseas ser <strong className="text-purple-400">VENDEDOR</strong>, contacta al administrador después de registrarte.
                </span>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 disabled:opacity-50 group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Registrando...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Crear Cuenta de Comprador
                  </>
                )}
              </span>
            </button>
          </form>

          <p className="text-center mt-4 text-sm text-gray-400">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-all">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register