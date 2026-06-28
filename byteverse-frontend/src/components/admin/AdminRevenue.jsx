import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { 
  CurrencyDollarIcon, 
  ChartBarIcon, 
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  DocumentArrowDownIcon,
  ClockIcon,
  UsersIcon,
  ShoppingBagIcon,
  CheckIcon,
  XMarkIcon,
  UserIcon,
  UserGroupIcon,
  TagIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const AdminRevenue = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [revenueData, setRevenueData] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    pendingRevenue: 0,
    paidRevenue: 0,
    monthlyRevenue: [],
    revenueByVendor: [],
    revenueByProduct: [],
    transactions: []
  });

  useEffect(() => {
    fetchRevenueData();
  }, [dateRange]);

  const fetchRevenueData = async () => {
    setLoading(true);
    try {
      console.log('📊 Cargando datos de ingresos...');

      const ordersRes = await api.get('/orders');
      const orders = ordersRes.data || [];

      const filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.fecha).toISOString().split('T')[0];
        return orderDate >= dateRange.startDate && orderDate <= dateRange.endDate;
      });

      const totalOrders = filteredOrders.length;
      const totalRevenue = filteredOrders.reduce((acc, o) => acc + (o.total || 0), 0);
      const paidOrders = filteredOrders.filter(o => o.estado === 'ENTREGADO' || o.estado === 'CONFIRMADO');
      const pendingOrders = filteredOrders.filter(o => o.estado === 'PENDIENTE');
      
      const paidRevenue = paidOrders.reduce((acc, o) => acc + (o.total || 0), 0);
      const pendingRevenue = pendingOrders.reduce((acc, o) => acc + (o.total || 0), 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const monthlyRevenue = {};
      filteredOrders.forEach(order => {
        const month = new Date(order.fecha).toLocaleString('es-ES', { month: 'short', year: 'numeric' });
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (order.total || 0);
      });

      const monthlyData = Object.entries(monthlyRevenue).map(([month, total]) => ({
        month,
        total
      })).sort((a, b) => {
        const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        return months.indexOf(a.month.split(' ')[0]) - months.indexOf(b.month.split(' ')[0]);
      });

      const vendorRevenue = {};
      filteredOrders.forEach(order => {
        const vendorName = order.vendedorNombre || 'ByteVerse Store';
        vendorRevenue[vendorName] = (vendorRevenue[vendorName] || 0) + (order.total || 0);
      });

      const vendorData = Object.entries(vendorRevenue)
        .map(([vendor, total]) => ({ vendor, total }))
        .sort((a, b) => b.total - a.total);

      const productSales = {};
      filteredOrders.forEach(order => {
        (order.productos || []).forEach(item => {
          const productName = item.nombre || 'Producto';
          productSales[productName] = (productSales[productName] || 0) + (item.cantidad || 0);
        });
      });

      const productData = Object.entries(productSales)
        .map(([product, quantity]) => ({ product, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      setRevenueData({
        totalRevenue,
        totalOrders,
        averageOrderValue,
        pendingRevenue,
        paidRevenue,
        monthlyRevenue: monthlyData,
        revenueByVendor: vendorData,
        revenueByProduct: productData,
        transactions: filteredOrders.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      });

    } catch (error) {
      console.error('❌ Error fetching revenue data:', error);
      toast.error('Error al cargar datos de ingresos');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return `S/ ${value?.toFixed(2) || '0.00'}`;
  };

  const handleDateChange = (e) => {
    setDateRange({
      ...dateRange,
      [e.target.name]: e.target.value
    });
  };

  const exportData = () => {
    try {
      const data = revenueData.transactions.map(order => ({
        'ID': order._id || order.id,
        'Fecha': new Date(order.fecha).toLocaleDateString('es-ES'),
        'Cliente': order.compradorNombre,
        'Vendedor': order.vendedorNombre,
        'Total': order.total,
        'Estado': order.estado,
        'Método Pago': order.metodoPago
      }));

      if (data.length === 0) {
        toast.error('No hay datos para exportar');
        return;
      }

      const headers = Object.keys(data[0]);
      let csv = headers.join(',') + '\n';
      data.forEach(row => {
        csv += headers.map(h => `"${row[h] || ''}"`).join(',') + '\n';
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ingresos_${dateRange.startDate}_${dateRange.endDate}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Reporte exportado exitosamente');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Error al exportar datos');
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-primary-500 hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

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
              <CurrencyDollarIcon className="w-8 h-8 text-primary-600" />
              Ingresos
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Gestión y seguimiento de todos los ingresos del sistema
            </p>
          </div>
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            <button
              onClick={exportData}
              className="btn-secondary flex items-center gap-2"
            >
              <DocumentArrowDownIcon className="w-5 h-5" />
              Exportar
            </button>
            <button
              onClick={fetchRevenueData}
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
              <span className="text-sm font-medium text-gray-700">Rango de fechas:</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                type="date"
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateChange}
                className="input-field py-2 px-3 text-sm w-auto"
              />
              <span className="text-gray-500 self-center">→</span>
              <input
                type="date"
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateChange}
                className="input-field py-2 px-3 text-sm w-auto"
              />
            </div>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => {
                  const today = new Date();
                  setDateRange({
                    startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
                    endDate: today.toISOString().split('T')[0]
                  });
                }}
                className="btn-secondary text-sm py-1 px-3"
              >
                Este Mes
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const start = new Date(today);
                  start.setMonth(start.getMonth() - 1);
                  setDateRange({
                    startDate: start.toISOString().split('T')[0],
                    endDate: today.toISOString().split('T')[0]
                  });
                }}
                className="btn-secondary text-sm py-1 px-3"
              >
                Último Mes
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <StatCard
            title="Ingresos Totales"
            value={formatCurrency(revenueData.totalRevenue)}
            icon={CurrencyDollarIcon}
            color="bg-green-500"
            subtitle={`${revenueData.totalOrders} pedidos`}
          />
          <StatCard
            title="Promedio por Pedido"
            value={formatCurrency(revenueData.averageOrderValue)}
            icon={ChartBarIcon}
            color="bg-blue-500"
          />
          <StatCard
            title="Ingresos Pagados"
            value={formatCurrency(revenueData.paidRevenue)}
            icon={CheckIcon}
            color="bg-primary-500"
            subtitle={`${revenueData.transactions.filter(o => o.estado === 'ENTREGADO').length} entregados`}
          />
          <StatCard
            title="Ingresos Pendientes"
            value={formatCurrency(revenueData.pendingRevenue)}
            icon={ClockIcon}
            color="bg-yellow-500"
            subtitle={`${revenueData.transactions.filter(o => o.estado === 'PENDIENTE').length} pendientes`}
          />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Ingresos Mensuales */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5 text-primary-600" />
              Ingresos por Mes
            </h3>
            <div className="space-y-3">
              {revenueData.monthlyRevenue.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay datos disponibles</p>
              ) : (
                revenueData.monthlyRevenue.map((item, index) => {
                  const max = Math.max(...revenueData.monthlyRevenue.map(m => m.total), 1);
                  const percentage = (item.total / max) * 100;
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-600 w-20 truncate">{item.month}</span>
                      <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(percentage, 5)}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-24 text-right">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Ingresos por Vendedor */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <UserGroupIcon className="w-5 h-5 text-purple-600" />
              Ingresos por Vendedor
            </h3>
            <div className="space-y-3">
              {revenueData.revenueByVendor.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay datos disponibles</p>
              ) : (
                revenueData.revenueByVendor.map((item, index) => {
                  const max = Math.max(...revenueData.revenueByVendor.map(v => v.total), 1);
                  const percentage = (item.total / max) * 100;
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-600 w-28 truncate">{item.vendor}</span>
                      <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(percentage, 5)}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-24 text-right">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Productos más vendidos */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ShoppingBagIcon className="w-5 h-5 text-orange-600" />
            Productos más Vendidos
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {revenueData.revenueByProduct.length === 0 ? (
              <p className="text-gray-500 text-center col-span-full py-8">No hay datos disponibles</p>
            ) : (
              revenueData.revenueByProduct.map((item, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                  <div className="text-2xl font-bold text-primary-600">{item.quantity}</div>
                  <p className="text-sm font-medium text-gray-700 mt-1 truncate">{item.product}</p>
                  <span className="text-xs text-gray-400">unidades vendidas</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Transacciones Recientes */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-gray-600" />
              Transacciones Recientes
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pedido</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {revenueData.transactions.slice(0, 10).map((order) => (
                  <tr key={order._id || order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      #{order._id?.slice(0, 8) || order.id?.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{order.compradorNombre}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{order.vendedorNombre}</td>
                    <td className="px-4 py-3 text-sm font-bold text-primary-600">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        order.estado === 'ENTREGADO' || order.estado === 'CONFIRMADO' 
                          ? 'bg-green-100 text-green-800' 
                          : order.estado === 'PENDIENTE'
                          ? 'bg-yellow-100 text-yellow-800'
                          : order.estado === 'CANCELADO'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {order.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(order.fecha).toLocaleDateString('es-ES')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRevenue;