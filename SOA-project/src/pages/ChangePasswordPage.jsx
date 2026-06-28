//src\pages\ChangePasswordPage.jsx
import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import { Lock, Shield, Key, AlertTriangle, CheckCircle } from 'lucide-react'

const ChangePasswordPage = () => {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const { updatePassword, user } = useAuth()
  const { showSuccess, showError } = useNotification()
  const navigate = useNavigate()
  const location = useLocation()
  const { email, userId } = location.state || {}

  const handlePasswordChange = (e) => {
    const value = e.target.value
    setNewPassword(value)
    
    let strength = 0
    if (value.length >= 6) strength++
    if (value.match(/[a-z]/) && value.match(/[A-Z]/)) strength++
    if (value.match(/[0-9]/)) strength++
    if (value.match(/[^a-zA-Z0-9]/)) strength++
    setPasswordStrength(strength)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!newPassword || !confirmPassword) {
      showError('Completa todos los campos')
      return
    }
    
    if (newPassword !== confirmPassword) {
      showError('Las contraseñas no coinciden')
      return
    }
    
    if (newPassword.length < 6) {
      showError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    
    if (passwordStrength < 3) {
      showError('La contraseña es muy débil. Usa mayúsculas, números y símbolos')
      return
    }
    
    setLoading(true)
    
    const result = await updatePassword(email, userId, newPassword)
    
    if (result.success) {
      showSuccess('Contraseña actualizada exitosamente. Ahora puedes acceder a tu cuenta.')
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } else {
      showError(result.error || 'Error al actualizar la contraseña')
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
    if (passwordStrength === 0) return 'Muy débil'
    if (passwordStrength === 1) return 'Débil'
    if (passwordStrength === 2) return 'Regular'
    if (passwordStrength === 3) return 'Fuerte'
    return 'Muy fuerte'
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8">
      <div className="relative max-w-md w-full">
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 rounded-3xl blur-2xl opacity-30 animate-pulse"></div>
        
        <div className="relative bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-cyan-500/30">
          <div className="text-center mb-6">
            <div className="inline-block p-3 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 mb-4">
              <Shield className="w-10 h-10 text-yellow-400" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              Cambio Obligatorio de Contraseña
            </h1>
            <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-yellow-400 text-sm flex items-center gap-2 justify-center">
                <AlertTriangle size={18} />
                Por políticas de seguridad de la empresa, debes cambiar tu contraseña
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Nueva Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-5 h-5" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={handlePasswordChange}
                  className="input-field pl-10"
                  placeholder="Ingresa tu nueva contraseña"
                  required
                />
              </div>
              {newPassword && (
                <div className="mt-2">
                  <div className="flex gap-1 h-1.5">
                    {[1, 2, 3, 4].map((level) => (
                      <div key={level} className={`flex-1 rounded-full transition-all ${passwordStrength >= level ? getPasswordStrengthColor() : 'bg-gray-700'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Key size={12} className={passwordStrength >= 3 ? 'text-green-400' : 'text-gray-500'} />
                    Fortaleza: {getPasswordStrengthText()}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-5 h-5" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Confirma tu nueva contraseña"
                  required
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <p className="text-xs text-blue-400 flex items-start gap-2">
                <CheckCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  La contraseña debe tener al menos 6 caracteres, incluir mayúsculas, 
                  minúsculas, números y caracteres especiales para mayor seguridad.
                </span>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Actualizando...
                </span>
              ) : (
                'Actualizar Contraseña'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ChangePasswordPage