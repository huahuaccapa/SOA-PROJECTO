//src\components\Layout\Navbar.jsx
import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useCart } from '../../contexts/CartContext'
import { ShoppingCart, User, LogOut, Shield, Package, Home, Grid, Zap, Menu, X, Store, Sparkles } from 'lucide-react'
import CartModal from '../Cart/CartModal'

const Navbar = () => {
  const { user, logout, isAuthenticated, isAdmin, isVendedor, isInvitado } = useAuth()
  const { getCartCount } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
    setIsMobileMenuOpen(false)
  }

  const navLinks = [
    { to: '/', label: 'Inicio', icon: <Home size={18} />, roles: ['COMPRADOR', 'VENDEDOR', 'ADMIN', 'INVITADO'] },
    { to: '/products', label: 'Productos', icon: <Grid size={18} />, roles: ['COMPRADOR', 'VENDEDOR', 'ADMIN', 'INVITADO'] },
    { to: '/profile', label: 'Mi Perfil', icon: <User size={18} />, roles: ['COMPRADOR', 'VENDEDOR', 'ADMIN'] },
    { to: '/orders', label: 'Mis Pedidos', icon: <Package size={18} />, roles: ['COMPRADOR', 'ADMIN'] },
    { to: '/vendor', label: 'Mi Tienda', icon: <Store size={18} />, roles: ['VENDEDOR'] },
    { to: '/admin', label: 'Admin', icon: <Shield size={18} />, roles: ['ADMIN'] },
  ]

  const filteredLinks = navLinks.filter(link => 
    link.roles.includes(user?.rol) || (link.roles.includes('INVITADO') && isInvitado)
  )

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-black/80 backdrop-blur-xl shadow-2xl' : 'bg-black/50 backdrop-blur-lg'
      } border-b border-cyan-500/30`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="relative">
                <Zap className="w-7 h-7 text-cyan-400 group-hover:text-purple-400 transition-all duration-300 animate-pulse-glow" />
                <div className="absolute inset-0 bg-cyan-400 blur-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent bg-300% animate-gradient">
                ByteVerse
              </span>
              <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/50 animate-pulse">
                SOA
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {filteredLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center space-x-1 px-4 py-2 rounded-lg transition-all duration-300 relative group ${
                    isActive(link.to) 
                      ? 'text-cyan-400 bg-cyan-500/10' 
                      : 'text-gray-300 hover:text-cyan-400 hover:bg-cyan-500/10'
                  }`}
                >
                  {link.icon}
                  <span>{link.label}</span>
                  {isActive(link.to) && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full"></div>
                  )}
                </Link>
              ))}
            </div>

            {/* Right section */}
            <div className="flex items-center space-x-4">
              {/* Cart button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 rounded-lg hover:bg-cyan-500/10 transition-all group"
              >
                <ShoppingCart size={22} className="text-gray-300 group-hover:text-cyan-400 transition-colors" />
                {getCartCount() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse-glow">
                    {getCartCount()}
                  </span>
                )}
              </button>

              {/* User section */}
              {isAuthenticated ? (
                <div className="hidden md:flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-200">{user?.nombre}</p>
                    <p className="text-xs text-cyan-400">{user?.rol}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg hover:bg-red-500/10 transition-all group"
                  >
                    <LogOut size={20} className="text-gray-300 group-hover:text-red-400" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="hidden md:flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 transition-all duration-300 hover:scale-105"
                >
                  <Sparkles size={18} />
                  <span>Iniciar Sesión</span>
                </Link>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-cyan-500/10 transition-all"
              >
                {isMobileMenuOpen ? <X size={24} className="text-cyan-400" /> : <Menu size={24} className="text-gray-300" />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t border-cyan-500/30 space-y-2 animate-fadeInUp">
              {filteredLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                    isActive(link.to)
                      ? 'text-cyan-400 bg-cyan-500/10'
                      : 'text-gray-300 hover:text-cyan-400 hover:bg-cyan-500/10'
                  }`}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              ))}
              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-500/10 transition-all w-full"
                >
                  <LogOut size={18} />
                  <span>Cerrar Sesión</span>
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500"
                >
                  <Sparkles size={18} />
                  <span>Iniciar Sesión</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </nav>

      <CartModal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <div className="h-16"></div>
    </>
  )
}

export default Navbar