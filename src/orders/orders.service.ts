import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from './schemas/order.schema.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { RazorpayService } from '../razorpay/razorpay.service.js';

const MIN_AMOUNT_PAISE = 100;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    private readonly razorpayService: RazorpayService,
  ) {}

  async create(dto: CreateOrderDto): Promise<OrderDocument> {
    const amount = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    if (amount < MIN_AMOUNT_PAISE) {
      throw new BadRequestException(
        `Order total must be at least ${MIN_AMOUNT_PAISE} paise (₹1)`,
      );
    }

    const order = new this.orderModel({
      customerEmail: dto.customerEmail,
      items: dto.items,
      amount,
    });
    const razorpayOrder = await this.razorpayService.createOrder(
      amount,
      order.id,
    );
    order.razorpayOrderId = razorpayOrder.id;
    return order.save();
  }

  findAll(status?: OrderStatus): Promise<OrderDocument[]> {
    const filter = status ? { status } : {};
    return this.orderModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<OrderDocument> {
    const order = isValidObjectId(id)
      ? await this.orderModel.findById(id).exec()
      : null;
    if (!order) {
      throw new NotFoundException(`Order with id "${id}" not found`);
    }
    return order;
  }

  async markPaid(
    razorpayOrderId: string,
    razorpayPaymentId: string,
  ): Promise<boolean> {
    const updated = await this.orderModel
      .findOneAndUpdate(
        { razorpayOrderId, status: { $in: ['created', 'failed'] } },
        { status: 'paid', razorpayPaymentId },
      )
      .exec();
    if (!updated) {
      this.logger.warn(
        `markPaid ignored: ${razorpayOrderId} not found or already paid`,
      );
    }
    return updated !== null;
  }

  async markFailed(razorpayOrderId: string): Promise<boolean> {
    const updated = await this.orderModel
      .findOneAndUpdate(
        { razorpayOrderId, status: 'created' },
        { status: 'failed' },
      )
      .exec();
    if (!updated) {
      this.logger.warn(
        `markFailed ignored: ${razorpayOrderId} not found or not in 'created' status`,
      );
    }
    return updated !== null;
  }
}
