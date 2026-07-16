import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';
import { getDepartments, getDistricts, getProvinces, loadUbigeos } from '../../utils/ubigeo';
import { onlyDigits, validateCleanText, validatePaymentData } from '../../utils/validators';

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, totalPrice, clearCart, isHydrated } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState({});
  const [formData, setFormData] = useState({
    direccion: '',
    ciudad: '',
    departamento: '',
    provincia: '',
    distrito: '',
    metodoPago: 'tarjeta',
    notas: ''
  });
  const [ubigeos, setUbigeos] = useState([]);
  const [ubigeoLoading, setUbigeoLoading] = useState(true);
  const [paymentData, setPaymentData] = useState({
    cardName: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
    phone: '',
    operationCode: '',
    transferBank: '',
    transferCode: ''
  });
  const [receiptData, setReceiptData] = useState({
    tipoComprobante: 'boleta',
    ruc: '',
    razonSocial: '',
  });
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const subtotal = Number(totalPrice || 0);
  const discount = Number(appliedCoupon?.discount || 0);
  const taxableAmount = Math.max(0, subtotal - discount);
  const igv = taxableAmount * 0.18;
  const total = taxableAmount + igv;

  useEffect(() => {
    let active = true;
    setUbigeoLoading(true);
    loadUbigeos()
      .then((rows) => { if (active) setUbigeos(rows); })
      .catch(() => toast.error('No se pudo cargar la lista de ubigeos'))
      .finally(() => { if (active) setUbigeoLoading(false); });
    return () => { active = false; };
  }, []);


  useEffect(() => {
    api.get('/payment/config')
      .then((response) => setPaymentConfig(response.data || {}))
      .catch(() => setPaymentConfig({}));
  }, []);

  useEffect(() => {
    if (isHydrated && Array.isArray(cart) && cart.length === 0) {
      navigate('/cart', { replace: true });
    }
  }, [cart, isHydrated, navigate]);

  const departments = getDepartments(ubigeos);
  const provinces = getProvinces(ubigeos, formData.departamento);
  const districts = getDistricts(ubigeos, formData.departamento, formData.provincia);

  // Mientras el carrito se hidrata o está vacío, evitamos cambiar la cantidad de hooks
  // entre renderizados. La redirección se realiza en el useEffect anterior.
  if (!isHydrated) {
    return (
      <div className="min-h-[55vh] grid place-items-center bg-gray-50">
        <div className="rounded-2xl bg-white px-8 py-7 text-center shadow-lg">
          <div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600" />
          <p className="font-semibold text-gray-800">Preparando el pago</p>
          <p className="mt-1 text-sm text-gray-500">Estamos cargando los productos de tu carrito.</p>
        </div>
      </div>
    );
  }

  if (!Array.isArray(cart) || cart.length === 0) {
    return (
      <div className="min-h-[55vh] grid place-items-center bg-gray-50">
        <div className="rounded-2xl bg-white px-8 py-7 text-center shadow-lg">
          <p className="font-semibold text-gray-800">Tu carrito está vacío</p>
          <p className="mt-1 text-sm text-gray-500">Te estamos llevando nuevamente al carrito.</p>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      toast.error('Ingresa un código de promoción');
      return;
    }
    setCouponLoading(true);
    try {
      const response = await api.post('/coupons/validate', { code, subtotal });
      if (!response.data?.valid) {
        setAppliedCoupon(null);
        toast.error(response.data?.error || 'El cupón no es válido');
        return;
      }
      setCouponCode(code);
      setAppliedCoupon({ ...response.data, code });
      toast.success(`Promoción ${code} aplicada`);
    } catch (error) {
      setAppliedCoupon(null);
      toast.error(error.response?.data?.error || 'No se pudo validar la promoción');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCouponCode('');
    setAppliedCoupon(null);
    toast.success('Promoción retirada');
  };

  // ✅ ENVIAR PEDIDO - ACTUALIZADO
  const handleSubmit = async (e) => {
    e.preventDefault();
    const addressError = validateCleanText(formData.direccion, 'La dirección');
    if (addressError) { toast.error(addressError); return; }
    if (!formData.departamento || !formData.provincia || !formData.distrito) {
      toast.error('Selecciona departamento, provincia y distrito');
      return;
    }
    const paymentError = validatePaymentData(formData.metodoPago, paymentData);
    if (paymentError) {
      toast.error(paymentError);
      return;
    }
    if (receiptData.tipoComprobante === 'factura') {
      const ruc = onlyDigits(receiptData.ruc);
      if (!/^\d{11}$/.test(ruc)) {
        toast.error('Para factura, el RUC debe tener 11 dígitos');
        return;
      }
      if (receiptData.razonSocial.trim().length < 3) {
        toast.error('Ingresa la razón social para la factura');
        return;
      }
    }

    setLoading(true);

    try {
      // Volvemos a consultar los productos antes de cobrar para no depender de un
      // carrito antiguo guardado en el navegador. Así se validan stock, precio y vendedor reales.
      const requestedCartItems = cart.map((item) => ({
        productId: String(item.productId || item.id || item._id || ''),
        cantidad: Math.max(1, Math.floor(Number(item.cantidad || 1))),
      }));
      if (requestedCartItems.some((item) => !item.productId)) {
        throw new Error('Hay un producto inválido en el carrito. Retíralo y vuelve a agregarlo.');
      }

      const liveProductResponses = await Promise.all(
        requestedCartItems.map((item) => api.get(`/products/${encodeURIComponent(item.productId)}`, { skipGlobalError: true }))
      );
      const saleItems = liveProductResponses.map((response, index) => {
        const product = response.data?.product || response.data;
        const requested = requestedCartItems[index];
        if (!product?.id && !product?._id) throw new Error('Uno de los productos ya no existe');
        if (product.activo === false || product.activo === 0) throw new Error(`${product.nombre || 'Un producto'} ya no está disponible`);
        if (Number(product.stock || 0) < requested.cantidad) throw new Error(`Stock insuficiente para ${product.nombre || 'el producto seleccionado'}`);
        return {
          productoId: String(product.id || product._id),
          nombre: product.nombre || 'Producto',
          cantidad: requested.cantidad,
          precio: Number(product.precio || 0),
          vendedorId: String(product.vendedorId || product.vendorId || product.sellerId || ''),
          vendedorNombre: product.vendedorNombre || product.vendorName || product.sellerName || 'ByteVerse Store',
        };
      });

      // Una compra web puede incluir productos registrados por distintos vendedores.
      // El pedido pertenece a la tienda y cada producto conserva internamente su procedencia.
      const vendedorId = 'BYTEVERSE';
      const vendedorNombre = 'ByteVerse Store';

      // Recalcular el importe con los precios vigentes y volver a validar el cupón.
      const liveSubtotal = saleItems.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
      let liveDiscount = 0;
      if (appliedCoupon?.code) {
        const couponResponse = await api.post('/coupons/validate', {
          code: appliedCoupon.code,
          subtotal: liveSubtotal,
        }, { skipGlobalError: true });
        if (!couponResponse.data?.valid) throw new Error(couponResponse.data?.error || 'La promoción ya no está disponible');
        liveDiscount = Number(couponResponse.data.discount || 0);
      }
      const liveTaxableAmount = Math.max(0, liveSubtotal - liveDiscount);
      const liveIgv = Number((liveTaxableAmount * 0.18).toFixed(2));
      const liveTotal = Number((liveTaxableAmount + liveIgv).toFixed(2));
      if (liveTotal <= 0) throw new Error('El total de la compra no es válido');

      const direccionCompleta = `${formData.direccion}, ${formData.distrito}, ${formData.provincia}, ${formData.departamento}`;
      const pagoDetalles = {
        metodo: formData.metodoPago,
        estado: formData.metodoPago === 'tarjeta' ? 'VALIDADO' : 'COMPROBANTE_REGISTRADO',
        codigoOperacion: paymentData.operationCode || paymentData.transferCode || '',
        telefono: formData.metodoPago === 'yape' || formData.metodoPago === 'plin' ? onlyDigits(paymentData.phone) : '',
        banco: paymentData.transferBank || '',
        tarjetaUltimos4: formData.metodoPago === 'tarjeta' ? onlyDigits(paymentData.cardNumber).slice(-4) : ''
      };

      // Registrar el pago antes de crear la orden. Para tarjeta puede operar en modo académico
      // o con Stripe cuando se configuren credenciales y tokenización segura.
      const provisionalOrderId = `checkout_${Date.now()}_${user?.id || 'guest'}`;
      const paymentResponse = await api.post('/payment/create', {
        order_id: provisionalOrderId,
        amount: liveTotal,
        currency: 'pen',
        payment_method: formData.metodoPago,
        email: user?.email || '',
        operation_code: paymentData.operationCode || paymentData.transferCode || '',
        phone: onlyDigits(paymentData.phone),
        bank: paymentData.transferBank || '',
        card_last4: formData.metodoPago === 'tarjeta' ? onlyDigits(paymentData.cardNumber).slice(-4) : ''
      }, { skipGlobalError: true });
      if (!paymentResponse.data?.success || !paymentResponse.data?.payment?.id) {
        throw new Error(paymentResponse.data?.error || 'No se pudo registrar el pago');
      }
      pagoDetalles.paymentId = paymentResponse.data.payment.id;
      pagoDetalles.estado = paymentResponse.data.payment.status;
      pagoDetalles.monto = liveTotal;

      const orderData = {
        compradorId: String(user?.id || user?._id || ''),
        compradorNombre: `${user?.nombre || 'Usuario'} ${user?.apellido || ''}`.trim(),
        vendedorId,
        vendedorNombre,
        productos: saleItems.map(({ vendedorId: _sellerId, vendedorNombre: _sellerName, ...item }) => item),
        metodoPago: formData.metodoPago,
        pagoDetalles,
        direccion: direccionCompleta,
        ciudad: formData.ciudad,
        departamento: formData.departamento,
        provincia: formData.provincia,
        distrito: formData.distrito,
        notas: formData.notas,
        couponCode: appliedCoupon?.code || '',
        tipoComprobante: receiptData.tipoComprobante,
        clienteDocumento: user?.documento || '',
        clienteRuc: receiptData.tipoComprobante === 'factura' ? onlyDigits(receiptData.ruc) : '',
        clienteRazonSocial: receiptData.tipoComprobante === 'factura' ? receiptData.razonSocial.trim() : '',
        canalVenta: 'WEB'
      };

      console.log('📦 Enviando orden:', orderData);

      const response = await api.post('/orders', orderData, { skipGlobalError: true });
      
      if (response.status === 201 && response.data?.success) {
        toast.success('¡Pedido realizado con éxito!');
        clearCart();
        navigate('/orders');
      } else {
        toast.error(response.data.error || 'Error al procesar el pedido');
      }
    } catch (error) {
      console.error('❌ Error creating order:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.detail || error.message || 'Error al procesar el pedido';
      toast.error(errorMsg === 'No se pudo registrar la venta'
        ? 'No se pudo completar la compra porque el servicio de pedidos encontró una incompatibilidad con la base de datos. Actualiza también el backend incluido en esta entrega.'
        : errorMsg);
    } finally {
      setLoading(false);
    }
  };


  const paymentTarget = paymentConfig.merchantPhone || '999999999';
  const qrText = encodeURIComponent(`ByteVerse|${formData.metodoPago.toUpperCase()}|Monto:${total.toFixed(2)}|Celular:${paymentTarget}`);
  const qrUrl = paymentConfig.merchantQrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrText}`;

  const handlePaymentChange = (field, value) => {
    setPaymentData(prev => ({ ...prev, [field]: value }));
  };

  const renderPaymentFields = () => {
    if (formData.metodoPago === 'tarjeta') {
      return (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <p className="text-sm text-gray-600">Validación de tarjeta en modo académico. Para cobros reales se requiere Stripe, Culqi, Mercado Pago u otra pasarela con credenciales.</p>
          <input className="input-field" placeholder="Nombre como aparece en la tarjeta" value={paymentData.cardName} onChange={(e) => handlePaymentChange('cardName', e.target.value)} />
          <input className="input-field" placeholder="Número de tarjeta" inputMode="numeric" value={paymentData.cardNumber} onChange={(e) => handlePaymentChange('cardNumber', e.target.value.replace(/[^0-9 ]/g, ''))} />
          <div className="grid grid-cols-2 gap-3">
            <input className="input-field" placeholder="MM/AA" value={paymentData.expiry} onChange={(e) => handlePaymentChange('expiry', e.target.value.replace(/[^0-9/]/g, '').slice(0, 5))} />
            <input className="input-field" placeholder="CVV" inputMode="numeric" value={paymentData.cvv} onChange={(e) => handlePaymentChange('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))} />
          </div>
        </div>
      );
    }

    if (formData.metodoPago === 'yape' || formData.metodoPago === 'plin') {
      const label = formData.metodoPago === 'yape' ? 'Yape' : 'Plin';
      return (
        <div className="rounded-xl border border-primary-100 bg-primary-50 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <img src={qrUrl} alt={`QR ${label}`} className="w-36 h-36 rounded-xl border bg-white p-2" />
            <div className="text-sm text-gray-700 space-y-1">
              <p className="font-semibold text-gray-900">Paga con {label}</p>
              <p>Número: <span className="font-bold">{paymentTarget}</span></p>
              <p>Monto: <span className="font-bold">{formatCurrency(total)}</span></p>
              <p className="text-xs text-gray-500">Este es el QR comercial configurado por ByteVerse. La confirmación automática requiere credenciales activas de Mercado Pago/Culqi u otro adquirente autorizado.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="input-field" placeholder="Tu celular" inputMode="numeric" value={paymentData.phone} onChange={(e) => handlePaymentChange('phone', e.target.value.replace(/[^0-9+() -]/g, ''))} />
            <input className="input-field" placeholder="Código de operación" inputMode="numeric" value={paymentData.operationCode} onChange={(e) => handlePaymentChange('operationCode', e.target.value.replace(/\D/g, '').slice(0, 12))} />
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
        <div className="text-sm text-gray-700">
          <p className="font-semibold text-gray-900">Transferencia bancaria</p>
          <p>Banco ByteVerse: BCP</p>
          <p>Cuenta: 191-00000000-0-00</p>
          <p>CCI: 002-191-000000000000-00</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select className="input-field" value={paymentData.transferBank} onChange={(e) => handlePaymentChange('transferBank', e.target.value)}>
            <option value="">Banco de origen</option>
            <option value="BCP">BCP</option>
            <option value="Interbank">Interbank</option>
            <option value="BBVA">BBVA</option>
            <option value="Scotiabank">Scotiabank</option>
            <option value="Banco de la Nación">Banco de la Nación</option>
          </select>
          <input className="input-field" placeholder="Código de operación" value={paymentData.transferCode} onChange={(e) => handlePaymentChange('transferCode', e.target.value.replace(/[^A-Za-z0-9-]/g, '').slice(0, 20))} />
        </div>
      </div>
    );
  };

  return (
    <div className="commerce-dashboard-page buyer-checkout-page">
      <div className="commerce-shell buyer-checkout-shell">
        <div className="commerce-page-header"><div><span className="commerce-eyebrow">Finalizar compra</span><h1>Checkout seguro</h1><p>Completa los datos de envío, elige tu comprobante y registra el método de pago.</p></div></div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulario */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Información de Envío</h2>
              
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dirección *
                    </label>
                    <input
                      type="text"
                      name="direccion"
                      value={formData.direccion}
                      onChange={handleChange}
                      required
                      className="input-field"
                      placeholder="Calle, número, urbanización"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Departamento *</label>
                      <select name="departamento" value={formData.departamento} onChange={(e) => setFormData({...formData, departamento: e.target.value, provincia: '', distrito: '', ciudad: ''})} required className="input-field" disabled={ubigeoLoading || departments.length === 0}>
                        <option value="">{ubigeoLoading ? 'Cargando...' : 'Seleccione'}</option>
                        {departments.map((dep) => <option key={dep} value={dep}>{dep}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Provincia *</label>
                      <select name="provincia" value={formData.provincia} onChange={(e) => setFormData({...formData, provincia: e.target.value, distrito: '', ciudad: e.target.value})} required className="input-field" disabled={!formData.departamento}>
                        <option value="">Seleccione</option>
                        {provinces.map((prov) => <option key={prov} value={prov}>{prov}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Distrito *</label>
                      <select name="distrito" value={formData.distrito} onChange={(e) => setFormData({...formData, distrito: e.target.value, ciudad: e.target.value})} required className="input-field" disabled={!formData.provincia}>
                        <option value="">Seleccione</option>
                        {districts.map((dist) => <option key={dist} value={dist}>{dist}</option>)}
                      </select>
                    </div>
                  </div>
                  {(!ubigeoLoading && departments.length === 0) && (
                    <p className="text-sm text-red-500">No se pudo cargar departamentos. Revisa tu conexión o la API de ubigeo.</p>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Método de Pago *
                    </label>
                    <select
                      name="metodoPago"
                      value={formData.metodoPago}
                      onChange={handleChange}
                      required
                      className="input-field"
                    >
                      <option value="tarjeta">Tarjeta de Crédito/Débito</option>
                      <option value="yape">Yape</option>
                      <option value="plin">Plin</option>
                      <option value="transferencia">Transferencia Bancaria</option>
                    </select>
                  </div>

                  {renderPaymentFields()}

                  <div className="checkout-section-box">
                    <div className="checkout-section-heading"><div><strong>Tipo de comprobante</strong><span>Podrás descargarlo desde Mis pedidos</span></div></div>
                    <div className="checkout-receipt-options">
                      {['boleta', 'factura', 'ticket'].map(type => (
                        <button type="button" key={type} className={receiptData.tipoComprobante === type ? 'is-selected' : ''} onClick={() => setReceiptData(prev => ({ ...prev, tipoComprobante: type }))}>
                          <strong>{type.charAt(0).toUpperCase() + type.slice(1)}</strong>
                          <small>{type === 'factura' ? 'Para empresa con RUC' : type === 'ticket' ? 'Comprobante simplificado' : 'Compra personal'}</small>
                        </button>
                      ))}
                    </div>
                    {receiptData.tipoComprobante === 'factura' && (
                      <div className="checkout-invoice-fields">
                        <input className="input-field" placeholder="RUC de 11 dígitos" inputMode="numeric" value={receiptData.ruc} onChange={event => setReceiptData(prev => ({ ...prev, ruc: event.target.value.replace(/\D/g, '').slice(0, 11) }))} />
                        <input className="input-field" placeholder="Razón social" value={receiptData.razonSocial} onChange={event => setReceiptData(prev => ({ ...prev, razonSocial: event.target.value }))} />
                      </div>
                    )}
                  </div>

                  <div className="checkout-section-box">
                    <div className="checkout-section-heading"><div><strong>¿Tienes una promoción?</strong><span>El descuento se aplica antes del IGV</span></div></div>
                    <div className="checkout-coupon-row">
                      <input className="input-field" placeholder="Código de cupón" value={couponCode} disabled={Boolean(appliedCoupon)} onChange={event => setCouponCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
                      {appliedCoupon ? <button type="button" className="btn-danger" onClick={removeCoupon}>Quitar</button> : <button type="button" className="btn-secondary" disabled={couponLoading} onClick={handleApplyCoupon}>{couponLoading ? 'Validando...' : 'Aplicar'}</button>}
                    </div>
                    {appliedCoupon && <div className="checkout-coupon-success"><strong>{appliedCoupon.code}</strong><span>{appliedCoupon.description || `Ahorro de ${formatCurrency(appliedCoupon.discount)}`}</span><b>-{formatCurrency(appliedCoupon.discount)}</b></div>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notas (opcional)
                    </label>
                    <textarea
                      name="notas"
                      value={formData.notas}
                      onChange={handleChange}
                      className="input-field"
                      rows="3"
                      placeholder="Instrucciones adicionales..."
                    />
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Resumen de la orden */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Resumen</h2>
              
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.nombre} × {item.cantidad}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(item.precio * item.cantidad)}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-gray-200 mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && <div className="flex justify-between text-green-700"><span>Descuento ({appliedCoupon?.code})</span><span>-{formatCurrency(discount)}</span></div>}
                <div className="flex justify-between text-gray-600">
                  <span>IGV (18%)</span>
                  <span>{formatCurrency(igv)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span className="text-primary-600">{formatCurrency(total)}</span>
                </div>
              </div>
              
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary w-full py-3 mt-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Procesando...' : 'Confirmar Pedido'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;