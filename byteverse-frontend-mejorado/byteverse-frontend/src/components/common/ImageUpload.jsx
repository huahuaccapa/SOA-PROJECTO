import React, { useState, useRef } from 'react';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const ImageUpload = ({ 
  value, 
  onChange, 
  label = 'Imagen',
  multiple = false,
  maxFiles = 5,
  maxSize = 5, // MB
  accept = 'image/*',
  currentImage = ''
}) => {
  const [previews, setPreviews] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  // ✅ Cargar imagen actual si existe
  React.useEffect(() => {
    if (currentImage && typeof currentImage === 'string' && previews.length === 0) {
      setPreviews([{
        url: currentImage,
        id: 'current',
        isCurrent: true
      }]);
    }
  }, [currentImage]);

  // ✅ Manejar preview de imágenes
  const handleFiles = async (files) => {
    const validFiles = [];
    const errors = [];

    Array.from(files).forEach((file) => {
      // Validar tamaño
      if (file.size > maxSize * 1024 * 1024) {
        errors.push(`${file.name} excede el tamaño máximo (${maxSize}MB)`);
        return;
      }

      // Validar tipo
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name} no es una imagen válida`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      errors.forEach(err => toast.error(err));
    }

    if (validFiles.length === 0) return;

    // Crear previews
    const newPreviews = validFiles.map(file => ({
      file,
      url: URL.createObjectURL(file),
      id: Date.now() + Math.random(),
      isCurrent: false
    }));

    setPreviews(prev => {
      // Si es single, reemplazar
      if (!multiple) {
        // Liberar URLs viejas
        prev.forEach(p => {
          if (!p.isCurrent) URL.revokeObjectURL(p.url);
        });
        return newPreviews;
      }
      // Si es múltiple, agregar
      return [...prev, ...newPreviews];
    });

    // ✅ Si es single, devolver el primer archivo
    if (!multiple) {
      onChange(validFiles[0]);
    } else {
      // ✅ Si es múltiple, devolver todos los archivos
      const allFiles = [...previews, ...newPreviews]
        .filter(p => !p.isCurrent)
        .map(p => p.file);
      onChange(allFiles);
    }
  };

  // ✅ Eliminar preview
  const removePreview = (id) => {
    const previewToRemove = previews.find(p => p.id === id);
    if (previewToRemove && !previewToRemove.isCurrent) {
      URL.revokeObjectURL(previewToRemove.url);
    }
    const newPreviews = previews.filter(p => p.id !== id);
    setPreviews(newPreviews);
    
    if (!multiple) {
      onChange(null);
    } else {
      onChange(newPreviews.filter(p => !p.isCurrent).map(p => p.file));
    }
  };

  // ✅ Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFiles(files);
    }
    e.target.value = ''; // Reset input
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-all ${
          isDragging 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="text-center">
          <PhotoIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">
            Arrastra y suelta tus imágenes aquí
          </p>
          <p className="text-sm text-gray-400">
            o haz clic para seleccionar archivos
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Formatos: JPG, PNG, GIF, WebP, SVG • Máx: {maxSize}MB
            {multiple && ` • Hasta ${maxFiles} archivos`}
          </p>
        </div>
      </div>

      {/* ✅ Preview Grid */}
      {previews.length > 0 && (
        <div className={`grid ${multiple ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-1'} gap-3 mt-3`}>
          {previews.map((preview) => (
            <div key={preview.id} className="relative group">
              <img
                src={preview.url}
                alt="Preview"
                className={`w-full ${multiple ? 'h-24' : 'h-48'} object-cover rounded-lg border border-gray-200`}
              />
              {!preview.isCurrent && (
                <button
                  type="button"
                  onClick={() => removePreview(preview.id)}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
              {preview.isCurrent && (
                <span className="absolute bottom-2 left-2 right-2 bg-green-600 bg-opacity-80 text-white text-xs p-1 rounded text-center">
                  Imagen actual
                </span>
              )}
              {!multiple && !preview.isCurrent && (
                <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-50 text-white text-xs p-1 rounded text-center truncate">
                  {preview.file?.name || 'Nueva imagen'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;