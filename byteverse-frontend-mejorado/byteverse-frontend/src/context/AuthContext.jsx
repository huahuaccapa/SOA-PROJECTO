import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const loadUser = () => {
      const token = localStorage.getItem('accessToken');
      const userData = localStorage.getItem('user');
      
      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setIsAuthenticated(true);
          console.log('✅ Usuario autenticado:', parsedUser.email);
        } catch (error) {
          console.error('Error parsing user data:', error);
          logout();
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  // ✅ LOGIN
  const login = async (email, password) => {
    try {
      console.log('🔐 Intentando login:', email);
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.success) {
        const { accessToken, refreshToken, user: userData } = response.data;
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(userData));
        
        setUser(userData);
        setIsAuthenticated(true);
        toast.success(`¡Bienvenido ${userData.nombre}!`);
        
        return { success: true, user: userData };
      }
      
      return { success: false, error: 'Credenciales inválidas' };
    } catch (error) {
      console.error('❌ Error en login:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al iniciar sesión' 
      };
    }
  };

  // ✅ REGISTER
  const register = async (userData) => {
    try {
      console.log('📝 Registrando usuario:', userData.email);
      const response = await api.post('/auth/register', userData);
      
      if (response.data.success) {
        toast.success('¡Registro exitoso! Ahora puedes iniciar sesión');
        return { success: true };
      }
      
      return { success: false, error: 'Error en el registro' };
    } catch (error) {
      console.error('❌ Error en registro:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al registrarse' 
      };
    }
  };

  // GOOGLE OAUTH
  const googleLogin = async () => {
    try {
      const authBaseURL = (import.meta.env.VITE_AUTH_URL || api.defaults.baseURL || 'http://localhost:3000/api')
        .replace(/\/$/, '');
      const state = crypto.randomUUID();

      sessionStorage.setItem('googleOAuthState', state);
      sessionStorage.setItem('authReturnTo', window.location.pathname === '/login' ? '/' : window.location.pathname);

      const oauthURL = new URL(`${authBaseURL}/auth/google`);
      oauthURL.searchParams.set('state', state);
      window.location.assign(oauthURL.toString());

      return { success: true };
    } catch (error) {
      console.error('❌ Error en Google login:', error);
      setLoading(false);
      return { 
        success: false, 
        error: 'Error al iniciar sesión con Google' 
      };
    }
  };

  // ✅ LOGOUT
  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    toast.success('Sesión cerrada exitosamente');
  };

  // ✅ VERIFICAR ROLES
  const hasRole = (roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const isAdmin = () => user?.role === 'ADMIN';
  const isVendor = () => user?.role === 'VENDEDOR';
  const isBuyer = () => user?.role === 'COMPRADOR';
  const isVisitor = () => !user;

  // Procesar el callback que devuelve el backend después de Google OAuth.
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('accessToken') || urlParams.get('token');
    const refreshToken = urlParams.get('refreshToken');
    const userData = urlParams.get('user');
    const oauthError = urlParams.get('error');
    const returnedState = urlParams.get('state');

    if (oauthError) {
      toast.error(oauthError === 'access_denied'
        ? 'Cancelaste el acceso con Google'
        : 'No se pudo iniciar sesión con Google');
      window.history.replaceState({}, document.title, window.location.pathname);
      setLoading(false);
      return;
    }

    if (token && userData) {
      try {
        const expectedState = sessionStorage.getItem('googleOAuthState');
        if (returnedState && expectedState && returnedState !== expectedState) {
          throw new Error('El estado de OAuth no coincide');
        }

        const parsedUser = JSON.parse(decodeURIComponent(userData));
        localStorage.setItem('accessToken', token);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(parsedUser));
        sessionStorage.removeItem('googleOAuthState');
        setUser(parsedUser);
        setIsAuthenticated(true);
        toast.success(`¡Bienvenido ${parsedUser.nombre}!`);
        
        // Limpiar URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        const returnTo = sessionStorage.getItem('authReturnTo');
        sessionStorage.removeItem('authReturnTo');

        if (parsedUser.role === 'ADMIN') {
          window.location.href = '/admin';
        } else if (parsedUser.role === 'VENDEDOR') {
          window.location.href = '/vendor';
        } else {
          window.location.href = returnTo && returnTo !== '/login' ? returnTo : '/';
        }
      } catch (error) {
        console.error('Error procesando Google login:', error);
        toast.error('Error al procesar el inicio de sesión con Google');
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated,
      login,
      register,
      googleLogin,
      logout,
      hasRole,
      isAdmin,
      isVendor,
      isBuyer,
      isVisitor,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};
