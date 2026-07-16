import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="text-9xl font-bold text-primary-600">404</div>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">Página no encontrada</h1>
        <p className="text-gray-600 mt-2">Lo sentimos, la página que buscas no existe</p>
        <Link to="/" className="btn-primary inline-block mt-6">
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
};

export default NotFound;