import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { 
  UsersIcon, 
  ShoppingBagIcon, 
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [usersRes, productsRes, ordersRes] = await Promise.all([
        api.get('/users'),
        api.get('/products'),
        api.get('/orders')
      ]);
      
      setStats({
        totalUsers: usersRes.data.length,
        totalProducts: productsRes.data.length,
        totalOrders: ordersRes.data.length,
        totalRevenue: ordersRes.data.reduce((acc, o) => acc + (o.total || 0), 0)
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
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
        <div className="inline-block w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Administrador</h1>
          <p className="text-gray-600 mt-2">Panel de control general de ByteVerse</p>
        </div>

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
            <Link to="/admin/users" className="p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors text-purple-700">
              <UserGroupIcon className="w-8 h-8 mx-auto mb-2" />
              <span className="text-sm font-medium">Gestionar Usuarios</span>
            </Link>
            <Link to="/admin/products" className="p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors text-blue-700">
              <ShoppingBagIcon className="w-8 h-8 mx-auto mb-2" />
              <span className="text-sm font-medium">Gestionar Productos</span>
            </Link>
            <Link to="/admin/orders" className="p-4 bg-yellow-50 rounded-xl hover:bg-yellow-100 transition-colors text-yellow-700">
              <ClipboardDocumentListIcon className="w-8 h-8 mx-auto mb-2" />
              <span className="text-sm font-medium">Ver Pedidos</span>
            </Link>
            <Link to="/admin/analytics" className="p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors text-green-700">
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