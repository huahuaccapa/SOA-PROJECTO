import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  MinusIcon,
  PlusIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  TrashIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import toast from 'react-hot-toast';

const Cart = () => {
  const { cart, totalItems, totalPrice, removeFromCart, updateQuantity, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Debes iniciar sesión para ver tu carrito', { id: 'cart-login-required' });
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  if (cart.length === 0) {
    return (
      <div className="commerce-dashboard-page buyer-cart-page">
        <div className="commerce-shell">
          <div className="buyer-cart-empty"><span><ShoppingCartIcon /></span><h1>Tu carrito está esperando</h1><p>Explora el catálogo y añade la tecnología que necesitas. Tus productos aparecerán aquí listos para comprar.</p><Link to="/products" className="btn-primary"><ShoppingBagIcon /> Explorar productos</Link></div>
        </div>
      </div>
    );
  }

  const subtotal = Number(totalPrice || 0);
  const igv = subtotal * 0.18;
  const total = subtotal + igv;
  const hasInvalidStock = cart.some(item => Number(item.stock || 0) > 0 && Number(item.cantidad || 0) > Number(item.stock));

  const goCheckout = () => {
    if (hasInvalidStock) {
      toast.error('Ajusta las cantidades: uno o más productos superan el stock disponible');
      return;
    }
    navigate('/checkout');
  };

  return (
    <div className="commerce-dashboard-page buyer-cart-page">
      <div className="commerce-shell">
        <div className="commerce-page-header">
          <div><span className="commerce-eyebrow">Compra segura</span><h1>Tu carrito</h1><p>Revisa cantidades y disponibilidad antes de continuar al pago.</p></div>
          <Link to="/products" className="commerce-refresh-button"><ArrowLeftIcon /> Seguir comprando</Link>
        </div>

        <div className="buyer-cart-layout">
          <section className="commerce-panel buyer-cart-items-panel">
            <div className="panel-title-row"><div><span className="commerce-eyebrow">Productos seleccionados</span><h2>{formatNumber(totalItems)} artículo(s)</h2></div><button type="button" className="buyer-clear-cart" onClick={() => window.confirm('¿Vaciar todo el carrito?') && clearCart()}><TrashIcon /> Vaciar carrito</button></div>
            <div className="buyer-cart-item-list">
              {cart.map(item => {
                const stock = Number(item.stock || 0);
                const exceedsStock = stock > 0 && Number(item.cantidad) > stock;
                return (
                  <article className={`buyer-cart-item ${exceedsStock ? 'has-stock-error' : ''}`} key={item.productId}>
                    <Link to={`/product/${item.productId}`} className="buyer-cart-image"><img src={item.imagen || 'https://via.placeholder.com/240x180?text=ByteVerse'} alt={item.nombre} /></Link>
                    <div className="buyer-cart-copy"><Link to={`/product/${item.productId}`}><h3>{item.nombre}</h3></Link><p>Vendido por {item.vendedorNombre || 'ByteVerse Store'}</p><span className={stock > 5 ? 'stock-available' : 'stock-limited'}>{stock > 0 ? `${stock} unidades disponibles` : 'Disponibilidad por confirmar'}</span>{exceedsStock && <small>La cantidad supera el stock disponible.</small>}</div>
                    <div className="buyer-cart-price"><strong>{formatCurrency(item.precio)}</strong><small>Precio unitario</small></div>
                    <div className="buyer-cart-quantity"><button type="button" onClick={() => updateQuantity(item.productId, item.cantidad - 1)} aria-label="Restar cantidad"><MinusIcon /></button><span>{item.cantidad}</span><button type="button" onClick={() => updateQuantity(item.productId, item.cantidad + 1)} disabled={stock > 0 && item.cantidad >= stock} aria-label="Sumar cantidad"><PlusIcon /></button></div>
                    <div className="buyer-cart-line-total"><strong>{formatCurrency(Number(item.precio) * Number(item.cantidad))}</strong><button type="button" onClick={() => removeFromCart(item.productId)} aria-label="Eliminar producto"><TrashIcon /></button></div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="buyer-cart-sidebar">
            <section className="commerce-panel buyer-cart-summary">
              <span className="commerce-eyebrow">Resumen de compra</span><h2>Total del pedido</h2>
              <div className="buyer-summary-lines"><p><span>Productos ({totalItems})</span><b>{formatCurrency(subtotal)}</b></p><p><span>IGV (18%)</span><b>{formatCurrency(igv)}</b></p><p><span>Envío</span><b className="free-copy">Se calcula al pagar</b></p></div>
              <div className="buyer-cart-grand-total"><span>Total estimado</span><strong>{formatCurrency(total)}</strong></div>
              <button type="button" className="btn-primary buyer-checkout-button" onClick={goCheckout} disabled={hasInvalidStock}>Continuar al pago <span>→</span></button>
              <small className="buyer-tax-copy">El total final puede cambiar al aplicar una promoción en el checkout.</small>
            </section>
            <section className="buyer-cart-trust-panel"><div><ShieldCheckIcon /><span><strong>Compra protegida</strong><small>Pago registrado y sesión segura</small></span></div><div><TruckIcon /><span><strong>Entrega a todo el Perú</strong><small>Selecciona tu ubicación al pagar</small></span></div><div><CheckCircleIcon /><span><strong>Comprobante disponible</strong><small>Boleta, factura, ticket y XML</small></span></div></section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Cart;
