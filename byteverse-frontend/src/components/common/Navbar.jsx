// src/components/common/Navbar.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../hooks/useCart';
import { 
  ShoppingCartIcon, 
  UserIcon, 
  Bars3Icon, 
  XMarkIcon,
  HomeIcon,
  ShoppingBagIcon,
  ChartBarIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  Squares2X2Icon,
  TagIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';

const Navbar = () => {
  const { user, isAuthenticated, logout, isAdmin, isVendor, isBuyer } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ✅ COMPRADOR: Carrito de compras (para comprar)
  // ✅ VENDEDOR: Carrito de ventas (para gestionar pedidos)
  // ✅ ADMIN: Sin carrito
  const showBuyerCart = isAuthenticated && isBuyer();
  const showVendorCart = isAuthenticated && isVendor();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getRoleBasedLinks = () => {
    if (!isAuthenticated) {
      return {
        principal: [],
        gestion: [],
        ventas: [],
        reportes: [],
        personal: []
      };
    }

    // ✅ ADMIN
    if (isAdmin()) {
      return {
        principal: [
          { name: 'Dashboard', path: '/admin', icon: Squares2X2Icon },
        ],
        gestion: [
          { name: 'Usuarios', path: '/admin/users', icon: UsersIcon },
          { name: 'Vendedores', path: '/admin/vendors', icon: UserGroupIcon },
          { name: 'Productos', path: '/admin/products', icon: ShoppingBagIcon },
          { name: 'Categorías', path: '/admin/categories', icon: TagIcon },
        ],
        ventas: [
          { name: 'Pedidos', path: '/admin/orders', icon: ClipboardDocumentListIcon },
          { name: 'Ingresos', path: '/admin/revenue', icon: CurrencyDollarIcon },
          { name: 'Analytics', path: '/admin/analytics', icon: ChartBarIcon },
        ],
        reportes: [],
        personal: [
          { name: 'Perfil', path: '/admin/profile', icon: UserIcon },
        ]
      };
    }

    // ✅ VENDEDOR
    if (isVendor()) {
      return {
        principal: [
          { name: 'Dashboard', path: '/vendor', icon: Squares2X2Icon },
        ],
        gestion: [
          { name: 'Mis Productos', path: '/vendor/products', icon: ShoppingBagIcon },
          { name: 'Buscar Cliente', path: '/vendor/search-client', icon: MagnifyingGlassIcon },
        ],
        ventas: [
          { name: 'Mis Pedidos', path: '/vendor/orders', icon: ClipboardDocumentListIcon },
          { name: 'Carrito Ventas', path: '/vendor/cart', icon: ShoppingCartIcon },
        ],
        reportes: [
          { name: 'Reportes', path: '/vendor/reports', icon: DocumentTextIcon },
        ],
        personal: [
          { name: 'Perfil', path: '/vendor/profile', icon: UserIcon },
        ]
      };
    }

    // ✅ COMPRADOR
    if (isAuthenticated && isBuyer()) {
      return {
        principal: [],
        gestion: [],
        ventas: [
          { name: 'Mis Pedidos', path: '/orders', icon: ClipboardDocumentListIcon },
        ],
        reportes: [],
        personal: [
          { name: 'Perfil', path: '/profile', icon: UserIcon },
        ]
      };
    }

    return { principal: [], gestion: [], ventas: [], reportes: [], personal: [] };
  };

  const links = getRoleBasedLinks();

  const renderLinkGroup = (group) => {
    if (!group || group.length === 0) return null;
    return group.map((link) => (
      <Link
        key={link.path}
        to={link.path}
        className="px-3 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200 flex items-center gap-1.5"
      >
        <link.icon className="w-5 h-5" />
        <span>{link.name}</span>
      </Link>
    ));
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">B</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                ByteVerse
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {/* Enlaces públicos */}
            <Link to="/" className="px-3 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200 flex items-center space-x-1">
              <HomeIcon className="w-5 h-5" />
              <span>Inicio</span>
            </Link>
            
            <Link to="/products" className="px-3 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200 flex items-center space-x-1">
              <ShoppingBagIcon className="w-5 h-5" />
              <span>Productos</span>
            </Link>

            {/* Solo si está autenticado */}
            {isAuthenticated && (
              <>
                <div className="w-px h-8 bg-gray-200 mx-1"></div>

                {/* Principal (Dashboard) */}
                {renderLinkGroup(links.principal)}

                {/* Gestión */}
                {(links.principal.length > 0 && links.gestion.length > 0) && (
                  <div className="w-px h-8 bg-gray-200 mx-1"></div>
                )}
                {renderLinkGroup(links.gestion)}

                {/* Ventas */}
                {(links.gestion.length > 0 && links.ventas.length > 0) && (
                  <div className="w-px h-8 bg-gray-200 mx-1"></div>
                )}
                {renderLinkGroup(links.ventas)}

                {/* Reportes */}
                {(links.ventas.length > 0 && links.reportes.length > 0) && (
                  <div className="w-px h-8 bg-gray-200 mx-1"></div>
                )}
                {renderLinkGroup(links.reportes)}

                {/* Personal */}
                {(links.reportes.length > 0 && links.personal.length > 0) && (
                  <div className="w-px h-8 bg-gray-200 mx-1"></div>
                )}
                {renderLinkGroup(links.personal)}

                {/* ✅ Carrito para COMPRADOR (compras) */}
                {showBuyerCart && (
                  <>
                    <div className="w-px h-8 bg-gray-200 mx-1"></div>
                    <Link to="/cart" className="relative px-3 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200">
                      <ShoppingCartIcon className="w-6 h-6" />
                      {totalItems > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                          {totalItems}
                        </span>
                      )}
                    </Link>
                  </>
                )}

                <div className="w-px h-8 bg-gray-200 mx-1"></div>
              </>
            )}

            {/* Auth Buttons */}
            {isAuthenticated ? (
              <Menu as="div" className="relative">
                <Menu.Button className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-primary-50 transition-all duration-200">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold ${
                    isAdmin() ? 'bg-gradient-to-r from-red-500 to-red-600' :
                    isVendor() ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                    'bg-gradient-to-r from-primary-500 to-secondary-500'
                  }`}>
                    {user?.nombre?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm font-medium text-gray-700 max-w-[100px] truncate">
                    {user?.nombre?.split(' ')[0] || 'Usuario'}
                  </span>
                  {isAdmin() && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Admin</span>
                  )}
                  {isVendor() && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Vendedor</span>
                  )}
                </Menu.Button>
                <Transition
                  enter="transition duration-100 ease-out"
                  enterFrom="transform scale-95 opacity-0"
                  enterTo="transform scale-100 opacity-100"
                  leave="transition duration-75 ease-out"
                  leaveFrom="transform scale-100 opacity-100"
                  leaveTo="transform scale-95 opacity-0"
                >
                  <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 ring-1 ring-black ring-opacity-5">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleLogout}
                          className={`${
                            active ? 'bg-red-50' : ''
                          } flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200`}
                        >
                          <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
                          Cerrar Sesión
                        </button>
                      )}
                    </Menu.Item>
                  </Menu.Items>
                </Transition>
              </Menu>
            ) : (
              <div className="flex items-center space-x-2 ml-2">
                <Link to="/login" className="px-4 py-2 rounded-lg text-primary-600 hover:bg-primary-50 transition-all duration-200 font-medium">
                  Iniciar Sesión
                </Link>
                <Link to="/register" className="btn-primary">
                  Registrarse
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            {showBuyerCart && (
              <Link to="/cart" className="relative p-2 text-gray-700 hover:text-primary-600">
                <ShoppingCartIcon className="w-6 h-6" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {totalItems}
                  </span>
                )}
              </Link>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200"
            >
              {isMobileMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 py-2 max-h-[80vh] overflow-y-auto">
          <div className="px-4 space-y-1">
            <Link to="/" className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
              <HomeIcon className="w-5 h-5" />
              <span>Inicio</span>
            </Link>
            <Link to="/products" className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
              <ShoppingBagIcon className="w-5 h-5" />
              <span>Productos</span>
            </Link>

            {isAuthenticated && (
              <>
                <div className="border-t border-gray-200 my-2"></div>

                {/* ADMIN */}
                {isAdmin() && (
                  <>
                    <div className="px-3 py-1"><span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Principal</span></div>
                    <Link to="/admin" className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
                      <Squares2X2Icon className="w-5 h-5" />
                      <span>Dashboard</span>
                    </Link>
                    <div className="px-3 py-1 mt-2"><span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Gestión</span></div>
                    <Link to="/admin/users" className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
                      <UsersIcon className="w-5 h-5" />
                      <span>Usuarios</span>
                    </Link>
                    <Link to="/admin/vendors" className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
                      <UserGroupIcon className="w-5 h-5" />
                      <span>Vendedores</span>
                    </Link>
                    <Link to="/admin/products" className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
                      <ShoppingBagIcon className="w-5 h-5" />
                      <span>Productos</span>
                    </Link>
                    <Link to="/admin/categories" className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
                      <TagIcon className="w-5 h-5" />
                      <span>Categorías</span>
                    </Link>
                    <div className="px-3 py-1 mt-2"><span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ventas</span></div>
                    <Link to="/admin/orders" className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
                      <ClipboardDocumentListIcon className="w-5 h-5" />
                      <span>Pedidos</span>
                    </Link>
                    <Link to="/admin/revenue" className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
                      <CurrencyDollarIcon className="w-5 h-5" />
                      <span>Ingresos</span>
                    </Link>
                    <Link to="/admin/analytics" className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
                      <ChartBarIcon className="w-5 h-5" />
                      <span>Analytics</span>
                    </Link>
                    <div className="px-3 py-1 mt-2"><span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Personal</span></div>
                    <Link to="/admin/profile" className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
                      <UserIcon className="w-5 h-5" />
                      <span>Perfil</span>
                    </Link>
                  </>
                )}

                {/* VENDEDOR */}
                {isVendor() && (
                  <>
                    <Link to="/vendor" className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
                      <Squares2X2Icon className="w-5 h-5" />
                      <span>Dashboard</span>
                    </Link>
                    <Link to="/vendor/products" className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
                      <ShoppingBagIcon className="w-5 h-5" />
                      <span>Mis Productos</span>
                    </Link>
                    <Link to="/vendor/search-client" className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
                      <MagnifyingGlassIcon className="w-5 h-5" />
                      <span>Buscar Cliente</span>
                    </Link>
                    <Link to="/vendor/orders" className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
                      <ClipboardDocumentListIcon className="w-5 h-5" />
                      <span>Mis Pedidos</span>
                    </Link>
                    <Link to="/vendor/cart" className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
                      <ShoppingCartIcon className="w-5 h-5" />
                      <span>Carrito Ventas</span>
                    </Link>
                    <Link to="/vendor/reports" className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
                      <DocumentTextIcon className="w-5 h-5" />
                      <span>Reportes</span>
                    </Link>
                    <Link to="/vendor/profile" className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
                      <UserIcon className="w-5 h-5" />
                      <span>Perfil</span>
                    </Link>
                  </>
                )}

                {/* COMPRADOR */}
                {isBuyer() && (
                  <>
                    <Link to="/orders" className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
                      <ClipboardDocumentListIcon className="w-5 h-5" />
                      <span>Mis Pedidos</span>
                    </Link>
                    <Link to="/profile" className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
                      <UserIcon className="w-5 h-5" />
                      <span>Perfil</span>
                    </Link>
                    <Link to="/cart" className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
                      <ShoppingCartIcon className="w-5 h-5" />
                      <span>Carrito {totalItems > 0 && `(${totalItems})`}</span>
                    </Link>
                  </>
                )}

                <div className="border-t border-gray-200 my-2"></div>
              </>
            )}

            {isAuthenticated ? (
              <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200">
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span>Cerrar Sesión</span>
              </button>
            ) : (
              <>
                <Link to="/login" className="block px-3 py-2 rounded-lg text-primary-600 hover:bg-primary-50 transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
                  Iniciar Sesión
                </Link>
                <Link to="/register" className="block px-3 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-all duration-200 text-center" onClick={() => setIsMobileMenuOpen(false)}>
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;