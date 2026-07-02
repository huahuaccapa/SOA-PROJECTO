import React from 'react';

const Loading = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        <p className="text-gray-600 font-medium">Cargando...</p>
      </div>
    </div>
  );
};

export default Loading;