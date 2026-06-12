import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { orderService } from '../services/orderService'
import { User, MapPin, Package, Edit, Save, X } from 'lucide-react'

const ProfilePage = () => {
  const { user, token, updateUser } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: {
      linea: '',
      referencia: ''
    }
  })

  useEffect(() => {
    if (user) {
      setFormData({
        nombre: user.nombre || '',
        direccion: {
          linea: user.direccion?.linea || '',
          referencia: user.direccion?.referencia || ''
        }
      })
    }
    loadOrders()
  }, [user])

  const loadOrders = async () => {
    setLoading(true)
    const data = await orderService.getOrders(token)
    setOrders(data)
    setLoading(false)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    if (name.startsWith('direccion.')) {
      const field = name.split('.')[1]
      setFormData({
        ...formData,
        direccion: { ...formData.direccion, [field]: value }
      })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleSave = async () => {
    const result = await updateUser({
      nombre: formData.nombre,
      direccion: formData.direccion
    })
    if (result.success) {
      setEditing(false)
    }
  }

  if (!user) return null

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Mi Perfil</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <User className="mr-2 w-5 h-5" />
                Información Personal
              </h2>
              {!editing ? (
                <button onClick={() => setEditing(true)} className="text-indigo-600 hover:text-indigo-700">
                  <Edit size={18} />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={handleSave} className="text-green-600 hover:text-green-700">
                    <Save size={18} />
                  </button>
                  <button onClick={() => setEditing(false)} className="text-red-600 hover:text-red-700">
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-500">Nombre</label>
                {editing ? (
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    className="input-field mt-1"
                  />
                ) : (
                  <p className="text-lg">{user.nombre}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm text-gray-500">Correo Electrónico</label>
                <p className="text-lg">{user.email}</p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-500">Rol</label>
                <p className="text-lg">
                  <span className={`badge ${user.rol === 'ADMIN' ? 'bg-red-100 text-red-800' : user.rol === 'VENDEDOR' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {user.rol}
                  </span>
                </p>
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <MapPin className="mr-2 w-5 h-5" />
              Dirección de Envío
            </h2>
            
            {user.direccion ? (
              <div className="space-y-2">
                <p><span className="text-gray-500">Departamento:</span> {user.direccion.departamento}</p>
                <p><span className="text-gray-500">Provincia:</span> {user.direccion.provincia}</p>
                <p><span className="text-gray-500">Distrito:</span> {user.direccion.distrito}</p>
                <p><span className="text-gray-500">Dirección:</span> {user.direccion.linea}</p>
                {user.direccion.referencia && (
                  <p><span className="text-gray-500">Referencia:</span> {user.direccion.referencia}</p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No has registrado una dirección</p>
            )}
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Package className="mr-2 w-5 h-5" />
              Resumen de Compras
            </h2>
            
            {loading ? (
              <p className="text-center py-4">Cargando...</p>
            ) : orders.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No tienes compras aún</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {orders.map(order => (
                  <div key={order.id} className="border-b pb-3">
                    <p className="font-medium">Pedido #{order.id}</p>
                    <p className="text-sm text-gray-500">{new Date(order.fecha).toLocaleDateString()}</p>
                    <p className="text-indigo-600 font-bold">S/ {order.total.toFixed(2)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${order.estado === 'CONFIRMADO' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {order.estado}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            <Link to="/orders" className="btn-secondary w-full text-center mt-4 block">
              Ver todos los pedidos
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage