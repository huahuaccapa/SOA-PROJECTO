import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { 
  ChartBarIcon, 
  UsersIcon, 
  ShoppingBagIcon, 
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  UserGroupIcon,
  TagIcon,
  CubeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [analyticsData, setAnalyticsData] = useState({
    totalUsers: 0,
    totalVendors: 0,
    totalBuyers: 0,
    newUsers: 0,
    activeUsers: 0,
    totalProducts: 0,
    totalCategories: 0,
    outOfStock: 0,
    topProducts: [],
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    totalRevenue: 0,
    revenueGrowth: 0,
    averageOrderValue: 0,
    ordersByDay: [],
    usersByDay: [],
    topCategories: [],
    topVendors: [],
    dailyReport: [],
    weeklyReport: [],
    monthlyReport: []
  });
  const [reportType, setReportType] = useState('daily');

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      console.log('📊 Cargando datos de analytics...');

      const [usersRes, productsRes, ordersRes, categoriesRes] = await Promise.all([
        api.get('/users').catch(() => ({ data: [] })),
        api.get('/products').catch(() => ({ data: [] })),
        api.get('/orders').catch(() => ({ data: [] })),
        api.get('/categories').catch(() => ({ data: [] }))
      ]);

      const users = usersRes.data || [];
      const products = productsRes.data || [];
      const orders = ordersRes.data || [];
      const categories = categoriesRes.data || [];

      const filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.fecha).toISOString().split('T')[0];
        return orderDate >= dateRange.startDate && orderDate <= dateRange.endDate;
      });

      const totalUsers = users.length;
      const vendors = users.filter(u => u.role === 'VENDEDOR');
      const buyers = users.filter(u => u.role === 'COMPRADOR');
      const activeUsers = users.filter(u => u.activo !== false).length;
      
      const newUsers = users.filter(u => {
        const createdDate = u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : u.fecha;
        return createdDate >= dateRange.startDate && createdDate <= dateRange.endDate;
      }).length;

      const totalProducts = products.length;
      const outOfStock = products.filter(p => p.stock === 0).length;
      const topProducts = products
        .sort((a, b) => (b.stock || 0) - (a.stock || 0))
        .slice(0, 10);

      const totalOrders = filteredOrders.length;
      const pendingOrders = filteredOrders.filter(o => o.estado === 'PENDIENTE').length;
      const completedOrders = filteredOrders.filter(o => o.estado === 'ENTREGADO' || o.estado === 'CONFIRMADO').length;
      const cancelledOrders = filteredOrders.filter(o => o.estado === 'CANCELADO').length;

      const totalRevenue = filteredOrders.reduce((acc, o) => acc + (o.total || 0), 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const categoryCount = {};
      products.forEach(p => {
        const cat = p.categoria || 'Sin categoría';
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      });
      const topCategories = Object.entries(categoryCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const vendorOrders = {};
      filteredOrders.forEach(o => {
        const vendor = o.vendedorNombre || 'ByteVerse Store';
        vendorOrders[vendor] = (vendorOrders[vendor] || 0) + 1;
      });
      const topVendors = Object.entries(vendorOrders)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const ordersByDay = {};
      filteredOrders.forEach(o => {
        const day = new Date(o.fecha).toISOString().split('T')[0];
        ordersByDay[day] = (ordersByDay[day] || 0) + 1;
      });
      const ordersByDayData = Object.entries(ordersByDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const usersByDay = {};
      users.forEach(u => {
        const createdDate = u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : u.fecha;
        if (createdDate && createdDate >= dateRange.startDate && createdDate <= dateRange.endDate) {
          usersByDay[createdDate] = (usersByDay[createdDate] || 0) + 1;
        }
      });
      const usersByDayData = Object.entries(usersByDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const dailyReport = generateReport('daily', filteredOrders, users);
      const weeklyReport = generateReport('weekly', filteredOrders, users);
      const monthlyReport = generateReport('monthly', filteredOrders, users);

      setAnalyticsData({
        totalUsers,
        totalVendors: vendors.length,
        totalBuyers: buyers.length,
        newUsers,
        activeUsers,
        totalProducts,
        totalCategories: categories.length,
        outOfStock,
        topProducts,
        totalOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        totalRevenue,
        revenueGrowth: calculateGrowth(filteredOrders),
        averageOrderValue,
        ordersByDay: ordersByDayData,
        usersByDay: usersByDayData,
        topCategories,
        topVendors,
        dailyReport,
        weeklyReport,
        monthlyReport
      });

    } catch (error) {
      console.error('❌ Error fetching analytics:', error);
      toast.error('Error al cargar datos de analytics');
    } finally {
      setLoading(false);
    }
  };

  const calculateGrowth = (orders) => {
    if (orders.length < 2) return 0;
    const sorted = [...orders].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    const mid = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, mid);
    const secondHalf = sorted.slice(mid);
    const firstTotal = firstHalf.reduce((acc, o) => acc + (o.total || 0), 0);
    const secondTotal = secondHalf.reduce((acc, o) => acc + (o.total || 0), 0);
    if (firstTotal === 0) return secondTotal > 0 ? 100 : 0;
    return ((secondTotal - firstTotal) / firstTotal) * 100;
  };

  const generateReport = (type, orders, users) => {
    const now = new Date();
    let periods = [];
    
    if (type === 'daily') {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        periods.push(date.toISOString().split('T')[0]);
      }
    } else if (type === 'weekly') {
      for (let i = 3; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - (i * 7));
        periods.push(date.toISOString().split('T')[0]);
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        periods.push(date.toISOString().split('T')[0].slice(0, 7));
      }
    }

    return periods.map(period => {
      const periodOrders = orders.filter(o => {
        const orderDate = new Date(o.fecha).toISOString().split('T')[0];
        if (type === 'monthly') {
          return orderDate.slice(0, 7) === period;
        }
        return orderDate === period;
      });

      const periodUsers = users.filter(u => {
        const createdDate = u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : u.fecha;
        if (type === 'monthly') {
          return createdDate && createdDate.slice(0, 7) === period;
        }
        return createdDate === period;
      });

      return {
        period,
        orders: periodOrders.length,
        revenue: periodOrders.reduce((acc, o) => acc + (o.total || 0), 0),
        users: periodUsers.length
      };
    });
  };

  const exportReport = () => {
    try {
      const reportData = reportType === 'daily' ? analyticsData.dailyReport :
                         reportType === 'weekly' ? analyticsData.weeklyReport :
                         analyticsData.monthlyReport;

      if (reportData.length === 0) {
        toast.error('No hay datos para exportar');
        return;
      }

      const headers = ['Periodo', 'Pedidos', 'Ingresos', 'Usuarios'];
      let csv = headers.join(',') + '\n';
      reportData.forEach(row => {
        csv += `${row.period},${row.orders},${row.revenue},${row.users}\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_${reportType}_${dateRange.startDate}_${dateRange.endDate}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Reporte exportado exitosamente');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Error al exportar reporte');
    }
  };

  const formatCurrency = (value) => {
    return `S/ ${value?.toFixed(2) || '0.00'}`;
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle, trend }) => (
    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-primary-500 hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-1 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? <ArrowTrendingUpIcon className="w-4 h-4" /> : <ArrowTrendingDownIcon className="w-4 h-4" />}
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'general', label: 'General', icon: ChartBarIcon },
    { id: 'users', label: 'Usuarios', icon: UsersIcon },
    { id: 'products', label: 'Productos', icon: ShoppingBagIcon },
    { id: 'orders', label: 'Pedidos', icon: ClipboardDocumentListIcon },
    { id: 'reports', label: 'Reportes', icon: DocumentArrowDownIcon }
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
      <div className="container-fluid">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <ChartBarIcon className="w-8 h-8 text-primary-600" />
              Analytics
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Análisis completo del rendimiento del sistema
            </p>
          </div>
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            <button
              onClick={exportReport}
              className="btn-secondary flex items-center gap-2"
            >
              <DocumentArrowDownIcon className="w-5 h-5" />
              Exportar Reporte
            </button>
            <button
              onClick={fetchAnalyticsData}
              className="btn-primary flex items-center gap-2"
            >
              <ArrowTrendingUpIcon className="w-5 h-5" />
              Actualizar
            </button>
          </div>
        </div>

        {/* Filtro de fechas */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Rango:</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                type="date"
                name="startDate"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                className="input-field py-2 px-3 text-sm w-auto"
              />
              <span className="text-gray-500 self-center">→</span>
              <input
                type="date"
                name="endDate"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                className="input-field py-2 px-3 text-sm w-auto"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-200">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${
                  isActive 
                    ? 'border-primary-600 text-primary-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ===== TAB: GENERAL ===== */}
        {activeTab === 'general' && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
              <StatCard
                title="Usuarios Totales"
                value={analyticsData.totalUsers}
                icon={UsersIcon}
                color="bg-purple-500"
                subtitle={`${analyticsData.activeUsers} activos`}
                trend={analyticsData.totalUsers > 0 ? ((analyticsData.newUsers / analyticsData.totalUsers) * 100) : 0}
              />
              <StatCard
                title="Productos"
                value={analyticsData.totalProducts}
                icon={ShoppingBagIcon}
                color="bg-blue-500"
                subtitle={`${analyticsData.outOfStock} sin stock`}
              />
              <StatCard
                title="Pedidos"
                value={analyticsData.totalOrders}
                icon={ClipboardDocumentListIcon}
                color="bg-yellow-500"
                subtitle={`${analyticsData.pendingOrders} pendientes`}
              />
              <StatCard
                title="Ingresos"
                value={formatCurrency(analyticsData.totalRevenue)}
                icon={CurrencyDollarIcon}
                color="bg-green-500"
                subtitle={`Promedio: ${formatCurrency(analyticsData.averageOrderValue)}`}
                trend={analyticsData.revenueGrowth}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ClipboardDocumentListIcon className="w-5 h-5 text-yellow-600" />
                  Pedidos por Día
                </h3>
                <div className="space-y-2">
                  {analyticsData.ordersByDay.slice(-7).map((item, index) => {
                    const max = Math.max(...analyticsData.ordersByDay.map(d => d.count), 1);
                    const percentage = (item.count / max) * 100;
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-24">{item.date}</span>
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-900 w-12 text-right">{item.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TagIcon className="w-5 h-5 text-primary-600" />
                  Categorías Populares
                </h3>
                <div className="space-y-2">
                  {analyticsData.topCategories.map((item, index) => {
                    const max = Math.max(...analyticsData.topCategories.map(c => c.count), 1);
                    const percentage = (item.count / max) * 100;
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-28 truncate">{item.name}</span>
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-900 w-12 text-right">{item.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== TAB: USUARIOS ===== */}
        {activeTab === 'users' && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
              <StatCard
                title="Total Usuarios"
                value={analyticsData.totalUsers}
                icon={UsersIcon}
                color="bg-purple-500"
              />
              <StatCard
                title="Compradores"
                value={analyticsData.totalBuyers}
                icon={UserIcon}
                color="bg-green-500"
              />
              <StatCard
                title="Vendedores"
                value={analyticsData.totalVendors}
                icon={UserGroupIcon}
                color="bg-blue-500"
              />
              <StatCard
                title="Nuevos Usuarios"
                value={analyticsData.newUsers}
                icon={UserPlusIcon}
                color="bg-orange-500"
                subtitle="En el período seleccionado"
              />
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-purple-600" />
                Registros de Usuarios por Día
              </h3>
              <div className="space-y-2">
                {analyticsData.usersByDay.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No hay datos disponibles</p>
                ) : (
                  analyticsData.usersByDay.slice(-10).map((item, index) => {
                    const max = Math.max(...analyticsData.usersByDay.map(d => d.count), 1);
                    const percentage = (item.count / max) * 100;
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-24">{item.date}</span>
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-900 w-12 text-right">{item.count}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== TAB: PRODUCTOS ===== */}
        {activeTab === 'products' && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
              <StatCard
                title="Total Productos"
                value={analyticsData.totalProducts}
                icon={ShoppingBagIcon}
                color="bg-blue-500"
              />
              <StatCard
                title="Categorías"
                value={analyticsData.totalCategories}
                icon={TagIcon}
                color="bg-primary-500"
              />
              <StatCard
                title="Sin Stock"
                value={analyticsData.outOfStock}
                icon={XCircleIcon}
                color="bg-red-500"
              />
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CubeIcon className="w-5 h-5 text-blue-600" />
                Top Productos por Stock
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {analyticsData.topProducts.length === 0 ? (
                  <p className="text-gray-500 text-center col-span-full py-8">No hay productos disponibles</p>
                ) : (
                  analyticsData.topProducts.map((product, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                      <div className="w-12 h-12 mx-auto bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {product.nombre?.charAt(0).toUpperCase() || 'P'}
                      </div>
                      <p className="text-sm font-medium text-gray-700 mt-2 truncate">{product.nombre}</p>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">Stock:</span>
                        <span className="text-sm font-bold text-primary-600">{product.stock}</span>
                      </div>
                      <span className="text-xs text-gray-400">{product.categoria || 'Sin categoría'}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== TAB: PEDIDOS ===== */}
        {activeTab === 'orders' && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
              <StatCard
                title="Total Pedidos"
                value={analyticsData.totalOrders}
                icon={ClipboardDocumentListIcon}
                color="bg-yellow-500"
              />
              <StatCard
                title="Pendientes"
                value={analyticsData.pendingOrders}
                icon={ClockIcon}
                color="bg-orange-500"
              />
              <StatCard
                title="Completados"
                value={analyticsData.completedOrders}
                icon={CheckCircleIcon}
                color="bg-green-500"
              />
              <StatCard
                title="Cancelados"
                value={analyticsData.cancelledOrders}
                icon={XCircleIcon}
                color="bg-red-500"
              />
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5 text-blue-600" />
                Top Vendedores por Pedidos
              </h3>
              <div className="space-y-3">
                {analyticsData.topVendors.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No hay datos disponibles</p>
                ) : (
                  analyticsData.topVendors.map((item, index) => {
                    const max = Math.max(...analyticsData.topVendors.map(v => v.count), 1);
                    const percentage = (item.count / max) * 100;
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700 w-32 truncate">{item.name}</span>
                        <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-900 w-12 text-right">{item.count}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== TAB: REPORTES ===== */}
        {activeTab === 'reports' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setReportType('daily')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    reportType === 'daily'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Diario
                </button>
                <button
                  onClick={() => setReportType('weekly')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    reportType === 'weekly'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Semanal
                </button>
                <button
                  onClick={() => setReportType('monthly')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    reportType === 'monthly'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Mensual
                </button>
              </div>
              <button
                onClick={exportReport}
                className="btn-primary flex items-center gap-2"
              >
                <DocumentArrowDownIcon className="w-5 h-5" />
                Exportar Reporte
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Período
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pedidos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ingresos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nuevos Usuarios
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Promedio por Pedido
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(reportType === 'daily' ? analyticsData.dailyReport :
                      reportType === 'weekly' ? analyticsData.weeklyReport :
                      analyticsData.monthlyReport).map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.period}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {item.orders}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary-600">
                          {formatCurrency(item.revenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {item.users}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {item.orders > 0 ? formatCurrency(item.revenue / item.orders) : formatCurrency(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;