import React from 'react';
import { Link } from 'react-router-dom';
import { EnvelopeIcon, MapPinIcon, PhoneIcon } from '@heroicons/react/24/outline';

const Footer = () => (
  <footer className="site-footer">
    <div className="page-shell footer-grid">
      <div className="footer-brand-block">
        <Link to="/" className="brand footer-brand"><span className="brand-mark"><span>B</span></span><span className="brand-name">Byte<span>Verse</span></span></Link>
        <p>Tecnología confiable, asesoría humana y una experiencia de compra sin vueltas.</p>
        <span className="footer-location"><MapPinIcon /> Lima, Perú</span>
      </div>
      <div><h3>Explora</h3><Link to="/">Inicio</Link><Link to="/products">Todos los productos</Link><Link to="/products?categoria=Laptops">Laptops</Link><Link to="/products?categoria=Smartphones">Smartphones</Link></div>
      <div><h3>Tu cuenta</h3><Link to="/login">Iniciar sesión</Link><Link to="/register">Crear cuenta</Link><Link to="/orders">Mis pedidos</Link><Link to="/cart">Mi carrito</Link></div>
      <div className="footer-contact"><h3>Estamos para ayudarte</h3><a href="mailto:info@byteverse.com"><EnvelopeIcon /> info@byteverse.com</a><a href="tel:+51123456789"><PhoneIcon /> +51 123 456 789</a><p>Lunes a sábado<br />9:00 a. m. — 7:00 p. m.</p></div>
    </div>
    <div className="page-shell footer-bottom"><p>© {new Date().getFullYear()} ByteVerse. Todos los derechos reservados.</p><div><span>Privacidad</span><span>Términos</span></div></div>
  </footer>
);

export default Footer;
