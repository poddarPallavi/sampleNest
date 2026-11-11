import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export const ORDER_STATUSES = ['created', 'paid', 'failed'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

@Schema({ _id: false })
export class OrderItem {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 1 })
  unitPrice: number;
}

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      delete ret._id;
      return ret;
    },
  },
})
export class Order {
  @Prop({ required: true })
  customerEmail: string;

  @Prop({ type: [SchemaFactory.createForClass(OrderItem)], required: true })
  items: OrderItem[];

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 'INR' })
  currency: string;

  @Prop({ type: String, enum: ORDER_STATUSES, default: 'created' })
  status: OrderStatus;

  @Prop({ required: true, unique: true })
  razorpayOrderId: string;

  @Prop()
  razorpayPaymentId?: string;
}

export type OrderDocument = HydratedDocument<Order>;
export const OrderSchema = SchemaFactory.createForClass(Order);
