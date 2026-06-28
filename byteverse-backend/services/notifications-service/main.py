
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import aio_pika
import os
from datetime import datetime

app = FastAPI(title="Notifications Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rabbitmq_channel = None

async def connect_rabbitmq():
    global rabbitmq_channel
    try:
        connection = await aio_pika.connect_robust(
            os.getenv("RABBITMQ_URL", "amqp://rabbitmq:5672")
        )
        rabbitmq_channel = await connection.channel()
        await rabbitmq_channel.declare_queue("auth_events", durable=True)
        await rabbitmq_channel.declare_queue("order_events", durable=True)
        await rabbitmq_channel.declare_queue("payment_events", durable=True)
        print("✅ Notifications Service conectado a RabbitMQ")
        return rabbitmq_channel
    except Exception as e:
        print(f"❌ Error RabbitMQ: {e}")
        return None

async def consume_events():
    if not rabbitmq_channel:
        return
    
    async def callback(message: aio_pika.IncomingMessage):
        async with message.process():
            try:
                event_data = json.loads(message.body.decode())
                event_type = event_data.get("event")
                print(f"📥 Evento recibido: {event_type}")
                
                if event_type == "USER_REGISTERED":
                    print(f"📧 Email de bienvenida para: {event_data.get('email')}")
                    print(f"👤 Usuario: {event_data.get('nombre')}")
                    
                elif event_type == "ORDER_CREATED":
                    print(f"📧 Email de confirmación para pedido #{event_data.get('id')}")
                    print(f"💰 Total: S/ {event_data.get('total')}")
                    
                elif event_type == "USER_LOGIN":
                    print(f"👤 Usuario logueado: {event_data.get('email')}")
                    
                elif event_type == "PAYMENT_CONFIRMED":
                    print(f"💳 Pago confirmado para pedido: {event_data.get('order_id')}")
                    
            except Exception as e:
                print(f"❌ Error procesando evento: {e}")
    
    await rabbitmq_channel.consume(callback, queue="auth_events", no_ack=False)
    await rabbitmq_channel.consume(callback, queue="order_events", no_ack=False)
    await rabbitmq_channel.consume(callback, queue="payment_events", no_ack=False)

@app.get("/health")
async def health():
    return {
        "status": "OK",
        "service": "notifications-service",
        "rabbitmq": "connected" if rabbitmq_channel else "disconnected"
    }

@app.on_event("startup")
async def startup_event():
    await connect_rabbitmq()
    asyncio.create_task(consume_events())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3005)