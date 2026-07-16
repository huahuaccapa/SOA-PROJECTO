import React from 'react';
import { ArrowPathIcon, ExclamationTriangleIcon, HomeIcon } from '@heroicons/react/24/outline';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Ocurrió un error inesperado al mostrar esta sección.',
    };
  }

  componentDidCatch(error, info) {
    console.error('Error de interfaz ByteVerse:', error, info);
  }

  reset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="app-error-boundary">
        <div className="app-error-card">
          <span className="app-error-icon"><ExclamationTriangleIcon /></span>
          <span className="commerce-eyebrow">La página no pudo cargarse</span>
          <h1>No mostraremos una pantalla en blanco</h1>
          <p>{this.state.message}</p>
          <div className="app-error-actions">
            <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
              <ArrowPathIcon /> Recargar página
            </button>
            <a className="btn-secondary" href="/">
              <HomeIcon /> Ir al inicio
            </a>
          </div>
          <button type="button" className="app-error-try" onClick={this.reset}>Intentar mostrar nuevamente</button>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
