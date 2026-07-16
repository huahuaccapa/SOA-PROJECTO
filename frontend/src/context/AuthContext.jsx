import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

const GOOGLE_SCRIPT_ID = 'google-identity-services';
const ENV_GOOGLE_CLIENT_ID = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
const GOOGLE_LOGIN_MODE = String(import.meta.env.VITE_GOOGLE_LOGIN_MODE || 'auto').trim().toLowerCase();
const API_URL = String(import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
let googleConfigPromise;

const loadGoogleConfig = async () => {
  if (!googleConfigPromise) {
    googleConfigPromise = api.get('/auth/google/config', { skipAuth: true, skipGlobalError: true })
      .then(({ data }) => ({
        clientId: String(data?.clientId || ENV_GOOGLE_CLIENT_ID).trim(),
        tokenLoginEnabled: Boolean(data?.tokenLoginEnabled || ENV_GOOGLE_CLIENT_ID),
        redirectLoginEnabled: Boolean(data?.redirectLoginEnabled),
      }))
      .catch(() => ({
        clientId: ENV_GOOGLE_CLIENT_ID,
        tokenLoginEnabled: Boolean(ENV_GOOGLE_CLIENT_ID),
        redirectLoginEnabled: false,
      }));
  }
  return googleConfigPromise;
};

const normalizeUser = (userData = {}) => ({
  ...userData,
  id: String(userData?.id || userData?._id || ''),
  _id: String(userData?._id || userData?.id || ''),
  role: String(userData?.role || 'COMPRADOR').toUpperCase(),
});

const getDashboardPath = (userData, fallback = '/') => {
  if (userData?.role === 'ADMIN') return '/admin';
  if (userData?.role === 'VENDEDOR') return '/vendor';
  return fallback && fallback !== '/login' && fallback !== '/auth/callback' && fallback !== '/oauth/callback' && fallback !== '/'
    ? fallback
    : '/buyer';
};

const loadGoogleScript = () => new Promise((resolve, reject) => {
  if (window.google?.accounts?.id) return resolve(window.google);

  const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);
  if (existingScript) {
    if (window.google?.accounts?.id) return resolve(window.google);
    existingScript.addEventListener('load', () => resolve(window.google), { once: true });
    existingScript.addEventListener('error', () => reject(new Error('No se pudo cargar Google Identity Services')), { once: true });
    return;
  }

  const script = document.createElement('script');
  script.id = GOOGLE_SCRIPT_ID;
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.defer = true;
  script.onload = () => resolve(window.google);
  script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'));
  document.head.appendChild(script);
});

