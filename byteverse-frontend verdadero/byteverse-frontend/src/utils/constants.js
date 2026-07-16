export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const ROLES = {
  ADMIN: 'ADMIN',
  VENDEDOR: 'VENDEDOR',
  COMPRADOR: 'COMPRADOR',
  VISITOR: 'VISITOR'
};

export const ORDER_STATUS = {
  PENDING: 'PENDIENTE',
  CONFIRMED: 'CONFIRMADO',
  CANCELLED: 'CANCELADO'
};

export const PAYMENT_METHODS = {
  CARD: 'tarjeta',
  YAPE: 'yape',
  PLIN: 'plin',
  TRANSFER: 'transferencia'
};

export const CATEGORIES = [
  'Laptops',
  'Smartphones',
  'Tablets',
  'Accesorios',
  'Audio',
  'Gaming',
  'Smartwatches'
];