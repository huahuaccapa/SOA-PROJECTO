export const formatCurrency = (value, currency = 'PEN') => {
  const number = Number(value || 0);
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(number) ? number : 0);
};

export const formatNumber = (value) => {
  const number = Number(value || 0);
  return new Intl.NumberFormat('es-PE').format(Number.isFinite(number) ? number : 0);
};

export const asArray = (payload, keys = ['data', 'users', 'items', 'products', 'orders', 'vendors', 'categories']) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
};
