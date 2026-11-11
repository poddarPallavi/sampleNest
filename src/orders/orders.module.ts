import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller.js';
import { CheckoutController } from './checkout.controller.js';
import { OrdersService } from './orders.service.js';
import { Order, OrderSchema } from './schemas/order.schema.js';
import { RazorpayModule } from '../razorpay/razorpay.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    RazorpayModule,
  ],
  controllers: [OrdersController, CheckoutController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
