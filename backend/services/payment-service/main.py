from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import aio_pika
import json
import os
import secrets
import stripe
from datetime import datetime
from typing import Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('payment-service')

app = FastAPI(title='ByteVerse Payment Service')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

stripe.api_key = os.getenv('STRIPE_SECRET_KEY', '')
ACADEMIC_MODE = os.getenv('PAYMENT_ACADEMIC_MODE', 'true').lower() == 'true'


class PaymentRequest(BaseModel):
    order_id: str
    amount: float = Field(gt=0)
    currency: str = 'pen'
    payment_method: str = 'efectivo'
    card_token: Optional[str] = None
    email: Optional[str] = None
    operation_code: Optional[str] = None
    phone: Optional[str] = None
    bank: Optional[str] = None
    card_last4: Optional[str] = None
    cash_received: Optional[float] = None


rabbitmq_channel = None
payments = {}


async def publish(event):
    if rabbitmq_channel:
        await rabbitmq_channel.default_exchange.publish(
            aio_pika.Message(body=json.dumps(event).encode()),
            routing_key='payment_events',
        )


async def connect_rabbitmq():
    global rabbitmq_channel
    try:
        connection = await aio_pika.connect_robust(os.getenv('RABBITMQ_URL', 'amqp://rabbitmq:5672'))
        rabbitmq_channel = await connection.channel()
        await rabbitmq_channel.declare_queue('payment_events', durable=True)
        logger.info('Payment Service conectado a RabbitMQ')
    except Exception as exc:
        logger.error('RabbitMQ no disponible: %s', exc)


def normalize_method(value: str) -> str:
    return (value or '').strip().lower()


def clean_operation_code(value: Optional[str]) -> str:
    return ''.join(character for character in (value or '') if character.isalnum() or character == '-')


@app.post('/payment/create')
async def create_payment(payment: PaymentRequest):
    method = normalize_method(payment.payment_method)
    allowed = {'efectivo', 'tarjeta', 'stripe', 'yape', 'plin', 'transferencia'}
    if method not in allowed:
        raise HTTPException(400, 'Método de pago no soportado')

    payment_id = f'pay_{secrets.token_hex(12)}'
    status = 'registered'
    client_secret = None
    operation_code = clean_operation_code(payment.operation_code)
    change = 0.0

    if method == 'efectivo':
        received = float(payment.cash_received or payment.amount)
        if received < payment.amount:
            raise HTTPException(400, 'El efectivo recibido es menor al total de la venta')
        change = round(received - payment.amount, 2)
        status = 'approved'
    elif method in {'stripe', 'tarjeta'} and stripe.api_key and not stripe.api_key.startswith('sk_test_...') and payment.card_token:
        try:
            intent = stripe.PaymentIntent.create(
                amount=int(round(payment.amount * 100)),
                currency=payment.currency,
                payment_method=payment.card_token,
                confirm=True,
                receipt_email=payment.email,
                metadata={'order_id': payment.order_id},
            )
            payment_id = intent.id
            status = intent.status
            client_secret = intent.client_secret
        except Exception as exc:
            raise HTTPException(402, f'Pago rechazado: {exc}')
    elif method == 'tarjeta':
        if not ACADEMIC_MODE:
            raise HTTPException(503, 'La pasarela de tarjeta no está configurada')
        if not payment.card_last4 or not payment.card_last4.isdigit() or len(payment.card_last4) != 4:
            raise HTTPException(400, 'Últimos 4 dígitos de tarjeta inválidos')
        status = 'approved_academic'
    elif method in {'yape', 'plin'}:
        phone = ''.join(filter(str.isdigit, payment.phone or ''))
        if len(phone) != 9 or not phone.startswith('9'):
            raise HTTPException(400, 'El celular debe tener 9 dígitos y comenzar con 9')
        if len(operation_code) < 6:
            raise HTTPException(400, 'Código de operación inválido')
        status = 'verified_manual' if ACADEMIC_MODE else 'pending_verification'
    elif method == 'transferencia':
        if not payment.bank or len(operation_code) < 6:
            raise HTTPException(400, 'Banco y código de operación son obligatorios')
        status = 'verified_manual' if ACADEMIC_MODE else 'pending_verification'

    data = {
        'id': payment_id,
        'order_id': payment.order_id,
        'amount': round(payment.amount, 2),
        'currency': payment.currency.lower(),
        'method': method,
        'status': status,
        'operation_code': operation_code,
        'phone': payment.phone or '',
        'bank': payment.bank or '',
        'card_last4': payment.card_last4 or '',
        'cash_received': round(float(payment.cash_received or payment.amount), 2) if method == 'efectivo' else None,
        'change': change,
        'client_secret': client_secret,
        'created': datetime.now().isoformat(),
    }
    payments[payment_id] = data
    await publish({'event': 'PAYMENT_CREATED', 'payment': data, 'timestamp': datetime.now().isoformat()})
    return {'success': True, 'payment': data, 'academic_mode': ACADEMIC_MODE}


@app.post('/payment/confirm/{payment_id}')
async def confirm_payment(payment_id: str):
    data = payments.get(payment_id)
    if not data:
        if stripe.api_key and payment_id.startswith('pi_'):
            intent = stripe.PaymentIntent.retrieve(payment_id)
            return {'success': intent.status == 'succeeded', 'status': intent.status}
        raise HTTPException(404, 'Pago no encontrado')
    if data['status'] == 'pending_verification':
        data['status'] = 'verified_manual'
    await publish({'event': 'PAYMENT_CONFIRMED', 'payment_id': payment_id, 'status': data['status'], 'timestamp': datetime.now().isoformat()})
    return {'success': True, 'status': data['status'], 'payment': data}


@app.get('/payment/{payment_id}')
async def get_payment(payment_id: str):
    if payment_id in payments:
        return payments[payment_id]
    raise HTTPException(404, 'Pago no encontrado')


@app.get('/payment/config')
def payment_config():
    return {
        'academicMode': ACADEMIC_MODE,
        'stripeEnabled': bool(stripe.api_key and not stripe.api_key.startswith('sk_test_...')),
        'merchantPhone': os.getenv('YAPE_MERCHANT_PHONE', ''),
        'merchantQrUrl': os.getenv('YAPE_MERCHANT_QR_URL', ''),
        'supportedMethods': ['efectivo', 'tarjeta', 'yape', 'plin', 'transferencia'],
    }


@app.get('/health')
async def health():
    configured = bool(stripe.api_key and not stripe.api_key.startswith('sk_test_...'))
    return {
        'status': 'OK',
        'service': 'payment-service',
        'stripe': 'configured' if configured else 'academic-mode',
        'academic_mode': ACADEMIC_MODE,
    }


@app.on_event('startup')
async def startup_event():
    await connect_rabbitmq()


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=3008)
