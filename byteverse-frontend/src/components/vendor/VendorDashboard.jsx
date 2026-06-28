import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { 
  ChartBarIcon, 
  ShoppingBagIcon, 
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

const VendorDashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Simulación - En producción conectarías con endpoints reales
      const productsRes = await api.get('/products');
      const vendorProducts = productsRes.data.filter(p => p.vendedorId === user.id);
      
      // Simular pedidos (en producción usarías el endpoint real)
      const ordersRes = await api.get('/orders');
      const vendorOrders = ordersRes.data.filter(o => o.vendedorId === user.id);
      
      setStats({
        totalProducts: vendorProducts.length,
        totalOrders: vendorOrders.length,
        totalRevenue: vendorOrders.reduce((acc, o) => acc + (o.total || 0), 0),
        pendingOrders: vendorOrders.filter(o => o.estado === 'PENDIENTE').length
      });
    } catch (error) {
      console.error('Error fetching vendor stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Productos',
      value: stats.totalProducts,
      icon: ShoppingBagIcon,
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Pedidos Totales',
      value: stats.totalOrders,
      icon: ClipboardDocumentListIcon,
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Pedidos Pendientes',
      value: stats.pendingOrders,
      icon: ArrowTrendingUpIcon,
      color: 'from-yellow-500 to-yellow-600'
    },
    {
      title: 'Ingresos',
      value: `S/ ${stats.totalRevenue.toFixed(2)}`,
      icon: CurrencyDollarIcon,
      color: 'from-green-500 to-green-600'
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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Vendedor</h1>
          <p className="text-gray-600 mt-2">Bienvenido, {user?.nombre}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <div key={index} className={`bg-gradient-to-r ${stat.color} rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-300`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">{stat.title}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                </div>
                <stat.icon className="w-12 h-12 opacity-50" />
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors text-primary-700">
              <ShoppingBagIcon className="w-8 h-8 mx-auto mb-2" />
              <span className="text-sm font-medium">Agregar Producto</span>
            </button>
            <button className="p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors text-blue-700">
              <ClipboardDocumentListIcon className="w-8 h-8 mx-auto mb-2" />
              <span className="text-sm font-medium">Ver Pedidos</span>
            </button>
            <button className="p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors text-purple-700">
              <ChartBarIcon className="w-8 h-8 mx-auto mb-2" />
              <span className="text-sm font-medium">Ver Reportes</span>
            </button>
            <button className="p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors text-green-700">
              <CurrencyDollarIcon className="w-8 h-8 mx-auto mb-2" />
              <span className="text-sm font-medium">Pagos</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;