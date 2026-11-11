import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { OrdersService } from './orders.service.js';
import { Order, OrderSchema } from './schemas/order.schema.js';
import { RazorpayService } from '../razorpay/razorpay.service.js';

describe('OrdersService', () => {
  let mongod: MongoMemoryServer;
  let module: TestingModule;
  let service: OrdersService;
  let razorpayOrderCount = 0;

  const fakeRazorpay = {
    createOrder: async () => ({ id: `order_test_${++razorpayOrderCount}` }),
  };

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
  });

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongod.getUri()),
        MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
      ],
      providers: [
        OrdersService,
        { provide: RazorpayService, useValue: fakeRazorpay },
      ],
    }).compile();

    service = module.get(OrdersService);
  });

  afterEach(async () => {
    await module.get<Model<Order>>(getModelToken(Order.name)).deleteMany({});
    await module.close();
  });

  afterAll(async () => {
    await mongod.stop();
  });

  const newOrder = () =>
    service.create({
      customerEmail: 'buyer@example.com',
      items: [
        { name: 'T-shirt', quantity: 2, unitPrice: 49900 },
        { name: 'Cap', quantity: 1, unitPrice: 19900 },
      ],
    });

  it('calculates the total on the server and links the Razorpay order', async () => {
    const order = await newOrder();

    expect(order.amount).toBe(2 * 49900 + 19900);
    expect(order.status).toBe('created');
    expect(order.razorpayOrderId).toMatch(/^order_test_/);
  });

  it('rejects orders below ₹1', async () => {
    await expect(
      service.create({
        customerEmail: 'buyer@example.com',
        items: [{ name: 'Sticker', quantity: 1, unitPrice: 50 }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException for an unknown or malformed id', async () => {
    await expect(service.findOne('64b7f0c2a1b2c3d4e5f60718')).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.findOne('not-an-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('marks a created order as paid', async () => {
    const order = await newOrder();

    expect(await service.markPaid(order.razorpayOrderId, 'pay_1')).toBe(true);
    const paid = await service.findOne(order.id);
    expect(paid.status).toBe('paid');
    expect(paid.razorpayPaymentId).toBe('pay_1');
  });

  it('allows a failed order to be paid on retry', async () => {
    const order = await newOrder();
    await service.markFailed(order.razorpayOrderId);

    expect(await service.markPaid(order.razorpayOrderId, 'pay_2')).toBe(true);
    expect((await service.findOne(order.id)).status).toBe('paid');
  });

  it('never moves a paid order back to failed', async () => {
    const order = await newOrder();
    await service.markPaid(order.razorpayOrderId, 'pay_1');

    expect(await service.markFailed(order.razorpayOrderId)).toBe(false);
    expect((await service.findOne(order.id)).status).toBe('paid');
  });

  it('ignores a second "paid" for an already paid order', async () => {
    const order = await newOrder();
    await service.markPaid(order.razorpayOrderId, 'pay_1');

    expect(await service.markPaid(order.razorpayOrderId, 'pay_other')).toBe(
      false,
    );
    expect((await service.findOne(order.id)).razorpayPaymentId).toBe('pay_1');
  });
});
