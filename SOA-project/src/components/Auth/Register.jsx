import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useNotification } from '../../contexts/NotificationContext'

const Register = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    rol: 'COMPRADOR',
    departamento: '',
    provincia: '',
    distrito: '',
    direccionLinea: '',
    referencia: ''
  })
  const [ubigeos, setUbigeos] = useState(null)
  const [departamentos, setDepartamentos] = useState([])
  const [provincias, setProvincias] = useState([])
  const [distritos, setDistritos] = useState([])
  const [loading, setLoading] = useState(false)
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
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
    
    if (formData.password !== formData.confirmPassword) {
      showError('Las contraseñas no coinciden')
      return
    }
    
    setLoading(true)
    
    const userData = {
      nombre: formData.nombre,
      email: formData.email,
      password: formData.password,
      rol: formData.rol,
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
      showSuccess('¡Registro exitoso! Ahora puedes iniciar sesión')
      navigate('/login')
    } else {
      showError(result.error)
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Crear Cuenta
          </h1>
          <p className="text-gray-600 mt-2">Únete a ByteVerse</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre Completo
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className="input-field"
              placeholder="Juan Pérez"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input-field"
              placeholder="tu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input-field"
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar Contraseña
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="input-field"
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Cuenta
            </label>
            <select
              name="rol"
              value={formData.rol}
              onChange={handleChange}
              className="input-field"
            >
              <option value="COMPRADOR">Comprador</option>
              <option value="VENDEDOR">Vendedor</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Los vendedores pueden publicar productos.</p>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">Dirección de Envío</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departamento
                </label>
                <select
                  value={formData.departamento}
                  onChange={handleDepartamentoChange}
                  className="input-field"
                  required
                >
                  <option value="">Seleccionar</option>
                  {departamentos.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Provincia
                </label>
                <select
                  value={formData.provincia}
                  onChange={handleProvinciaChange}
                  className="input-field"
                  required
                  disabled={!formData.departamento}
                >
                  <option value="">Seleccionar</option>
                  {provincias.map(prov => (
                    <option key={prov} value={prov}>{prov}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Distrito
                </label>
                <select
                  name="distrito"
                  value={formData.distrito}
                  onChange={handleChange}
                  className="input-field"
                  required
                  disabled={!formData.provincia}
                >
                  <option value="">Seleccionar</option>
                  {distritos.map(dist => (
                    <option key={dist} value={dist}>{dist}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección (Calle, Número, Urbanización)
                </label>
                <input
                  type="text"
                  name="direccionLinea"
                  value={formData.direccionLinea}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Av. Siempre Viva 123"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Referencia (Opcional)
                </label>
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

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? 'Registrando...' : 'Crear Cuenta'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600">
          ¿Ya tienes una cuenta?{' '}
          <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register