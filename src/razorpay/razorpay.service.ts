import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

@Injectable()
export class RazorpayService {
  constructor(private readonly configService: ConfigService) {}

  get keyId(): string {
    return this.configService.getOrThrow<string>('RAZORPAY_KEY_ID');
  }

  async createOrder(amount: number, receipt: string): Promise<{ id: string }> {
    const keySecret = this.configService.getOrThrow<string>(
      'RAZORPAY_KEY_SECRET',
    );
    const auth = Buffer.from(`${this.keyId}:${keySecret}`).toString('base64');

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount, currency: 'INR', receipt }),
    });

    const body = (await response.json()) as {
      id: string;
      error?: { description?: string };
    };
    if (!response.ok) {
      throw new BadGatewayException(
        `Razorpay: ${body.error?.description ?? response.statusText}`,
      );
    }
    return { id: body.id };
  }

  isValidWebhookSignature(
    rawBody: Buffer,
    signature: string | undefined,
  ): boolean {
    if (!signature) {
      return false;
    }
    const secret = this.configService.getOrThrow<string>(
      'RAZORPAY_WEBHOOK_SECRET',
    );
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
