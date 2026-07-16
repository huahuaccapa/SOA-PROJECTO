import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { 
  UsersIcon, 
  ShoppingBagIcon, 
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  UserGroupIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📊 Cargando estadísticas del dashboard...');
      
      // ✅ OBTENER USUARIOS - Endpoint correcto: /api/users
      let usersData = [];
      try {
        const usersRes = await api.get('/users');
        usersData = usersRes.data || [];
        console.log(`✅ Usuarios: ${usersData.length}`);
      } catch (err) {
        console.warn('⚠️ No se pudieron cargar usuarios:', err.message);
        usersData = [];
      }

      // ✅ OBTENER PRODUCTOS - Endpoint correcto: /api/products
      let productsData = [];
      try {
        const productsRes = await api.get('/products');
        productsData = productsRes.data || [];
        console.log(`✅ Productos: ${productsData.length}`);
      } catch (err) {
        console.warn('⚠️ No se pudieron cargar productos:', err.message);
        productsData = [];
      }

      // ✅ OBTENER ÓRDENES - Endpoint correcto: /api/orders
      let ordersData = [];
      try {
        const ordersRes = await api.get('/orders');
        ordersData = ordersRes.data || [];
        console.log(`✅ Órdenes: ${ordersData.length}`);
      } catch (err) {
        console.warn('⚠️ No se pudieron cargar órdenes:', err.message);
        ordersData = [];
      }

      // Calcular ingresos totales
      const totalRevenue = ordersData.reduce((acc, order) => {
        return acc + (order.total || order.totalAmount || 0);
      }, 0);

      setStats({
        totalUsers: usersData.length,
        totalProducts: productsData.length,
        totalOrders: ordersData.length,
        totalRevenue: totalRevenue
      });

      if (usersData.length === 0 && productsData.length === 0 && ordersData.length === 0) {
        setError('No se pudieron cargar datos. Verifica que el backend esté corriendo.');
      }

    } catch (error) {
      console.error('❌ Error en fetchStats:', error);
      setError('Error al cargar estadísticas');
      toast.error('Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Usuarios',
      value: stats.totalUsers,
      icon: UsersIcon,
      color: 'from-purple-500 to-purple-600',
      link: '/admin/users'
    },
    {
      title: 'Productos',
      value: stats.totalProducts,
      icon: ShoppingBagIcon,
      color: 'from-blue-500 to-blue-600',
      link: '/admin/products'
    },
    {
      title: 'Pedidos',
      value: stats.totalOrders,
      icon: ClipboardDocumentListIcon,
      color: 'from-yellow-500 to-yellow-600',
      link: '/admin/orders'
    },
    {
      title: 'Ingresos',
      value: `S/ ${stats.totalRevenue.toFixed(2)}`,
      icon: CurrencyDollarIcon,
      color: 'from-green-500 to-green-600',
      link: '/admin/analytics'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Administrador</h1>
            <p className="text-gray-600 mt-2">Panel de control general de ByteVerse</p>
          </div>
          <button
            onClick={fetchStats}
            className="mt-4 sm:mt-0 btn-secondary flex items-center gap-2"
          >
            <ArrowPathIcon className="w-5 h-5" />
            Recargar
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">{error}</p>
            <p className="text-yellow-600 text-sm mt-1">
              Ejecuta: <code className="bg-yellow-100 px-2 py-1 rounded">docker-compose ps</code> para verificar servicios
            </p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <Link
              key={index}
              to={stat.link}
              className={`bg-gradient-to-r ${stat.color} rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-300`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">{stat.title}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                </div>
                <stat.icon className="w-12 h-12 opacity-50" />
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/admin/users" className="p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors text-purple-700 text-center">
              <UserGroupIcon className="w-8 h-8 mx-auto mb-2" />
              <span className="text-sm font-medium">Gestionar Usuarios</span>
            </Link>
            <Link to="/admin/products" className="p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors text-blue-700 text-center">
              <ShoppingBagIcon className="w-8 h-8 mx-auto mb-2" />
              <span className="text-sm font-medium">Gestionar Productos</span>
            </Link>
            <Link to="/admin/orders" className="p-4 bg-yellow-50 rounded-xl hover:bg-yellow-100 transition-colors text-yellow-700 text-center">
              <ClipboardDocumentListIcon className="w-8 h-8 mx-auto mb-2" />
              <span className="text-sm font-medium">Ver Pedidos</span>
            </Link>
            <Link to="/admin/analytics" className="p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors text-green-700 text-center">
              <ChartBarIcon className="w-8 h-8 mx-auto mb-2" />
              <span className="text-sm font-medium">Analytics</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;