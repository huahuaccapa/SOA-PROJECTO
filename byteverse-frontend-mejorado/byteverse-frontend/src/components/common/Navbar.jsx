import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  ChartBarIcon,
  ChevronDownIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  Squares2X2Icon,
  TagIcon,
  UserGroupIcon,
  UserIcon,
  UsersIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../hooks/useCart';

const roleLinks = {
  ADMIN: [
    { name: 'Resumen', path: '/admin', icon: Squares2X2Icon },
    { name: 'Usuarios', path: '/admin/users', icon: UsersIcon },
    { name: 'Vendedores', path: '/admin/vendors', icon: UserGroupIcon },
    { name: 'Productos', path: '/admin/products', icon: ShoppingBagIcon },
    { name: 'Categorías', path: '/admin/categories', icon: TagIcon },
    { name: 'Pedidos', path: '/admin/orders', icon: ClipboardDocumentListIcon },
    { name: 'Ingresos', path: '/admin/revenue', icon: CurrencyDollarIcon },
    { name: 'Analytics', path: '/admin/analytics', icon: ChartBarIcon },
    { name: 'Mi perfil', path: '/admin/profile', icon: UserIcon },
  ],
  VENDEDOR: [
    { name: 'Resumen', path: '/vendor', icon: Squares2X2Icon },
    { name: 'Mis productos', path: '/vendor/products', icon: ShoppingBagIcon },
    { name: 'Buscar cliente', path: '/vendor/search-client', icon: MagnifyingGlassIcon },
    { name: 'Mis pedidos', path: '/vendor/orders', icon: ClipboardDocumentListIcon },
    { name: 'Carrito de ventas', path: '/vendor/cart', icon: ShoppingCartIcon },
    { name: 'Reportes', path: '/vendor/reports', icon: DocumentTextIcon },
    { name: 'Mi perfil', path: '/vendor/profile', icon: UserIcon },
  ],
  COMPRADOR: [
    { name: 'Mis pedidos', path: '/orders', icon: ClipboardDocumentListIcon },
    { name: 'Mi perfil', path: '/profile', icon: UserIcon },
  ],
};

const Navbar = () => {
  const { user, isAuthenticated, logout, isBuyer } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const workspaceLinks = isAuthenticated ? (roleLinks[user?.role] || []) : [];

  const closeMobile = () => setMobileOpen(false);
  const handleLogout = () => {
    logout();
    closeMobile();
    navigate('/');
  };

  const navClass = ({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`;

  return (
    <>
      <div className="announcement-bar">
        <span>Envíos a todo el Perú</span>
        <span className="announcement-dot" />
        <span>Compra segura y soporte especializado</span>
      </div>
      <nav className="site-nav" aria-label="Navegación principal">
        <div className="site-nav-inner">
          <Link to="/" className="brand" aria-label="ByteVerse, ir al inicio">
            <span className="brand-mark"><span>B</span></span>
            <span className="brand-name">Byte<span>Verse</span></span>
          </Link>

          <div className="desktop-nav">
            <NavLink to="/" end className={navClass}>Inicio</NavLink>
            <NavLink to="/products" className={navClass}>Catálogo</NavLink>

            {workspaceLinks.length > 0 && (
              <Menu as="div" className="nav-menu-wrap">
                <Menu.Button className="nav-link nav-menu-button">
                  Mi espacio <ChevronDownIcon className="nav-chevron" />
                </Menu.Button>
                <Transition
                  enter="transition duration-150 ease-out"
                  enterFrom="opacity-0 -translate-y-2"
                  enterTo="opacity-100 translate-y-0"
                  leave="transition duration-100 ease-in"
                  leaveFrom="opacity-100 translate-y-0"
                  leaveTo="opacity-0 -translate-y-2"
                >
                  <Menu.Items className="workspace-menu">
                    <div className="workspace-menu-head">
                      <span>Espacio de trabajo</span>
                      <small>{user?.role?.toLowerCase()}</small>
                    </div>
                    <div className="workspace-grid">
                      {workspaceLinks.map((item) => (
                        <Menu.Item key={item.path}>
                          {({ active }) => (
                            <Link to={item.path} className={`workspace-link ${active ? 'workspace-link-active' : ''}`}>
                              <item.icon />
                              <span>{item.name}</span>
                            </Link>
                          )}
                        </Menu.Item>
                      ))}
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
            )}
          </div>

          <div className="nav-actions">
            {isAuthenticated && isBuyer() && (
              <Link to="/cart" className="cart-button" aria-label={`Carrito con ${totalItems} productos`}>
                <ShoppingCartIcon />
                {totalItems > 0 && <span>{totalItems}</span>}
              </Link>
            )}

            {isAuthenticated ? (
              <Menu as="div" className="profile-wrap">
                <Menu.Button className="profile-button">
                  <span className="profile-avatar">{user?.nombre?.charAt(0)?.toUpperCase() || 'U'}</span>
                  <span className="profile-copy">
                    <strong>{user?.nombre?.split(' ')[0] || 'Usuario'}</strong>
                    <small>{user?.role?.toLowerCase()}</small>
                  </span>
                  <ChevronDownIcon />
                </Menu.Button>
                <Transition
                  enter="transition duration-150 ease-out"
                  enterFrom="opacity-0 -translate-y-2"
                  enterTo="opacity-100 translate-y-0"
                  leave="transition duration-100 ease-in"
                  leaveFrom="opacity-100 translate-y-0"
                  leaveTo="opacity-0 -translate-y-2"
                >
                  <Menu.Items className="profile-menu">
                    <div className="profile-menu-user">
                      <strong>{user?.nombre}</strong>
                      <span>{user?.email}</span>
                    </div>
                    <Menu.Item>
                      {({ active }) => (
                        <button onClick={handleLogout} className={`logout-link ${active ? 'active' : ''}`}>
                          <ArrowRightOnRectangleIcon /> Cerrar sesión
                        </button>
                      )}
                    </Menu.Item>
                  </Menu.Items>
                </Transition>
              </Menu>
            ) : (
              <div className="guest-actions">
                <Link to="/login" className="login-link">Iniciar sesión</Link>
                <Link to="/register" className="nav-cta">Crear cuenta</Link>
              </div>
            )}

            <button
              type="button"
              className="mobile-toggle"
              onClick={() => setMobileOpen((open) => !open)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {mobileOpen ? <XMarkIcon /> : <Bars3Icon />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="mobile-menu">
            <NavLink to="/" end className={navClass} onClick={closeMobile}>Inicio</NavLink>
            <NavLink to="/products" className={navClass} onClick={closeMobile}>Catálogo</NavLink>
            {workspaceLinks.map((item) => (
              <NavLink key={item.path} to={item.path} className={navClass} onClick={closeMobile}>
                <item.icon /> {item.name}
              </NavLink>
            ))}
            {isAuthenticated && isBuyer() && (
              <NavLink to="/cart" className={navClass} onClick={closeMobile}>
                <ShoppingCartIcon /> Carrito {totalItems > 0 ? `(${totalItems})` : ''}
              </NavLink>
            )}
            <div className="mobile-auth">
              {isAuthenticated ? (
                <button type="button" onClick={handleLogout}><ArrowRightOnRectangleIcon /> Cerrar sesión</button>
              ) : (
                <>
                  <Link to="/login" onClick={closeMobile}>Iniciar sesión</Link>
                  <Link to="/register" className="nav-cta" onClick={closeMobile}>Crear cuenta</Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;
