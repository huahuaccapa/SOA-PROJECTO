import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRightIcon, CheckCircleIcon, EnvelopeIcon, LockClosedIcon, ShieldCheckIcon, UserIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', email: '', password: '', confirmPassword: '' });

  const updateField = (event) => setFormData({ ...formData, [event.target.name]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (formData.password !== formData.confirmPassword) return toast.error('Las contraseñas no coinciden');
    if (formData.password.length < 6) return toast.error('La contraseña debe tener al menos 6 caracteres');

    setLoading(true);
    const { confirmPassword, ...userData } = formData;
    const result = await register({ ...userData, role: 'COMPRADOR' });
    if (result.success) navigate('/login');
    else toast.error(result.error);
    setLoading(false);
  };

  return (
    <main className="auth-page auth-register-page">
      <section className="auth-story">
        <div className="auth-story-inner">
          <Link to="/" className="auth-brand"><span className="brand-mark"><span>B</span></span><span className="brand-name">Byte<span>Verse</span></span></Link>
          <div className="auth-story-copy">
            <span className="auth-kicker">EMPIEZA EN SEGUNDOS</span>
            <h1>La tecnología que buscas, más cerca.</h1>
            <p>Crea tu cuenta de comprador y disfruta una experiencia hecha para ti.</p>
            <ul>
              <li><CheckCircleIcon /> Compra con total tranquilidad</li>
              <li><CheckCircleIcon /> Consulta el estado de tus pedidos</li>
              <li><CheckCircleIcon /> Descubre productos seleccionados</li>
            </ul>
          </div>
          <div className="auth-security"><ShieldCheckIcon /><span><strong>Registro protegido</strong><small>Tus datos viajan seguros</small></span></div>
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-card auth-card-register">
          <div className="auth-heading"><span className="mobile-auth-logo">B</span><h2>Crea tu cuenta</h2><p>Completa tus datos para unirte a ByteVerse.</p></div>
          <form onSubmit={handleSubmit} className="auth-form">
            <label><span>Nombre completo</span><div className="auth-input-wrap"><UserIcon /><input type="text" name="nombre" value={formData.nombre} onChange={updateField} required autoComplete="name" placeholder="Tu nombre y apellido" /></div></label>
            <label><span>Correo electrónico</span><div className="auth-input-wrap"><EnvelopeIcon /><input type="email" name="email" value={formData.email} onChange={updateField} required autoComplete="email" placeholder="nombre@correo.com" /></div></label>
            <div className="auth-form-grid">
              <label><span>Contraseña</span><div className="auth-input-wrap"><LockClosedIcon /><input type="password" name="password" value={formData.password} onChange={updateField} required minLength="6" autoComplete="new-password" placeholder="Mínimo 6 caracteres" /></div></label>
              <label><span>Confirmar</span><div className="auth-input-wrap"><LockClosedIcon /><input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={updateField} required autoComplete="new-password" placeholder="Repite la contraseña" /></div></label>
            </div>
            <p className="buyer-note"><CheckCircleIcon /> Tu cuenta se creará con el perfil de comprador.</p>
            <button type="submit" className="auth-submit" disabled={loading}>{loading ? 'Creando tu cuenta...' : <>Crear cuenta <ArrowRightIcon /></>}</button>
          </form>
          <p className="auth-switch">¿Ya tienes una cuenta? <Link to="/login">Iniciar sesión</Link></p>
        </div>
      </section>
    </main>
  );
};

export default Register;