const createOAuthState = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID().replace(/-/g, '');
  const values = new Uint32Array(4);
  window.crypto?.getRandomValues?.(values);
  const generated = Array.from(values).map(value => value.toString(16).padStart(8, '0')).join('');
  return generated || `${Date.now()}${Math.random().toString(36).slice(2)}`.replace(/[^a-zA-Z0-9_-]/g, '');
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const saveSession = useCallback((payload) => {
    const accessToken = payload?.accessToken || payload?.token;
    const refreshToken = payload?.refreshToken;
    const userData = normalizeUser(payload?.user);

    if (!accessToken || !userData?.email) {
      throw new Error('Respuesta de autenticación incompleta');
    }

    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));

    setUser(userData);
    setIsAuthenticated(true);
    return userData;
  }, []);

  const updateSessionUser = useCallback((updates) => {
    setUser(current => {
      const next = normalizeUser({ ...(current || {}), ...(updates || {}) });
      if (next.email) localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }, []);

  const logout = useCallback(async ({ silent = false } = {}) => {
    const serverLogout = localStorage.getItem('accessToken')
      ? api.post('/auth/logout', {}, { skipGlobalError: true }).catch(() => null)
      : Promise.resolve();

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('googleOAuthState');
    sessionStorage.removeItem('authReturnTo');
    setUser(null);
    setIsAuthenticated(false);
    if (!silent) toast.success('Sesión cerrada exitosamente');
    await serverLogout;
  }, []);

  useEffect(() => {
    let mounted = true;

    const clearLocalSession = () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      if (!mounted) return;
      setUser(null);
      setIsAuthenticated(false);
    };

    const loadUser = async () => {
      const token = localStorage.getItem('accessToken');
      const userData = localStorage.getItem('user');

      if (!token || !userData) {
        clearLocalSession();
        if (mounted) setLoading(false);
        return;
      }

      let parsedUser;
      try {
        parsedUser = normalizeUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
        clearLocalSession();
        if (mounted) setLoading(false);
        return;
      }

      try {
        await api.get('/auth/verify', { skipGlobalError: true });
        if (!mounted) return;
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        if (!mounted) return;
        if (error.response?.status === 401) {
          clearLocalSession();
        } else {
          setUser(parsedUser);
          setIsAuthenticated(true);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const handleExpiredSession = () => {
      clearLocalSession();
      if (mounted) setLoading(false);
    };

    window.addEventListener('byteverse:session-expired', handleExpiredSession);
    loadUser();

    return () => {
      mounted = false;
      window.removeEventListener('byteverse:session-expired', handleExpiredSession);
    };
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password }, { skipGlobalError: true });
      if (response.data?.success) {
        const userData = saveSession(response.data);
        toast.success(`¡Bienvenido ${userData.nombre}!`);
        return { success: true, user: userData };
      }
      return { success: false, error: 'Credenciales inválidas' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Error al iniciar sesión',
        code: error.response?.data?.code,
        needPasswordChange: error.response?.data?.needPasswordChange,
        email: error.response?.data?.email || email,
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData, { skipGlobalError: true });
      if (response.data?.success) {
        toast.success('¡Registro exitoso! Ahora puedes iniciar sesión');
        return { success: true };
      }
      return { success: false, error: 'Error en el registro' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Error al registrarse',
      };
    }
  };

  const loginWithGoogleCredential = useCallback(async (credential) => {
    try {
      const response = await api.post('/auth/google/token', { credential }, { skipGlobalError: true });
      if (!response.data?.success) {
        return { success: false, error: response.data?.error || 'No se pudo iniciar sesión con Google' };
      }

      const userData = saveSession(response.data);
      toast.success(`¡Bienvenido ${userData.nombre}!`);
      return { success: true, user: userData };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'No se pudo iniciar sesión con Google',
      };
    }
  }, [saveSession]);

  const renderGoogleButton = useCallback(async (container, onSuccess, onError) => {
    if (GOOGLE_LOGIN_MODE === 'redirect' || !container) return false;

    try {
      const config = await loadGoogleConfig();
      if (!config.tokenLoginEnabled || !config.clientId.endsWith('.apps.googleusercontent.com')) return false;

      const google = await loadGoogleScript();
      if (!google?.accounts?.id) throw new Error('Google Identity Services no está disponible');

      container.innerHTML = '';
      google.accounts.id.initialize({
        client_id: config.clientId,
        callback: async ({ credential }) => {
          if (!credential) {
            onError?.('Google no devolvió una credencial válida');
            return;
          }
          const result = await loginWithGoogleCredential(credential);
          if (result.success) onSuccess?.(result.user);
          else onError?.(result.error);
        },
        ux_mode: 'popup',
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        shape: 'rectangular',
        text: 'continue_with',
        logo_alignment: 'left',
        width: Math.min(container.offsetWidth || 400, 420),
      });
      return container.childElementCount > 0;
    } catch (error) {
      console.error('Error renderizando botón Google:', error);
      container.innerHTML = '';
      onError?.(error.message || 'No se pudo cargar Google');
      return false;
    }
  }, [loginWithGoogleCredential]);

  const googleLogin = useCallback(async (returnTo = '/') => {
    try {
      const config = await loadGoogleConfig();
      if (!config.redirectLoginEnabled) {
        return {
          success: false,
          error: config.tokenLoginEnabled
            ? 'No se pudo mostrar el botón oficial de Google. Recarga la página e inténtalo nuevamente.'
            : 'Google no está configurado en el backend.',
        };
      }

      const state = createOAuthState();
      sessionStorage.setItem('googleOAuthState', state);
      sessionStorage.setItem('authReturnTo', returnTo || '/');
      window.location.assign(`${API_URL}/auth/google?state=${encodeURIComponent(state)}`);
      return { success: true, redirecting: true };
    } catch (error) {
      console.error('Error iniciando Google OAuth:', error);
      return { success: false, error: 'No se pudo iniciar sesión con Google' };
    }
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('accessToken') || urlParams.get('token');
    const refreshToken = urlParams.get('refreshToken');
    const userData = urlParams.get('user');
    const oauthError = urlParams.get('error');
    const returnedState = urlParams.get('state');

    if (oauthError) {
      const messages = {
        oauth_not_configured: 'Google OAuth no está configurado en el backend',
        access_denied: 'Cancelaste el acceso con Google',
        oauth_missing_code: 'Google no devolvió el código de autorización',
        oauth_failed: 'No se pudo completar el inicio de sesión con Google',
        oauth_state_invalid: 'La validación de seguridad de Google expiró. Intenta nuevamente.',
      };
      toast.error(messages[oauthError] || 'No se pudo iniciar sesión con Google');
      window.history.replaceState({}, document.title, window.location.pathname);
      setLoading(false);
      return;
    }

    if (token && userData) {
      try {
        const expectedState = sessionStorage.getItem('googleOAuthState');
        if (expectedState && returnedState !== expectedState) {
          throw new Error('El estado de OAuth no coincide');
        }

        let parsedUser;
        try {
          parsedUser = JSON.parse(userData);
        } catch {
          parsedUser = JSON.parse(decodeURIComponent(userData));
        }

        const sessionUser = saveSession({ accessToken: token, refreshToken, user: parsedUser });
        sessionStorage.removeItem('googleOAuthState');
        toast.success(`¡Bienvenido ${sessionUser.nombre}!`);

        window.history.replaceState({}, document.title, window.location.pathname);
        const returnTo = sessionStorage.getItem('authReturnTo');
        sessionStorage.removeItem('authReturnTo');
        window.location.replace(getDashboardPath(sessionUser, returnTo));
      } catch (error) {
        console.error('Error procesando Google login:', error);
        sessionStorage.removeItem('googleOAuthState');
        toast.error('No se pudo validar el retorno de Google. Intenta nuevamente.');
        window.history.replaceState({}, document.title, '/login');
      }
    }
  }, [saveSession]);

  const changePassword = async (email, newPassword) => {
    try {
      const response = await api.post('/auth/change-password', { email, newPassword }, { skipGlobalError: true });
      if (response.data?.success) {
        toast.success('Contraseña actualizada. Ahora puedes iniciar sesión.');
        return { success: true };
      }
      return { success: false, error: response.data?.error || 'No se pudo cambiar la contraseña' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'No se pudo cambiar la contraseña',
      };
    }
  };

  const hasRole = (roles) => Boolean(user && roles.includes(user.role));
  const isAdmin = () => user?.role === 'ADMIN';
  const isVendor = () => user?.role === 'VENDEDOR';
  const isBuyer = () => user?.role === 'COMPRADOR';
  const isVisitor = () => !user;

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated,
      login,
      register,
      changePassword,
      googleLogin,
      loginWithGoogleCredential,
      renderGoogleButton,
      updateSessionUser,
      logout,
      hasRole,
      isAdmin,
      isVendor,
      isBuyer,
      isVisitor,
      getDashboardPath,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe ser usado dentro de AuthProvider');
  return context;
};
