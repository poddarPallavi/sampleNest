import { Controller, Get, Header, Param } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { RazorpayService } from '../razorpay/razorpay.service.js';
import { Public } from '../common/public.decorator.js';

@Controller('checkout')
export class CheckoutController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly razorpayService: RazorpayService,
  ) {}

  @Public()
  @Get(':id')
  @Header('Content-Type', 'text/html')
  async page(@Param('id') id: string): Promise<string> {
    const order = await this.ordersService.findOne(id);
    const options = {
      key: this.razorpayService.keyId,
      order_id: order.razorpayOrderId,
      amount: order.amount,
      currency: order.currency,
      name: 'Sample Shop',
      prefill: { email: order.customerEmail },
    };
    const optionsJson = JSON.stringify(options).replace(/</g, '\\u003c');

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Pay for order</title></head>
<body style="font-family: sans-serif; max-width: 420px; margin: 40px auto">
  <h2>Order total: ₹${(order.amount / 100).toFixed(2)}</h2>
  <p>Status: <b>${order.status}</b></p>
  <button id="pay">Pay with Razorpay</button>
  <p id="msg"></p>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    const options = ${optionsJson};
    options.handler = () => {
      document.getElementById('msg').textContent =
        'Payment submitted. The order status will update when Razorpay sends the webhook.';
    };
    document.getElementById('pay').onclick = () => new Razorpay(options).open();
  </script>
</body>
</html>`;
  }
}
