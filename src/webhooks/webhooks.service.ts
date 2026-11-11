import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'node:crypto';
import { Model } from 'mongoose';
import { WebhookEvent } from './schemas/webhook-event.schema.js';
import { OrdersService } from '../orders/orders.service.js';
import { RazorpayService } from '../razorpay/razorpay.service.js';

interface RazorpayWebhook {
  event: string;
  payload?: {
    payment?: { entity?: { id: string; order_id: string } };
  };
}

export type WebhookResult = 'processed' | 'duplicate' | 'ignored';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectModel(WebhookEvent.name)
    private readonly webhookEventModel: Model<WebhookEvent>,
    private readonly ordersService: OrdersService,
    private readonly razorpayService: RazorpayService,
  ) {}

  async handleRazorpay(
    rawBody: Buffer,
    signature?: string,
    eventIdHeader?: string,
  ): Promise<WebhookResult> {
    if (!this.razorpayService.isValidWebhookSignature(rawBody, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const eventId =
      eventIdHeader ?? createHash('sha256').update(rawBody).digest('hex');
    if (await this.webhookEventModel.exists({ eventId })) {
      this.logger.log(`Duplicate webhook ${eventId} skipped`);
      return 'duplicate';
    }

    const webhook = JSON.parse(rawBody.toString('utf8')) as RazorpayWebhook;
    const payment = webhook.payload?.payment?.entity;
    let result: WebhookResult = 'ignored';

    if (
      payment &&
      (webhook.event === 'payment.captured' || webhook.event === 'order.paid')
    ) {
      await this.ordersService.markPaid(payment.order_id, payment.id);
      result = 'processed';
    } else if (payment && webhook.event === 'payment.failed') {
      await this.ordersService.markFailed(payment.order_id);
      result = 'processed';
    } else {
      this.logger.log(`Webhook event "${webhook.event}" ignored`);
    }

    await this.webhookEventModel
      .create({
        eventId,
        event: webhook.event,
        razorpayOrderId: payment?.order_id,
      })
      .catch((error: { code?: number }) => {
        if (error.code !== 11000) throw error;
      });

    return result;
  }
}
