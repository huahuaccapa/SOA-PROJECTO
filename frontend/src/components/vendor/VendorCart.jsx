import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { downloadApiFile } from '../../utils/downloads';
import {
  BanknotesIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  CreditCardIcon,
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
  PrinterIcon,
  ReceiptPercentIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  TagIcon,
  TrashIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const money = value => new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
}).format(Number(value || 0));

const asArray = value => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.products)) return value.products;
  return [];
};

const DEFAULT_PAYMENT = {
  method: 'efectivo',
  operationCode: '',
  phone: '',
  bank: '',
  cardLast4: '',
  cashReceived: '',
};

const WALK_IN_CLIENT = {
  id: 'MOSTRADOR',
  nombre: 'Cliente de tienda',
  email: '',
  documento: '',
  telefono: '',
};

const paymentLabel = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  yape: 'Yape',
  plin: 'Plin',
  transferencia: 'Transferencia',
};

export default function VendorCart() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const storageKey = `byteverse-pos-cart-${user?.id || 'vendor'}`;
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [cart, setCart] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [selectedClient, setSelectedClient] = useState(WALK_IN_CLIENT);
  const [productSearch, setProductSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [category, setCategory] = useState('TODAS');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [receiptType, setReceiptType] = useState('boleta');
  const [customerDocument, setCustomerDocument] = useState('');
  const [invoiceData, setInvoiceData] = useState({ ruc: '', businessName: '', address: '' });
  const [payment, setPayment] = useState(DEFAULT_PAYMENT);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [saleResult, setSaleResult] = useState(null);

  const persistCart = next => {
    setCart(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const invalidateCoupon = () => {
    if (appliedCoupon) {
      setAppliedCoupon(null);
      setCouponCode('');
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [productsResponse, clientsResponse, couponsResponse] = await Promise.all([
          api.get('/products?activo=true'),
          api.get('/users?role=COMPRADOR&activo=true'),
          api.get('/coupons?active=true').catch(() => ({ data: [] })),
        ]);
        if (!active) return;
        const loadedProducts = asArray(productsResponse.data).filter(product => product.activo !== false);
        const loadedClients = asArray(clientsResponse.data);
        setProducts(loadedProducts);
        setClients(loadedClients);
        setPromotions(asArray(couponsResponse.data));

        const clientId = searchParams.get('client');
        if (clientId) {
          const foundClient = loadedClients.find(client => String(client.id || client._id) === String(clientId));
          if (foundClient) {
            setSelectedClient(foundClient);
            setCustomerDocument(foundClient.documento || '');
          }
        }

        const productId = searchParams.get('product');
        if (productId) {
          const foundProduct = loadedProducts.find(product => String(product.id || product._id) === String(productId));
          if (foundProduct && Number(foundProduct.stock) > 0) {
            const id = String(foundProduct.id || foundProduct._id);
            const existing = cart.find(item => String(item.id || item._id) === id);
            if (!existing) persistCart([...cart, { ...foundProduct, cantidad: 1 }]);
          }
        }
      } catch (error) {
        console.error('POS load:', error);
        if (![401, 503].includes(error.response?.status)) toast.error('No se pudo cargar el punto de venta', { id: 'vendor-pos-load' });
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const categories = useMemo(() => [
    'TODAS',
    ...new Set(products.map(product => product.categoria).filter(Boolean)),
  ], [products]);

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    return products.filter(product => {
      const matchesCategory = category === 'TODAS' || product.categoria === category;
      const matchesSearch = !term || `${product.nombre} ${product.descripcion || ''} ${product.categoria || ''}`.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [products, productSearch, category]);

  const filteredClients = useMemo(() => {
    const term = clientSearch.trim().toLowerCase();
    if (!term) return clients.slice(0, 6);
    return clients.filter(client => `${client.nombre} ${client.email || ''} ${client.documento || ''} ${client.telefono || ''}`.toLowerCase().includes(term)).slice(0, 8);
  }, [clients, clientSearch]);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.precio || 0) * Number(item.cantidad || 0), 0), [cart]);
  const discount = Math.min(Number(appliedCoupon?.discount || 0), subtotal);
  const taxableAmount = Math.max(0, subtotal - discount);
  const igv = Number((taxableAmount * 0.18).toFixed(2));
  const total = Number((taxableAmount + igv).toFixed(2));
  const itemCount = cart.reduce((sum, item) => sum + Number(item.cantidad || 0), 0);
  const change = payment.method === 'efectivo' && Number(payment.cashReceived) >= total
    ? Number(payment.cashReceived) - total
    : 0;

  const addProduct = product => {
    const id = String(product.id || product._id);
    if (Number(product.stock) <= 0) return toast.error('Este producto no tiene stock');
    const existing = cart.find(item => String(item.id || item._id) === id);
    if (existing) {
      if (Number(existing.cantidad) >= Number(product.stock)) return toast.error('No hay más stock disponible');
      persistCart(cart.map(item => String(item.id || item._id) === id ? { ...item, cantidad: Number(item.cantidad) + 1 } : item));
    } else {
      persistCart([...cart, { ...product, cantidad: 1 }]);
    }
    invalidateCoupon();
  };

  const changeQuantity = (id, delta) => {
    const current = cart.find(item => String(item.id || item._id) === String(id));
    if (!current) return;
    const nextQuantity = Number(current.cantidad) + delta;
    if (nextQuantity <= 0) {
      persistCart(cart.filter(item => String(item.id || item._id) !== String(id)));
    } else if (nextQuantity > Number(current.stock)) {
      toast.error('La cantidad supera el stock disponible');
    } else {
      persistCart(cart.map(item => String(item.id || item._id) === String(id) ? { ...item, cantidad: nextQuantity } : item));
    }
    invalidateCoupon();
  };

  const removeProduct = id => {
    persistCart(cart.filter(item => String(item.id || item._id) !== String(id)));
    invalidateCoupon();
  };

  const clearSale = () => {
    persistCart([]);
    setAppliedCoupon(null);
    setCouponCode('');
    setSelectedClient(WALK_IN_CLIENT);
    setClientSearch('');
    setCustomerDocument('');
    setInvoiceData({ ruc: '', businessName: '', address: '' });
    setReceiptType('boleta');
    setPayment(DEFAULT_PAYMENT);
  };

  const selectClient = client => {
    setSelectedClient(client);
    setCustomerDocument(client.documento || '');
    setClientSearch('');
  };

  const applyCoupon = async codeValue => {
    const code = String(codeValue || couponCode).trim().toUpperCase();
    if (!code) return toast.error('Ingresa un código de promoción');
    if (subtotal <= 0) return toast.error('Agrega productos antes de aplicar una promoción');
    try {
      const response = await api.post('/coupons/validate', { code, subtotal });
      if (!response.data?.valid) {
        setAppliedCoupon(null);
        toast.error(response.data?.error || 'El cupón no es válido');
        return;
      }
      setCouponCode(code);
      setAppliedCoupon(response.data);
      toast.success(`Promoción ${code} aplicada`);
    } catch (error) {
      setAppliedCoupon(null);
      toast.error(error.response?.data?.error || 'No se pudo validar la promoción');
    }
  };

  const validateSale = () => {
    if (!cart.length) return 'Agrega al menos un producto';
    if (receiptType === 'factura') {
      if (!/^\d{11}$/.test(invoiceData.ruc)) return 'El RUC debe tener 11 dígitos';
      if (invoiceData.businessName.trim().length < 3) return 'Ingresa la razón social';
      if (invoiceData.address.trim().length < 5) return 'Ingresa la dirección fiscal';
    }
    if (payment.method === 'efectivo' && Number(payment.cashReceived || 0) < total) return 'El efectivo recibido es menor al total';
    if (payment.method === 'tarjeta' && !/^\d{4}$/.test(payment.cardLast4)) return 'Ingresa los últimos 4 dígitos de la tarjeta';
    if (['yape', 'plin'].includes(payment.method)) {
      if (!/^9\d{8}$/.test(payment.phone)) return 'El celular debe tener 9 dígitos';
      if (payment.operationCode.trim().length < 6) return 'Ingresa un código de operación válido';
    }
    if (payment.method === 'transferencia' && (!payment.bank || payment.operationCode.trim().length < 6)) return 'Completa el banco y código de operación';
    return '';
  };

  const processSale = async () => {
    const validationError = validateSale();
    if (validationError) return toast.error(validationError);

    setProcessing(true);
    try {
      const paymentResponse = await api.post('/payment/create', {
        order_id: `POS-${Date.now()}`,
        amount: total,
        currency: 'pen',
        payment_method: payment.method,
        operation_code: payment.operationCode || undefined,
        phone: payment.phone || undefined,
        bank: payment.bank || undefined,
        card_last4: payment.cardLast4 || undefined,
        cash_received: payment.method === 'efectivo' ? Number(payment.cashReceived) : undefined,
        email: selectedClient.email || undefined,
      });
      const registeredPayment = paymentResponse.data?.payment;
      if (!registeredPayment?.id) throw new Error('No se pudo registrar el pago');

      const buyerId = String(selectedClient.id || selectedClient._id || 'MOSTRADOR');
      const sellerName = `${user.nombre || 'Vendedor'} ${user.apellido || ''}`.trim();
      const orderResponse = await api.post('/orders', {
        compradorId: buyerId,
        compradorNombre: `${selectedClient.nombre || 'Cliente de tienda'} ${selectedClient.apellido || ''}`.trim(),
        vendedorId: String(user.id),
        vendedorNombre: sellerName,
        productos: cart.map(item => ({
          productoId: String(item.id || item._id),
          cantidad: Number(item.cantidad),
        })),
        metodoPago: payment.method,
        pagoDetalles: {
          paymentId: registeredPayment.id,
          estado: registeredPayment.status,
          telefono: payment.phone,
          codigoOperacion: payment.operationCode,
          banco: payment.bank,
          tarjetaUltimos4: payment.cardLast4,
          efectivoRecibido: payment.cashReceived,
          vuelto: registeredPayment.change,
        },
        couponCode: appliedCoupon?.code || '',
        tipoComprobante: receiptType,
        clienteDocumento: receiptType === 'factura' ? '' : (customerDocument || selectedClient.documento || ''),
        clienteRuc: receiptType === 'factura' ? invoiceData.ruc : '',
        clienteRazonSocial: receiptType === 'factura' ? invoiceData.businessName : '',
        direccion: receiptType === 'factura' ? invoiceData.address : (selectedClient.direccion || ''),
        canalVenta: 'TIENDA',
        notas: `Venta presencial atendida por ${sellerName}`,
      });

      const order = orderResponse.data?.order;
      if (!order) throw new Error('La venta no devolvió un comprobante');
      setSaleResult(order);
      clearSale();
      const refreshedProducts = await api.get('/products?activo=true');
      setProducts(asArray(refreshedProducts.data));
      toast.success('Venta registrada correctamente');
    } catch (error) {
      console.error('Process sale:', error);
      toast.error(error.response?.data?.error || error.message || 'No se pudo registrar la venta');
    } finally {
      setProcessing(false);
    }
  };

  const downloadReceipt = async type => {
    if (!saleResult) return;
    const number = saleResult.comprobanteNumero || saleResult.boletaNumero || saleResult.id;
    await downloadApiFile(`/orders/${saleResult.id}/document/${type}`, `${type}-${number}.${type === 'xml' ? 'xml' : 'pdf'}`);
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><span className="loader-ring large" /></div>;
  }

  return (
    <div className="commerce-dashboard-page pos-page">
      <div className="commerce-shell pos-shell">
        <div className="commerce-page-header">
          <div>
            <span className="commerce-eyebrow">Atención presencial</span>
            <h1>Punto de venta</h1>
            <p>Selecciona al cliente, agrega productos, aplica promociones, registra el pago y emite su comprobante.</p>
          </div>
          <div className="pos-session-badge"><span /> Caja activa · {user?.nombre}</div>
        </div>

        <div className="pos-layout">
          <section className="commerce-panel pos-catalog-panel">
            <div className="pos-section-title">
              <div><span className="commerce-eyebrow">Catálogo</span><h2>Productos disponibles</h2></div>
              <span>{filteredProducts.length} resultados</span>
            </div>

            <div className="commerce-search-box">
              <MagnifyingGlassIcon />
              <input className="commerce-search-input" value={productSearch} onChange={event => setProductSearch(event.target.value)} placeholder="Buscar por nombre, categoría o característica" />
            </div>

            <div className="pos-category-tabs">
              {categories.map(item => (
                <button type="button" key={item} className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>
                  {item === 'TODAS' ? 'Todos' : item}
                </button>
              ))}
            </div>

            <div className="pos-product-grid">
              {filteredProducts.map(product => (
                <article className="pos-product-card" key={product.id || product._id}>
                  <img src={product.imagen || 'https://via.placeholder.com/160?text=Producto'} alt={product.nombre} />
                  <div>
                    <span>{product.categoria || 'Tecnología'}</span>
                    <h3>{product.nombre}</h3>
                    <div className="pos-product-price-row">
                      <strong>{money(product.precio)}</strong>
                      <small className={Number(product.stock) <= 5 ? 'stock-low' : ''}>Stock {product.stock}</small>
                    </div>
                    <button type="button" onClick={() => addProduct(product)} disabled={Number(product.stock) <= 0}>
                      <PlusIcon /> Agregar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="pos-sidebar">
            <section className="commerce-panel pos-client-panel">
              <div className="pos-section-title compact">
                <div><span className="commerce-eyebrow">Cliente</span><h2>Datos de compra</h2></div>
                <UserIcon />
              </div>
              <div className="selected-client-card">
                <div className="client-initial">{selectedClient.nombre?.charAt(0) || 'C'}</div>
                <div><strong>{selectedClient.nombre}</strong><small>{selectedClient.email || 'Venta de mostrador'}</small></div>
                {selectedClient.id !== 'MOSTRADOR' && <button type="button" onClick={() => selectClient(WALK_IN_CLIENT)}><XMarkIcon /></button>}
              </div>
              <div className="client-picker">
                <MagnifyingGlassIcon />
                <input value={clientSearch} onChange={event => setClientSearch(event.target.value)} placeholder="Buscar cliente, DNI o correo" />
              </div>
              {clientSearch && (
                <div className="client-picker-results">
                  {filteredClients.map(client => (
                    <button type="button" key={client.id || client._id} onClick={() => selectClient(client)}>
                      <span>{client.nombre}</span><small>{client.documento || client.email}</small><ChevronRightIcon />
                    </button>
                  ))}
                  {filteredClients.length === 0 && <p>No se encontraron clientes.</p>}
                </div>
              )}
              {receiptType !== 'factura' && (
                <label className="pos-field">
                  DNI/CE del cliente (opcional)
                  <input value={customerDocument} onChange={event => setCustomerDocument(event.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12))} placeholder="Documento para la boleta" />
                </label>
              )}
            </section>

            <section className="commerce-panel pos-cart-panel">
              <div className="pos-section-title compact">
                <div><span className="commerce-eyebrow">Venta actual</span><h2>Carrito ({itemCount})</h2></div>
                <ShoppingCartIcon />
              </div>

              <div className="pos-cart-items">
                {cart.length === 0 ? (
                  <div className="pos-empty-cart"><ShoppingBagIcon /><p>Agrega productos del catálogo para comenzar.</p></div>
                ) : cart.map(item => (
                  <div className="pos-cart-item" key={item.id || item._id}>
                    <img src={item.imagen || 'https://via.placeholder.com/60?text=P'} alt={item.nombre} />
                    <div className="pos-cart-item-copy"><strong>{item.nombre}</strong><small>{money(item.precio)} c/u</small></div>
                    <div className="pos-qty-control">
                      <button type="button" onClick={() => changeQuantity(item.id || item._id, -1)}><MinusIcon /></button>
                      <span>{item.cantidad}</span>
                      <button type="button" onClick={() => changeQuantity(item.id || item._id, 1)}><PlusIcon /></button>
                    </div>
                    <button type="button" className="pos-remove" onClick={() => removeProduct(item.id || item._id)}><TrashIcon /></button>
                  </div>
                ))}
              </div>

              <div className="pos-coupon-box">
                <div><TagIcon /><span><strong>Promoción</strong><small>Aplica un cupón vigente</small></span></div>
                <div className="pos-coupon-input">
                  <input value={couponCode} onChange={event => { setCouponCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setAppliedCoupon(null); }} placeholder="CÓDIGO" />
                  <button type="button" onClick={() => applyCoupon()}>Aplicar</button>
                </div>
                {appliedCoupon && <p className="coupon-applied"><CheckCircleIcon /> {appliedCoupon.description || appliedCoupon.code} · -{money(discount)}</p>}
                {!appliedCoupon && promotions.length > 0 && (
                  <div className="quick-coupons">
                    {promotions.slice(0, 3).map(item => <button type="button" key={item.code} onClick={() => applyCoupon(item.code)}>{item.code}</button>)}
                  </div>
                )}
              </div>

              <div className="pos-totals">
                <p><span>Subtotal</span><b>{money(subtotal)}</b></p>
                <p className="discount-row"><span>Descuento</span><b>-{money(discount)}</b></p>
                <p><span>IGV (18%)</span><b>{money(igv)}</b></p>
                <h3><span>Total</span><b>{money(total)}</b></h3>
              </div>
            </section>
          </aside>
        </div>

        <div className="pos-checkout-grid">
          <section className="commerce-panel">
            <div className="pos-section-title">
              <div><span className="commerce-eyebrow">Comprobante</span><h2>Documento de venta</h2></div>
              <ClipboardDocumentCheckIcon />
            </div>
            <div className="receipt-type-grid">
              {[
                ['boleta', 'Boleta', 'Para consumidor final', ReceiptPercentIcon],
                ['factura', 'Factura', 'Requiere RUC y razón social', BuildingOfficeIcon],
                ['ticket', 'Ticket', 'Comprobante interno simple', PrinterIcon],
              ].map(([value, title, subtitle, Icon]) => (
                <button type="button" key={value} className={receiptType === value ? 'is-active' : ''} onClick={() => setReceiptType(value)}>
                  <Icon /><span><strong>{title}</strong><small>{subtitle}</small></span>
                </button>
              ))}
            </div>
            {receiptType === 'factura' && (
              <div className="invoice-fields">
                <label>RUC<input value={invoiceData.ruc} onChange={event => setInvoiceData({ ...invoiceData, ruc: event.target.value.replace(/\D/g, '').slice(0, 11) })} placeholder="11 dígitos" /></label>
                <label>Razón social<input value={invoiceData.businessName} onChange={event => setInvoiceData({ ...invoiceData, businessName: event.target.value })} placeholder="Empresa SAC" /></label>
                <label className="full">Dirección fiscal<input value={invoiceData.address} onChange={event => setInvoiceData({ ...invoiceData, address: event.target.value })} placeholder="Dirección para la factura" /></label>
              </div>
            )}
          </section>

          <section className="commerce-panel">
            <div className="pos-section-title">
              <div><span className="commerce-eyebrow">Cobro</span><h2>Método de pago</h2></div>
              <BanknotesIcon />
            </div>
            <div className="payment-method-grid">
              {Object.entries(paymentLabel).map(([value, label]) => (
                <button type="button" key={value} className={payment.method === value ? 'is-active' : ''} onClick={() => setPayment({ ...DEFAULT_PAYMENT, method: value })}>
                  {value === 'tarjeta' ? <CreditCardIcon /> : <BanknotesIcon />}{label}
                </button>
              ))}
            </div>
            <div className="payment-fields">
              {payment.method === 'efectivo' && (
                <>
                  <label>Efectivo recibido<input type="number" min="0" step="0.10" value={payment.cashReceived} onChange={event => setPayment({ ...payment, cashReceived: event.target.value })} placeholder={total.toFixed(2)} /></label>
                  <div className="change-card"><span>Vuelto</span><strong>{money(change)}</strong></div>
                </>
              )}
              {payment.method === 'tarjeta' && <label>Últimos 4 dígitos<input inputMode="numeric" maxLength="4" value={payment.cardLast4} onChange={event => setPayment({ ...payment, cardLast4: event.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="1234" /></label>}
              {['yape', 'plin'].includes(payment.method) && (
                <>
                  <label>Celular<input inputMode="numeric" value={payment.phone} onChange={event => setPayment({ ...payment, phone: event.target.value.replace(/\D/g, '').slice(0, 9) })} placeholder="9 dígitos" /></label>
                  <label>Código de operación<input value={payment.operationCode} onChange={event => setPayment({ ...payment, operationCode: event.target.value.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 24) })} placeholder="Código del comprobante" /></label>
                </>
              )}
              {payment.method === 'transferencia' && (
                <>
                  <label>Banco<select value={payment.bank} onChange={event => setPayment({ ...payment, bank: event.target.value })}><option value="">Seleccionar</option><option>BCP</option><option>BBVA</option><option>Interbank</option><option>Scotiabank</option><option>Otro</option></select></label>
                  <label>Código de operación<input value={payment.operationCode} onChange={event => setPayment({ ...payment, operationCode: event.target.value.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 24) })} /></label>
                </>
              )}
            </div>
          </section>
        </div>

        <section className="pos-final-bar">
          <div><span>Total a cobrar</span><strong>{money(total)}</strong><small>{itemCount} producto(s) · {paymentLabel[payment.method]} · {receiptType}</small></div>
          <button type="button" className="btn-secondary" onClick={clearSale} disabled={!cart.length}>Limpiar venta</button>
          <button type="button" className="btn-primary pos-confirm-button" onClick={processSale} disabled={processing || !cart.length}>
            <CheckCircleIcon /> {processing ? 'Procesando venta...' : 'Cobrar y emitir comprobante'}
          </button>
        </section>
      </div>

      {saleResult && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="sale-success-modal">
            <button type="button" className="icon-button modal-close" onClick={() => setSaleResult(null)}><XMarkIcon /></button>
            <div className="success-icon"><CheckCircleIcon /></div>
            <span className="commerce-eyebrow">Venta completada</span>
            <h2>{saleResult.comprobanteNumero || saleResult.boletaNumero}</h2>
            <p>La venta fue registrada, el stock se actualizó y el comprobante está listo para entregar.</p>
            <div className="success-summary">
              <span>Cliente <b>{saleResult.compradorNombre}</b></span>
              <span>Pago <b>{paymentLabel[saleResult.metodoPago] || saleResult.metodoPago}</b></span>
              <span>Total <b>{money(saleResult.total)}</b></span>
            </div>
            <div className="success-actions">
              <button type="button" className="btn-primary" onClick={() => downloadReceipt(saleResult.tipoComprobante || 'boleta')}><DocumentArrowDownIcon /> Descargar {saleResult.tipoComprobante || 'boleta'}</button>
              <button type="button" className="btn-secondary" onClick={() => downloadReceipt('ticket')}><PrinterIcon /> Ticket</button>
              <button type="button" className="btn-secondary" onClick={() => downloadReceipt('xml')}><DocumentArrowDownIcon /> XML</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
