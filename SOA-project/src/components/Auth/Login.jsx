import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useNotification } from '../../contexts/NotificationContext'
import { Mail, Lock, Sparkles, Zap, Key, ArrowLeft } from 'lucide-react'
import googleIcon from '../../assets/icono google.png'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [resetStep, setResetStep] = useState(1) // 1: enviar email, 2: verificar código, 3: nueva contraseña
  const [generatedCode, setGeneratedCode] = useState('')
  const { login, loginWithGoogle, requestPasswordReset, verifyResetCode, resetPassword } = useAuth()
  const { showSuccess, showError } = useNotification()
  const navigate = useNavigate()

  useEffect(() => {
    const createParticle = () => {
      const particle = document.createElement('div')
      particle.className = 'particle'
      particle.style.left = Math.random() * 100 + '%'
      particle.style.animationDuration = Math.random() * 3 + 2 + 's'
      particle.style.opacity = Math.random() * 0.5
      document.querySelector('.particles-container')?.appendChild(particle)
      setTimeout(() => particle.remove(), 5000)
    }
    const interval = setInterval(createParticle, 300)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      showError('Por favor completa todos los campos')
      return
    }
    setLoading(true)
    
    const result = await login(email, password)
    
    if (result.success) {
      // Verificar si el usuario necesita cambiar contraseña
      if (result.needPasswordChange) {
        showSuccess('Primero debes cambiar tu contraseña por seguridad')
        navigate('/change-password', { state: { userId: result.userId, email: email } })
      } else {
        showSuccess('¡Bienvenido a ByteVerse! ✨')
        if (result.redirectTo) {
          navigate(result.redirectTo)
        } else {
          navigate('/')
        }
      }
    } else {
      showError(result.error || 'Credenciales incorrectas')
    }
    
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    const result = await loginWithGoogle('google_token_simulado')
    
    if (result.success) {
      showSuccess('Inicio con Google exitoso 🚀')
      navigate('/')
    } else {
      showError('Error al conectar con Google')
    }
    
    setLoading(false)
  }

  const handleSendResetCode = async () => {
    if (!resetEmail) {
      showError('Ingresa tu correo electrónico')
      return
    }
    setLoading(true)
    const result = await requestPasswordReset(resetEmail)
    if (result.success) {
      setGeneratedCode(result.code)
      setResetStep(2)
      showSuccess(`Código enviado a ${resetEmail}. Revisa tu bandeja de entrada.`)
    } else {
      showError(result.error)
    }
    setLoading(false)
  }

  const handleVerifyCode = async () => {
    if (!resetCode) {
      showError('Ingresa el código de verificación')
      return
    }
    setLoading(true)
    const result = await verifyResetCode(resetEmail, resetCode)
    if (result.success) {
      setResetStep(3)
      showSuccess('Código verificado. Ahora puedes cambiar tu contraseña.')
    } else {
      showError(result.error)
    }
    setLoading(false)
  }

  const handleSetNewPassword = async () => {
    if (!newPassword || !confirmNewPassword) {
      showError('Completa todos los campos')
      return
    }
    if (newPassword !== confirmNewPassword) {
      showError('Las contraseñas no coinciden')
      return
    }
    if (newPassword.length < 6) {
      showError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    const result = await resetPassword(resetEmail, newPassword)
    if (result.success) {
      showSuccess('Contraseña actualizada exitosamente. Ahora puedes iniciar sesión.')
      setShowForgotPassword(false)
      setResetStep(1)
      setResetEmail('')
      setResetCode('')
      setNewPassword('')
      setConfirmNewPassword('')
    } else {
      showError(result.error)
    }
    setLoading(false)
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center relative">
        <div className="particles-container fixed inset-0 pointer-events-none"></div>
        
        <div className="relative animate-float">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 rounded-3xl blur-2xl opacity-30 animate-pulse"></div>
          
          <div className="relative bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 max-w-md w-full border border-cyan-500/30">
            <div className="text-center mb-6">
              <div className="inline-block p-3 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 mb-4">
                <Key className="w-10 h-10 text-cyan-400" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Recuperar Contraseña
              </h1>
              <p className="text-gray-400 mt-2 text-sm">Te ayudaremos a restablecer tu contraseña</p>
            </div>

            {resetStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-5 h-5" />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="input-field pl-10"
                      placeholder="tu@email.com"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Te enviaremos un código de verificación a tu correo
                  </p>
                </div>
                <button
                  onClick={handleSendResetCode}
                  disabled={loading}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Enviar Código'}
                </button>
                <button
                  onClick={() => {
                    setShowForgotPassword(false)
                    setResetStep(1)
                  }}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={18} />
                  Volver al inicio de sesión
                </button>
              </div>
            )}

            {resetStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Código de Verificación
                  </label>
                  <input
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    className="input-field text-center text-2xl tracking-widest"
                    placeholder="000000"
                    maxLength="6"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Ingresa el código de 6 dígitos que enviamos a {resetEmail}
                  </p>
                </div>
                <button
                  onClick={handleVerifyCode}
                  disabled={loading}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {loading ? 'Verificando...' : 'Verificar Código'}
                </button>
                <button
                  onClick={() => setResetStep(1)}
                  className="text-cyan-400 text-sm hover:underline text-center w-full"
                >
                  ¿No recibiste el código? Reenviar
                </button>
              </div>
            )}

            {resetStep === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-5 h-5" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input-field pl-10"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Confirmar Nueva Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-5 h-5" />
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="input-field pl-10"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSetNewPassword}
                  disabled={loading}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center relative">
      <div className="particles-container fixed inset-0 pointer-events-none"></div>
      
      <div className="relative animate-float">
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 rounded-3xl blur-2xl opacity-30 animate-pulse"></div>
        
        <div className="relative bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 max-w-md w-full border border-cyan-500/30 transform transition-all duration-500 hover:scale-105">
          <div className="text-center mb-8">
            <div className="inline-block p-3 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 mb-4 animate-pulse-glow">
              <Zap className="w-10 h-10 text-cyan-400" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
              ByteVerse
            </h1>
            <p className="text-gray-400 mt-2">Accede al futuro de la tecnología</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="transform transition-all duration-300" style={{ transform: focusedField === 'email' ? 'translateY(-2px)' : 'none' }}>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  className="input-field pl-10"
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </div>

            <div className="transform transition-all duration-300" style={{ transform: focusedField === 'password' ? 'translateY(-2px)' : 'none' }}>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-5 h-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className="input-field pl-10"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Accediendo...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Iniciar Sesión
                  </>
                )}
              </span>
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-cyan-500/30"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gradient-to-br from-gray-900 to-gray-800 text-gray-400">O continúa con</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-cyan-500/30 transition-all duration-300 hover:scale-105"
          >
            <img src={googleIcon} alt="Google" className="w-5 h-5" />
            <span>Continuar con Google</span>
          </button>

          <p className="text-center mt-6 text-sm text-gray-400">
            ¿No tienes una cuenta?{' '}
            <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-medium transition-all hover:glow">
              Regístrate aquí
            </Link>
          </p>

          <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
            <p className="text-xs text-cyan-400 mb-2 flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Credenciales de prueba:
            </p>
            <div className="space-y-1 text-xs text-gray-400">
              <p className="flex justify-between">
                <span>👤 Comprador:</span>
                <code className="text-cyan-400">user@byteverse.com / 123456</code>
              </p>
              <p className="flex justify-between">
                <span>👑 Administrador:</span>
                <code className="text-purple-400">admin@byteverse.com / 123456</code>
              </p>
              <p className="flex justify-between">
                <span>🏪 Vendedor:</span>
                <code className="text-blue-400">vendedor@byteverse.com / 123456</code>
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Los vendedores son creados exclusivamente por el administrador
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes glow {
          0%, 100% { text-shadow: 0 0 5px #00d4ff, 0 0 10px #00d4ff; }
          50% { text-shadow: 0 0 20px #00d4ff, 0 0 30px #7b2ff7; }
        }
        .glow:hover {
          animation: glow 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

export default Login