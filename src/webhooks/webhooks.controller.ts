import {
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import type { Request } from 'express';
import { WebhooksService } from './webhooks.service.js';
import { Public } from '../common/public.decorator.js';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Public()
  @Post('razorpay')
  @HttpCode(200)
  async razorpay(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature?: string,
    @Headers('x-razorpay-event-id') eventId?: string,
  ) {
    const result = await this.webhooksService.handleRazorpay(
      req.rawBody ?? Buffer.alloc(0),
      signature,
      eventId,
    );
    return { received: true, result };
  }
}
