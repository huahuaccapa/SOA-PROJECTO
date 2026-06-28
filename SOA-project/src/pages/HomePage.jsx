//src\pages\HomePage.jsx
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  ShoppingBag, Zap, Shield, Truck, ArrowRight, 
  Heart, Target, Eye, MapPin, Phone, Mail, Clock, 
  Award, Users, Star, TrendingUp, Headphones, Package
} from 'lucide-react'

const HomePage = () => {
  const { isAuthenticated, user } = useAuth()
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    setAnimated(true)
  }, [])

  const stats = [
    { value: '5000+', label: 'Clientes Felices', icon: <Users className="w-5 h-5" /> },
    { value: '1000+', label: 'Productos', icon: <Package className="w-5 h-5" /> },
    { value: '98%', label: 'Satisfacción', icon: <Star className="w-5 h-5" /> },
    { value: '24/7', label: 'Soporte', icon: <Headphones className="w-5 h-5" /> },
  ]

  const values = [
    { icon: <Heart className="w-6 h-6 text-cyan-400" />, title: 'Pasión por la Tecnología', description: 'Amamos lo que hacemos y nos apasiona innovar constantemente.' },
    { icon: <Users className="w-6 h-6 text-cyan-400" />, title: 'Enfoque al Cliente', description: 'Tu satisfacción es nuestra prioridad número uno.' },
    { icon: <Award className="w-6 h-6 text-cyan-400" />, title: 'Excelencia', description: 'Buscamos la perfección en cada detalle.' },
    { icon: <TrendingUp className="w-6 h-6 text-cyan-400" />, title: 'Innovación', description: 'Siempre a la vanguardia tecnológica.' },
  ]

  const team = [
    { name: 'Carlos Rodríguez', role: 'CEO & Fundador', image: 'https://randomuser.me/api/portraits/men/1.jpg' },
    { name: 'Ana Martínez', role: 'CTO', image: 'https://randomuser.me/api/portraits/women/2.jpg' },
    { name: 'Miguel Torres', role: 'Lead Developer', image: 'https://randomuser.me/api/portraits/men/3.jpg' },
    { name: 'Laura Fernández', role: 'UX Director', image: 'https://randomuser.me/api/portraits/women/4.jpg' },
  ]

  return (
    <div className={`space-y-16 transition-all duration-1000 ${animated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
      
      {/* Hero Section - Quiénes Somos */}
      <section className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/40 to-purple-900/40"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500 rounded-full blur-[100px] opacity-20 animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500 rounded-full blur-[120px] opacity-20 animate-pulse delay-1000"></div>
        </div>
        
        <div className="relative z-10 p-12 text-center">
          <div className="inline-block p-3 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 mb-6">
            <Zap className="w-12 h-12 text-cyan-400 animate-pulse-glow" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4">
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
              ByteVerse
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-cyan-300 mb-4 neon-text">Innovación que conecta el futuro</p>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Somos una empresa tecnológica dedicada a transformar la experiencia de compra 
            a través de soluciones innovadoras y servicios de alta calidad.
          </p>
          <div className="flex flex-wrap gap-4 justify-center mt-8">
            <Link to="/products" className="btn-primary flex items-center gap-2 group">
              Conoce Nuestros Productos
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            {!isAuthenticated && (
              <Link to="/register" className="btn-secondary">
                Únete como Comprador
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Bienvenida personalizada */}
      {isAuthenticated && (
        <div className="glass-effect p-5 rounded-xl border-l-4 border-cyan-500 animate-fadeInUp">
          <p className="text-cyan-300 text-lg">
            ✨ ¡Bienvenido de vuelta, <strong className="text-cyan-400">{user?.nombre}</strong>! 
            {user?.rol === 'ADMIN' && ' Tienes acceso al panel de administración.'}
            {user?.rol === 'VENDEDOR' && ' Gestiona tus productos en tu panel de vendedor.'}
            {user?.rol === 'COMPRADOR' && ' Explora nuestras increíbles ofertas.'}
          </p>
        </div>
      )}

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="card p-6 text-center group hover:scale-105 transition-all duration-300">
            <div className="flex justify-center mb-3 text-cyan-400 group-hover:scale-110 transition-transform">
              {stat.icon}
            </div>
            <p className="text-3xl font-bold text-white">{stat.value}</p>
            <p className="text-gray-400 text-sm">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* Misión y Visión */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="card p-8 group hover:border-cyan-500/50 transition-all duration-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20">
              <Target className="w-8 h-8 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Nuestra Misión</h2>
          </div>
          <p className="text-gray-300 leading-relaxed">
            Democratizar el acceso a la tecnología de vanguardia, ofreciendo productos y servicios 
            de alta calidad a través de una plataforma segura, confiable y fácil de usar, 
            conectando a compradores y vendedores en un ecosistema digital innovador.
          </p>
        </div>

        <div className="card p-8 group hover:border-purple-500/50 transition-all duration-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-cyan-500/20">
              <Eye className="w-8 h-8 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Nuestra Visión</h2>
          </div>
          <p className="text-gray-300 leading-relaxed">
            Ser la plataforma tecnológica líder en Latinoamérica, reconocida por nuestra 
            innovación constante, excelencia en servicio y contribución al desarrollo del 
            e-commerce en la región, transformando la forma en que las personas compran y venden tecnología.
          </p>
        </div>
      </section>

      {/* Valores Corporativos */}
      <section>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Nuestros Valores
          </h2>
          <p className="text-gray-400 mt-2">Lo que nos define como empresa</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => (
            <div key={index} className="card p-6 text-center group hover:translate-y-[-10px] transition-all duration-300">
              <div className="flex justify-center mb-4 group-hover:scale-110 transition-transform">
                {value.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{value.title}</h3>
              <p className="text-gray-400 text-sm">{value.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ubicación - Universidad Tecnológica del Perú en Arequipa */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card p-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-cyan-400" />
            Nuestra Ubicación
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-cyan-400 mt-1 flex-shrink-0" />
              <div>
                <p className="text-gray-300 font-semibold">Universidad Tecnológica del Perú - UTP</p>
                <p className="text-gray-400">Campus Arequipa</p>
                <p className="text-gray-400">Av. Ejército 1234, Cerro Colorado</p>
                <p className="text-gray-400">Arequipa - Perú</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-cyan-400" />
              <p className="text-gray-300">+51 (54) 555-1234</p>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-cyan-400" />
              <p className="text-gray-300">contacto@byteverse.com</p>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-gray-300">Lunes a Viernes: 9:00 - 18:00</p>
                <p className="text-gray-400 text-sm">Sábados: 10:00 - 14:00</p>
              </div>
            </div>
          </div>
          
          {/* Mapa de la UTP Arequipa */}
          <div className="mt-6 rounded-xl overflow-hidden h-48">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3827.123456789!2d-71.5365!3d-16.4090!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x91424a5c5c5c5c5c%3A0x1234567890abcdef!2sUniversidad%20Tecnol%C3%B3gica%20del%20Per%C3%BA%20-%20Campus%20Arequipa!5e0!3m2!1ses!2spe!4v1700000000000!5m2!1ses!2spe" 
              width="100%" 
              height="100%" 
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              title="UTP Arequipa - ByteVerse"
            ></iframe>
          </div>
        </div>

        <div className="card p-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Mail className="w-6 h-6 text-cyan-400" />
            Contáctanos
          </h2>
          <form className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="Nombre" className="input-field" />
              <input type="email" placeholder="Email" className="input-field" />
            </div>
            <input type="text" placeholder="Asunto" className="input-field" />
            <textarea rows="4" placeholder="Mensaje" className="input-field resize-none"></textarea>
            <button type="submit" className="btn-primary w-full">
              Enviar Mensaje
            </button>
          </form>
        </div>
      </section>

      {/* Equipo */}
      <section>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Nuestro Equipo
          </h2>
          <p className="text-gray-400 mt-2">Los expertos detrás de ByteVerse</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {team.map((member, index) => (
            <div key={index} className="card p-6 text-center group">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <img 
                  src={member.image} 
                  alt={member.name}
                  className="w-full h-full rounded-full object-cover border-2 border-cyan-500/50 group-hover:border-cyan-400 transition-all duration-300"
                />
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <h3 className="text-lg font-semibold text-white">{member.name}</h3>
              <p className="text-cyan-400 text-sm">{member.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 to-purple-600/20"></div>
        <div className="relative z-10 p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            ¿Listo para ser parte de ByteVerse?
          </h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Únete a nuestra comunidad y descubre una nueva forma de comprar tecnología.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/register" className="btn-primary">
              Crear Cuenta Gratis
            </Link>
            <Link to="/products" className="btn-secondary">
              Ver Productos
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage