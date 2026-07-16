import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRightIcon, CheckCircleIcon, EnvelopeIcon, EyeIcon, EyeSlashIcon, LockClosedIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
    <path fill="#FBBC05" d="M5.84 14.09A6.5 6.5 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l2.85-2.22.81-.62Z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" />
  </svg>
);

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const googleButtonRef = useRef(null);
  const { login, googleLogin, renderGoogleButton, getDashboardPath, changePassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleButtonReady, setGoogleButtonReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordChangeEmail, setPasswordChangeEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const redirectAfterLogin = (user) => {
    const fallback = location.state?.from?.pathname || '/';
    navigate(getDashboardPath(user, fallback), { replace: true });
  };

  useEffect(() => {
    let mounted = true;

    renderGoogleButton(
      googleButtonRef.current,
      (googleUser) => {
        if (!mounted) return;
        setGoogleLoading(false);
        redirectAfterLogin(googleUser);
      },
      (error) => {
        if (!mounted) return;
        setGoogleLoading(false);
        console.warn('Google button:', error);
        if (error) toast.error(error, { id: 'google-login-error' });
      },
    ).then((rendered) => {
      if (mounted) setGoogleButtonReady(Boolean(rendered));
    });

    return () => {
      mounted = false;
    };
  }, [renderGoogleButton]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    const result = await login(formData.email, formData.password);
    if (result.success) {
      redirectAfterLogin(result.user);
    } else if (result.needPasswordChange || result.code === 'PASSWORD_CHANGE_REQUIRED') {
      setPasswordChangeEmail(result.email || formData.email);
      setShowChangePassword(true);
      toast.error(result.error || 'Por seguridad debes cambiar tu contraseña antes de ingresar.');
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };


  const handleChangePassword = async (event) => {
    event.preventDefault();
    if (newPassword.length < 6) return toast.error('La nueva contraseña debe tener al menos 6 caracteres');
    if (newPassword !== confirmNewPassword) return toast.error('Las contraseñas no coinciden');
    setLoading(true);
    const result = await changePassword(passwordChangeEmail, newPassword);
    setLoading(false);
    if (result.success) {
      setShowChangePassword(false);
      setFormData({ email: passwordChangeEmail, password: '' });
      setNewPassword('');
      setConfirmNewPassword('');
    } else {
      toast.error(result.error);
    }
  };


  const handleForgotPassword = async (event) => {
    event.preventDefault(); setLoading(true);
    try { const {data}=await api.post('/auth/forgot-password',{email:forgotEmail}); toast.success(data.message); setShowForgot(false); }
    catch(error){ toast.error(error.response?.data?.error || 'No se pudo enviar el correo'); }
    finally { setLoading(false); }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const returnTo = location.state?.from?.pathname || '/';
    const result = await googleLogin(returnTo);
    if (!result.success) toast.error(result.error);
    // En modo redirect la página cambiará; en GIS se devuelve el usuario autenticado.
    if (result.success && result.user) redirectAfterLogin(result.user);
    if (!result.redirecting) setGoogleLoading(false);
  };

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="auth-story-inner">
          <Link to="/" className="auth-brand"><span className="brand-mark"><span>B</span></span><span className="brand-name">Byte<span>Verse</span></span></Link>
          <div className="auth-story-copy">
            <span className="auth-kicker">TU CUENTA, TU UNIVERSO</span>
            <h1>Vuelve a lo que te inspira.</h1>
            <p>Tu carrito, pedidos y productos favoritos te están esperando.</p>
            <ul>
              <li><CheckCircleIcon /> Compra y consulta tus pedidos</li>
              <li><CheckCircleIcon /> Accede según tu perfil de usuario</li>
              <li><CheckCircleIcon /> Mantén tus datos protegidos</li>
            </ul>
          </div>
          <div className="auth-security"><ShieldCheckIcon /><span><strong>Acceso seguro</strong><small>Protegemos tu información</small></span></div>
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-card">
          <div className="auth-heading"><span className="mobile-auth-logo">B</span><h2>Bienvenido de vuelta</h2><p>Ingresa tus datos para continuar en ByteVerse.</p></div>

          <div className="google-official-button" ref={googleButtonRef} aria-label="Continuar con Google" />

          {!googleButtonReady && (
            <button type="button" className="google-button" onClick={handleGoogleLogin} disabled={googleLoading}>
              <GoogleIcon /><span>{googleLoading ? 'Conectando con Google...' : 'Continuar con Google'}</span>
            </button>
          )}

          <div className="auth-divider"><span>o continúa con tu correo</span></div>
          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              <span>Correo electrónico</span>
              <div className="auth-input-wrap"><EnvelopeIcon /><input type="email" name="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required autoComplete="email" placeholder="nombre@correo.com" /></div>
            </label>
            <label>
              <span>Contraseña</span>
              <div className="auth-input-wrap"><LockClosedIcon /><input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required autoComplete="current-password" placeholder="Ingresa tu contraseña" /><button type="button" onClick={() => setShowPassword((show) => !show)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? <EyeSlashIcon /> : <EyeIcon />}</button></div>
            </label>
            <button type="button" onClick={()=>{setForgotEmail(formData.email);setShowForgot(true)}} className="text-sm text-blue-600 font-semibold text-right hover:underline">¿Olvidaste tu contraseña?</button>
            <button type="submit" className="auth-submit" disabled={loading}>{loading ? 'Iniciando sesión...' : <>Iniciar sesión <ArrowRightIcon /></>}</button>
          </form>
          <p className="auth-switch">¿Aún no tienes una cuenta? <Link to="/register">Crear cuenta</Link></p>


          {showForgot && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"><form onSubmit={handleForgotPassword} className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4"><h3 className="text-xl font-bold">Recuperar contraseña</h3><p className="text-sm text-gray-600">Te enviaremos un enlace seguro a tu correo real.</p><input className="input-field" type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} placeholder="tu@correo.com" required/><div className="flex gap-3"><button type="button" className="btn-secondary flex-1" onClick={()=>setShowForgot(false)}>Cancelar</button><button className="btn-primary flex-1" disabled={loading}>{loading?'Enviando...':'Enviar enlace'}</button></div></form></div>}

          {showChangePassword && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
              <form onSubmit={handleChangePassword} className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Cambio de contraseña requerido</h3>
                  <p className="text-sm text-gray-600 mt-1">Por medios de seguridad, antes de ingresar debes cambiar la contraseña temporal asignada por el administrador.</p>
                </div>
                <label className="block text-sm font-medium text-gray-700">Correo
                  <input className="input-field mt-1" value={passwordChangeEmail} readOnly />
                </label>
                <label className="block text-sm font-medium text-gray-700">Nueva contraseña
                  <input className="input-field mt-1" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength="6" />
                </label>
                <label className="block text-sm font-medium text-gray-700">Confirmar contraseña
                  <input className="input-field mt-1" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required minLength="6" />
                </label>
                <div className="flex gap-3 pt-2">
                  <button type="button" className="btn-secondary flex-1" onClick={() => setShowChangePassword(false)}>Cancelar</button>
                  <button type="submit" className="btn-primary flex-1" disabled={loading}>{loading ? 'Guardando...' : 'Cambiar'}</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default Login;
