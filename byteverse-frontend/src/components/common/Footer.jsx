import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">B</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
                ByteVerse
              </span>
            </div>
            <p className="text-sm">
              Tu tienda de tecnología favorita. Encuentra los mejores productos al mejor precio.
            </p>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Enlaces Rápidos</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-primary-400 transition-colors">Inicio</Link></li>
              <li><Link to="/products" className="hover:text-primary-400 transition-colors">Productos</Link></li>
              <li><Link to="/cart" className="hover:text-primary-400 transition-colors">Carrito</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Categorías</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/products?categoria=Laptops" className="hover:text-primary-400 transition-colors">Laptops</Link></li>
              <li><Link to="/products?categoria=Smartphones" className="hover:text-primary-400 transition-colors">Smartphones</Link></li>
              <li><Link to="/products?categoria=Tablets" className="hover:text-primary-400 transition-colors">Tablets</Link></li>
              <li><Link to="/products?categoria=Accesorios" className="hover:text-primary-400 transition-colors">Accesorios</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Contacto</h3>
            <ul className="space-y-2 text-sm">
              <li>📧 info@byteverse.com</li>
              <li>📞 +51 123 456 789</li>
              <li>📍 Lima, Perú</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>© 2024 ByteVerse. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;