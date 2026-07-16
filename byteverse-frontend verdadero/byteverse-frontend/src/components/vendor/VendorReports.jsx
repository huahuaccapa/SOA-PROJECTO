// src/components/vendor/VendorReports.jsx
import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  ClipboardDocumentListIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  ShoppingBagIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const VendorReports = () => {
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reports, setReports] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    ordersByDay: [],
    topProducts: [],
    monthlyRevenue: [],
    recentOrders: []
  });

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  // ✅ ACTUALIZADO: vendorId → vendedorId
  const fetchReports = async () => {
    setLoading(true);
    try {
      const ordersRes = await api.get(`/orders?vendedorId=${user.id}`);
      const orders = ordersRes.data || [];

      // Filtrar por fecha
      const filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.fecha).toISOString().split('T')[0];
        return orderDate >= dateRange.startDate && orderDate <= dateRange.endDate;
      });

      const totalOrders = filteredOrders.length;
      const totalRevenue = filteredOrders.reduce((acc, o) => acc + (o.total || 0), 0);
      const completedOrders = filteredOrders.filter(o => o.estado === 'ENTREGADO' || o.estado === 'CONFIRMADO');
      const pendingOrders = filteredOrders.filter(o => o.estado === 'PENDIENTE');
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Productos más vendidos
      const productSales = {};
      filteredOrders.forEach(order => {
        (order.productos || []).forEach(item => {
          const productName = item.nombre || 'Producto';
          productSales[productName] = (productSales[productName] || 0) + (item.cantidad || 0);
        });
      });

      const topProducts = Object.entries(productSales)
        .map(([product, quantity]) => ({ product, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      // Ingresos por mes
      const monthlyRevenue = {};
      filteredOrders.forEach(order => {
        const month = new Date(order.fecha).toLocaleString('es-ES', { month: 'short', year: 'numeric' });
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (order.total || 0);
      });

      const monthlyData = Object.entries(monthlyRevenue)
        .map(([month, total]) => ({ month, total }))
        .sort((a, b) => {
          const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
          return months.indexOf(a.month.split(' ')[0]) - months.indexOf(b.month.split(' ')[0]);
        });

      // Pedidos por día
      const ordersByDay = {};
      filteredOrders.forEach(order => {
        const day = new Date(order.fecha).toISOString().split('T')[0];
        ordersByDay[day] = (ordersByDay[day] || 0) + 1;
      });

      const ordersByDayData = Object.entries(ordersByDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setReports({
        totalOrders,
        totalRevenue,
        averageOrderValue,
        pendingOrders: pendingOrders.length,
        completedOrders: completedOrders.length,
        ordersByDay: ordersByDayData,
        topProducts,
        monthlyRevenue: monthlyData,
        recentOrders: filteredOrders.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 10)
      });

    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return `S/ ${value?.toFixed(2) || '0.00'}`;
  };

  const exportReport = () => {
    try {
      const data = reports.recentOrders.map(order => ({
        'ID': order._id?.slice(0, 8),
        'Fecha': new Date(order.fecha).toLocaleDateString('es-ES'),
        'Cliente': order.compradorNombre,
        'Productos': order.productos?.length || 0,
        'Total': order.total,
        'Estado': order.estado
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
      a.download = `reporte_ventas_${dateRange.startDate}_${dateRange.endDate}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Reporte exportado exitosamente');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Error al exportar reporte');
    }
  };

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <ChartBarIcon className="w-8 h-8 text-primary-600" />
              Mis Reportes
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Análisis de tus ventas y rendimiento</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={exportReport} className="btn-secondary flex items-center gap-2">
              <DocumentArrowDownIcon className="w-5 h-5" />
              Exportar
            </button>
            <button onClick={fetchReports} className="btn-primary flex items-center gap-2">
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
              <input type="date" name="startDate" value={dateRange.startDate} onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})} className="input-field py-2 px-3 text-sm w-auto" />
              <span className="text-gray-500 self-center">→</span>
              <input type="date" name="endDate" value={dateRange.endDate} onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})} className="input-field py-2 px-3 text-sm w-auto" />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-primary-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Ventas</p>
                <p className="text-2xl font-bold text-gray-900">{reports.totalOrders}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500">
                <ClipboardDocumentListIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Ingresos</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(reports.totalRevenue)}</p>
              </div>
              <div className="p-3 rounded-full bg-green-500">
                <CurrencyDollarIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Promedio por Pedido</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(reports.averageOrderValue)}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-500">
                <ChartBarIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Completados</p>
                <p className="text-2xl font-bold text-gray-900">{reports.completedOrders}</p>
                <p className="text-xs text-gray-400">{reports.pendingOrders} pendientes</p>
              </div>
              <div className="p-3 rounded-full bg-purple-500">
                <ArrowTrendingUpIcon className="w-6 h-6 text-white" />
              </div>
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
            {reports.topProducts.length === 0 ? (
              <p className="text-gray-500 text-center col-span-full py-8">No hay datos disponibles</p>
            ) : (
              reports.topProducts.map((item, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                  <div className="text-2xl font-bold text-primary-600">{item.quantity}</div>
                  <p className="text-sm font-medium text-gray-700 mt-1 truncate">{item.product}</p>
                  <span className="text-xs text-gray-400">unidades vendidas</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Transacciones recientes */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-gray-600" />
              Ventas Recientes
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pedido</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Productos</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.recentOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">#{order._id?.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{order.compradorNombre}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{order.productos?.length || 0}</td>
                    <td className="px-4 py-3 text-sm font-bold text-primary-600">{formatCurrency(order.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        order.estado === 'ENTREGADO' || order.estado === 'CONFIRMADO' 
                          ? 'bg-green-100 text-green-800' 
                          : order.estado === 'PENDIENTE'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
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

export default VendorReports;