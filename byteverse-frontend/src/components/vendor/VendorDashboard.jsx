// src/components/vendor/VendorDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { 
  ChartBarIcon, 
  ShoppingBagIcon, 
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  Squares2X2Icon,
  UserGroupIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const VendorDashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    totalCustomers: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Obtener productos del vendedor
      const productsRes = await api.get(`/products?vendorId=${user.id}`);
      const products = productsRes.data || [];
      
      // Obtener pedidos del vendedor
      const ordersRes = await api.get(`/orders?vendorId=${user.id}`);
      const orders = ordersRes.data || [];
      
      // Obtener clientes únicos
      const uniqueClients = new Set(orders.map(o => o.compradorId));
      
      setStats({
        totalProducts: products.length,
        totalOrders: orders.length,
        totalRevenue: orders.reduce((acc, o) => acc + (o.total || 0), 0),
        pendingOrders: orders.filter(o => o.estado === 'PENDIENTE').length,
        totalCustomers: uniqueClients.size
      });
    } catch (error) {
      console.error('Error fetching vendor stats:', error);
      toast.error('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Productos',
      value: stats.totalProducts,
      icon: ShoppingBagIcon,
      color: 'from-blue-500 to-blue-600',
      link: '/vendor/products'
    },
    {
      title: 'Pedidos',
      value: stats.totalOrders,
      icon: ClipboardDocumentListIcon,
      color: 'from-purple-500 to-purple-600',
      link: '/vendor/orders'
    },
    {
      title: 'Clientes',
      value: stats.totalCustomers,
      icon: UserGroupIcon,
      color: 'from-indigo-500 to-indigo-600',
      link: '/vendor/search-client'
    },
    {
      title: 'Ingresos',
      value: `S/ ${stats.totalRevenue.toFixed(2)}`,
      icon: CurrencyDollarIcon,
      color: 'from-green-500 to-green-600',
      link: '/vendor/reports'
    }
  ];

  const quickActions = [
    { name: 'Agregar Producto', icon: ShoppingBagIcon, path: '/vendor/products', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
    { name: 'Ver Pedidos', icon: ClipboardDocumentListIcon, path: '/vendor/orders', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
    { name: 'Buscar Cliente', icon: MagnifyingGlassIcon, path: '/vendor/search-client', color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' },
    { name: 'Ver Reportes', icon: DocumentTextIcon, path: '/vendor/reports', color: 'bg-green-50 text-green-700 hover:bg-green-100' },
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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Squares2X2Icon className="w-8 h-8 text-primary-600" />
            Dashboard Vendedor
          </h1>
          <p className="text-gray-600 mt-2">Bienvenido, {user?.nombre}</p>
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
            {quickActions.map((action, index) => (
              <Link
                key={index}
                to={action.path}
                className={`p-4 ${action.color} rounded-xl transition-colors text-center`}
              >
                <action.icon className="w-8 h-8 mx-auto mb-2" />
                <span className="text-sm font-medium">{action.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Resumen de Ventas</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Pedidos pendientes</span>
                <span className="font-bold text-yellow-600">{stats.pendingOrders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pedidos completados</span>
                <span className="font-bold text-green-600">{stats.totalOrders - stats.pendingOrders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Ingreso promedio por pedido</span>
                <span className="font-bold text-primary-600">
                  S/ {(stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">💡 Consejos</h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                Mantén tus productos actualizados
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                Revisa tus pedidos pendientes diariamente
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                Conoce a tus clientes para recomendarles productos
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                Analiza tus reportes para mejorar tus ventas
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;