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
        } catch (error) {
          console.error('Error parsing user data:', error);
          logout();
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.success) {
        const { accessToken, refreshToken, user } = response.data;
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        
        setUser(user);
        setIsAuthenticated(true);
        toast.success(`¡Bienvenido ${user.nombre}!`);
        
        return { success: true, user };
      }
      
      return { success: false, error: 'Credenciales inválidas' };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al iniciar sesión' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      
      if (response.data.success) {
        toast.success('¡Registro exitoso! Ahora puedes iniciar sesión');
        return { success: true };
      }
      
      return { success: false, error: 'Error en el registro' };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al registrarse' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    toast.success('Sesión cerrada exitosamente');
  };

  const hasRole = (roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

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