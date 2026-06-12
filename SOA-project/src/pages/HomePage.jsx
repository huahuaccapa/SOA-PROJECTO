//src\pages\HomePage.jsx
import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ShoppingBag, Zap, Shield, Truck, ArrowRight, Cpu, Globe, Database } from 'lucide-react'

const HomePage = () => {
  const { isAuthenticated, user } = useAuth()

  const features = [
    {
      icon: <Zap className="w-8 h-8 text-cyan-400" />,
      title: 'Alto Rendimiento',
      description: 'Arquitectura SOA para respuestas rápidas y escalables',
    },
    {
      icon: <Shield className="w-8 h-8 text-cyan-400" />,
      title: 'Seguridad OAuth 2.0',
      description: 'Autenticación segura con Google y JWT',
    },
    {
      icon: <Truck className="w-8 h-8 text-cyan-400" />,
      title: 'Envío Rápido',
      description: 'Entrega garantizada en todo el país',
    },
    {
      icon: <ShoppingBag className="w-8 h-8 text-cyan-400" />,
      title: 'Amplio Catálogo',
      description: 'Los mejores productos tecnológicos',
    },
  ]

  const categories = [
    { name: 'Laptops', image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&h=200&fit=crop', color: 'from-cyan-500 to-blue-700' },
    { name: 'Smartphones', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=200&fit=crop', color: 'from-purple-500 to-pink-700' },
    { name: 'Audífonos', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop', color: 'from-green-500 to-emerald-700' },
    { name: 'Accesorios', image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300&h=200&fit=crop', color: 'from-orange-500 to-red-700' },
  ]

  return (
    <div className="animate-float">
      {/* Hero Section */}
      <section className="relative rounded-2xl p-12 mb-12 overflow-hidden glass-effect">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <Cpu className="w-full h-full animate-spin-slow" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <h1 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
              ByteVerse
            </span>
            <span className="block text-2xl text-cyan-300 mt-2 neon-text">
              Tecnología que evoluciona contigo
            </span>
          </h1>
          <p className="text-lg text-gray-300 mb-8">
            Plataforma tecnológica construida sobre Arquitectura Orientada a Servicios (SOA)
            con microservicios escalables, autenticación OAuth2 y pagos seguros.
          </p>
          <div className="flex space-x-4">
            <Link to="/products" className="btn-primary flex items-center group">
              Comprar Ahora
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            {!isAuthenticated && (
              <Link to="/register" className="btn-secondary">
                Registrarse
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Welcome Message */}
      {isAuthenticated && (
        <div className="glass-effect p-4 rounded-lg mb-8 border-l-4 border-cyan-500 animate-pulse-glow">
          <p className="text-cyan-300">
            ⚡ ¡Bienvenido de vuelta, <strong className="text-cyan-400">{user?.nombre}</strong>! 
            {user?.rol === 'ADMIN' && ' Tienes acceso al panel de administración.'}
          </p>
        </div>
      )}

      {/* Features */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-center mb-8 neon-text">¿Por qué ByteVerse?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div key={index} className="card p-6 text-center group hover:border-cyan-500/50">
              <div className="flex justify-center mb-4 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2 text-cyan-300">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-center mb-8 neon-text">Categorías</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => (
            <Link
              key={index}
              to="/products"
              className="relative rounded-xl overflow-hidden group h-48 transform transition-all duration-500 hover:scale-105"
            >
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${category.color} opacity-75`}></div>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-white text-xl font-bold">{category.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Architecture Info */}
      <section className="glass-effect rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-4 neon-text">Arquitectura SOA</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-cyan-400 mb-2 flex items-center gap-2">
              <Globe size={18} />
              Servicios Implementados
            </h3>
            <ul className="space-y-1 text-gray-300">
              <li className="flex items-center gap-2"><span className="text-cyan-400">✓</span> Servicio de Autenticación (OAuth2 + JWT)</li>
              <li className="flex items-center gap-2"><span className="text-cyan-400">✓</span> Servicio de Catálogo de Productos</li>
              <li className="flex items-center gap-2"><span className="text-cyan-400">✓</span> Servicio de Carrito de Compras</li>
              <li className="flex items-center gap-2"><span className="text-cyan-400">✓</span> Servicio de Gestión de Pedidos</li>
              <li className="flex items-center gap-2"><span className="text-cyan-400">✓</span> Servicio de Pagos Electrónicos</li>
              <li className="flex items-center gap-2"><span className="text-cyan-400">✓</span> Servicio de Notificaciones</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-cyan-400 mb-2 flex items-center gap-2">
              <Database size={18} />
              Tecnologías
            </h3>
            <ul className="space-y-1 text-gray-300">
              <li className="flex items-center gap-2"><span className="text-cyan-400">✓</span> React + Vite + Tailwind CSS</li>
              <li className="flex items-center gap-2"><span className="text-cyan-400">✓</span> Spring Boot (Backend - Microservicios)</li>
              <li className="flex items-center gap-2"><span className="text-cyan-400">✓</span> MySQL (Base de datos por servicio)</li>
              <li className="flex items-center gap-2"><span className="text-cyan-400">✓</span> API Gateway + ESB</li>
              <li className="flex items-center gap-2"><span className="text-cyan-400">✓</span> Stripe / PayPal Integración</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage