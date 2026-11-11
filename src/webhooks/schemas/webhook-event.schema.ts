import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class WebhookEvent {
  @Prop({ required: true, unique: true })
  eventId: string;

  @Prop({ required: true })
  event: string;

  @Prop()
  razorpayOrderId?: string;
}

export const WebhookEventSchema = SchemaFactory.createForClass(WebhookEvent);
