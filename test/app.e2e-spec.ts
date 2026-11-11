import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { RazorpayService } from './../src/razorpay/razorpay.service.js';

const API_KEY = 'e2e-test-key';
const WEBHOOK_SECRET = 'e2e-webhook-secret';

function razorpayWebhook(
  event: string,
  orderId: string,
  paymentId = 'pay_test_1',
) {
  const body = JSON.stringify({
    event,
    payload: { payment: { entity: { id: paymentId, order_id: orderId } } },
  });
  const signature = createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  return { body, signature };
}

describe('Payments (e2e)', () => {
  let mongod: MongoMemoryServer;
  let app: INestApplication<App>;
  let eventCounter = 0;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    const { AppModule } = await import('./../src/app.module.js');

    let razorpayOrderCount = 0;
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RazorpayService)
      .useFactory({
        inject: [ConfigService],
        factory: (configService: ConfigService) =>
          Object.assign(new RazorpayService(configService), {
            createOrder: async () => ({
              id: `order_e2e_${++razorpayOrderCount}`,
            }),
          }),
      })
      .compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await mongod?.stop();
  });

  const createOrder = async () => {
    const res = await request(app.getHttpServer())
      .post('/orders')
      .set('x-api-key', API_KEY)
      .send({
        customerEmail: 'buyer@example.com',
        items: [{ name: 'T-shirt', quantity: 2, unitPrice: 49900 }],
      })
      .expect(201);
    return res.body.data as {
      id: string;
      razorpayOrderId: string;
      amount: number;
      status: string;
    };
  };

  const sendWebhook = (
    event: string,
    orderId: string,
    eventId = `evt_${++eventCounter}`,
  ) => {
    const { body, signature } = razorpayWebhook(event, orderId);
    return request(app.getHttpServer())
      .post('/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .set('x-razorpay-event-id', eventId)
      .send(body);
  };

  const getStatus = async (id: string) => {
    const res = await request(app.getHttpServer())
      .get(`/orders/${id}`)
      .set('x-api-key', API_KEY)
      .expect(200);
    return res.body.data.status as string;
  };

  it('GET / is public', () => {
    return request(app.getHttpServer()).get('/').expect(200);
  });

  it('order endpoints require the API key', () => {
    return request(app.getHttpServer()).get('/orders').expect(401);
  });

  it('validates the order body', () => {
    return request(app.getHttpServer())
      .post('/orders')
      .set('x-api-key', API_KEY)
      .send({
        customerEmail: 'not-an-email',
        items: [{ name: 'T-shirt', quantity: 0, unitPrice: 49900 }],
      })
      .expect(400);
  });

  it('creates an order with a server-calculated total', async () => {
    const order = await createOrder();
    expect(order).toMatchObject({ amount: 99800, status: 'created' });
    expect(order).not.toHaveProperty('_id');
  });

  it('marks the order paid when a signed payment.captured webhook arrives', async () => {
    const order = await createOrder();

    const res = await sendWebhook(
      'payment.captured',
      order.razorpayOrderId,
    ).expect(200);
    expect(res.body).toEqual({ received: true, result: 'processed' });
    expect(await getStatus(order.id)).toBe('paid');
  });

  it('rejects a webhook with a bad signature and leaves the order alone', async () => {
    const order = await createOrder();
    const { body } = razorpayWebhook('payment.captured', order.razorpayOrderId);

    await request(app.getHttpServer())
      .post('/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', 'forged')
      .send(body)
      .expect(400);
    expect(await getStatus(order.id)).toBe('created');
  });

  it('skips a duplicate delivery of the same event', async () => {
    const order = await createOrder();

    await sendWebhook(
      'payment.captured',
      order.razorpayOrderId,
      'evt_dup',
    ).expect(200);
    const retry = await sendWebhook(
      'payment.captured',
      order.razorpayOrderId,
      'evt_dup',
    ).expect(200);
    expect(retry.body.result).toBe('duplicate');
  });

  it('a late payment.failed never downgrades a paid order', async () => {
    const order = await createOrder();

    await sendWebhook('payment.captured', order.razorpayOrderId).expect(200);
    await sendWebhook('payment.failed', order.razorpayOrderId).expect(200);
    expect(await getStatus(order.id)).toBe('paid');
  });

  it('serves a public checkout page for an order', async () => {
    const order = await createOrder();
    const res = await request(app.getHttpServer())
      .get(`/checkout/${order.id}`)
      .expect(200);
    expect(res.text).toContain(order.razorpayOrderId);
  });
});
