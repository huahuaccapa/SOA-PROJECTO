const CLEAN_PATTERNS = {
  name: /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]+$/,
  text: /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s.,#°\-\/]+$/,
};

export const validateCleanText = (value, label = 'El campo', type = 'text') => {
  const text = String(value || '').trim();
  if (!text) return '';
  const pattern = CLEAN_PATTERNS[type] || CLEAN_PATTERNS.text;
  return pattern.test(text) ? '' : `${label} no debe contener caracteres especiales no permitidos.`;
};

export const validateDocument = (tipoDocumento, documento) => {
  const doc = String(documento || '').trim();
  if (!doc) return '';
  if (tipoDocumento === 'DNI' && !/^\d{8}$/.test(doc)) return 'El DNI debe tener 8 números.';
  if (tipoDocumento === 'RUC' && !/^(10|20)\d{9}$/.test(doc)) return 'El RUC debe tener 11 números y empezar con 10 o 20.';
  if (tipoDocumento === 'CE' && !/^[A-Za-z0-9]{9,12}$/.test(doc)) return 'El CE debe tener entre 9 y 12 caracteres alfanuméricos.';
  if (tipoDocumento === 'PASAPORTE' && !/^[A-Za-z0-9]{6,12}$/.test(doc)) return 'El pasaporte debe tener entre 6 y 12 caracteres alfanuméricos.';
  return '';
};

export const validatePassword = (password) => {
  const pass = String(password || '');
  if (pass.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
  return '';
};

export const validatePhoneByCountry = (phone, country = 'PE') => {
  const raw = String(phone || '').trim();
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  const rules = {
    PE: /^9\d{8}$/,
    CO: /^3\d{9}$/,
    MX: /^\d{10}$/,
    CL: /^9\d{8}$/,
    AR: /^\d{10,11}$/,
    US: /^\d{10}$/,
  };
  const ok = (rules[country] || /^\d{7,15}$/).test(digits);
  return ok ? '' : `El teléfono no tiene un formato válido para ${country}.`;
};

export const onlyDigits = (value = '') => String(value || '').replace(/\D/g, '');

export const validateCardNumber = (cardNumber) => {
  const digits = onlyDigits(cardNumber);
  if (!/^\d{13,19}$/.test(digits)) return 'El número de tarjeta debe tener entre 13 y 19 dígitos.';
  let sum = 0;
  let doubleDigit = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }
  return sum % 10 === 0 ? '' : 'El número de tarjeta no es válido.';
};

export const validateExpiryDate = (expiry) => {
  const value = String(expiry || '').trim();
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(value)) return 'La fecha de vencimiento debe tener formato MM/AA.';
  const [month, year] = value.split('/').map(Number);
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  if (year < currentYear || (year === currentYear && month < currentMonth)) return 'La tarjeta está vencida.';
  return '';
};

export const validatePaymentData = (method, paymentData = {}) => {
  if (method === 'tarjeta') {
    return validateCleanText(paymentData.cardName, 'El nombre de la tarjeta', 'name')
      || validateCardNumber(paymentData.cardNumber)
      || validateExpiryDate(paymentData.expiry)
      || (!/^\d{3,4}$/.test(onlyDigits(paymentData.cvv)) ? 'El CVV debe tener 3 o 4 números.' : '');
  }
  if (method === 'yape' || method === 'plin') {
    const phoneError = validatePhoneByCountry(paymentData.phone, 'PE');
    if (phoneError) return phoneError;
    if (!/^\d{6,12}$/.test(onlyDigits(paymentData.operationCode))) return 'Ingresa el código de operación de 6 a 12 números.';
    return '';
  }
  if (method === 'transferencia') {
    if (!paymentData.transferBank) return 'Selecciona el banco desde donde harás la transferencia.';
    if (!/^[A-Za-z0-9-]{6,20}$/.test(String(paymentData.transferCode || '').trim())) return 'Ingresa un código de operación válido.';
    return '';
  }
  return '';
};
