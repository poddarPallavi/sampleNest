import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebhooksController } from './webhooks.controller.js';
import { WebhooksService } from './webhooks.service.js';
import {
  WebhookEvent,
  WebhookEventSchema,
} from './schemas/webhook-event.schema.js';
import { OrdersModule } from '../orders/orders.module.js';
import { RazorpayModule } from '../razorpay/razorpay.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WebhookEvent.name, schema: WebhookEventSchema },
    ]),
    OrdersModule,
    RazorpayModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
