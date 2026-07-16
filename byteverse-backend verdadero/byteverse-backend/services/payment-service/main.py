from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import aio_pika
import json
import os
import stripe
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("payment-service")

app = FastAPI(title="Payment Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_...")


class PaymentRequest(BaseModel):
    order_id: str
    amount: float
    currency: str = "pen"
    payment_method: str = "stripe"
    card_token: str = None
    email: str = None


class RefundRequest(BaseModel):
    payment_id: str
    amount: float = None
    reason: str = None


rabbitmq_channel = None

async def connect_rabbitmq():
    global rabbitmq_channel
    try:
        connection = await aio_pika.connect_robust(
            os.getenv("RABBITMQ_URL", "amqp://rabbitmq:5672")
        )
        rabbitmq_channel = await connection.channel()
        await rabbitmq_channel.declare_queue("payment_events", durable=True)
        await rabbitmq_channel.declare_queue("order_events", durable=True)
        logger.info("✅ Payment Service conectado a RabbitMQ")
        return rabbitmq_channel
    except Exception as e:
        logger.error(f"❌ Error RabbitMQ: {e}")
        return None


@app.post("/payment/create")
async def create_payment(payment: PaymentRequest):
    try:
        if payment.payment_method == "stripe":
            intent = stripe.PaymentIntent.create(
                amount=int(payment.amount * 100),
                currency=payment.currency,
                payment_method_types=["card"],
                receipt_email=payment.email,
                metadata={"order_id": payment.order_id}
            )
            
            payment_data = {
                "id": intent.id,
                "order_id": payment.order_id,
                "amount": payment.amount,
                "currency": payment.currency,
                "status": intent.status,
                "client_secret": intent.client_secret,
                "created": datetime.now().isoformat()
            }
            
            if rabbitmq_channel:
                await rabbitmq_channel.default_exchange.publish(
                    aio_pika.Message(
                        body=json.dumps({
                            "event": "PAYMENT_CREATED",
                            "payment_id": intent.id,
                            "order_id": payment.order_id,
                            "amount": payment.amount,
                            "status": intent.status,
                            "timestamp": datetime.now().isoformat()
                        }).encode()
                    ),
                    routing_key="payment_events"
                )
            
            return {"success": True, "payment": payment_data}
        
        return {"success": False, "error": "Método de pago no soportado"}
    except Exception as e:
        logger.error(f"Error creating payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/payment/confirm/{payment_id}")
async def confirm_payment(payment_id: str):
    try:
        intent = stripe.PaymentIntent.confirm(payment_id)
        
        if intent.status == "succeeded":
            if rabbitmq_channel:
                await rabbitmq_channel.default_exchange.publish(
                    aio_pika.Message(
                        body=json.dumps({
                            "event": "PAYMENT_CONFIRMED",
                            "payment_id": payment_id,
                            "order_id": intent.metadata.get("order_id"),
                            "status": "succeeded",
                            "timestamp": datetime.now().isoformat()
                        }).encode()
                    ),
                    routing_key="payment_events"
                )
            
            return {"success": True, "status": intent.status}
        
        return {"success": False, "status": intent.status}
    except Exception as e:
        logger.error(f"Error confirming payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/payment/{payment_id}")
async def get_payment(payment_id: str):
    try:
        intent = stripe.PaymentIntent.retrieve(payment_id)
        return {
            "id": intent.id,
            "amount": intent.amount / 100,
            "currency": intent.currency,
            "status": intent.status,
            "created": intent.created
        }
    except Exception as e:
        logger.error(f"Error retrieving payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {
        "status": "OK",
        "service": "payment-service",
        "stripe": "configured" if stripe.api_key else "not configured"
    }


@app.on_event("startup")
async def startup_event():
    await connect_rabbitmq()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3008)