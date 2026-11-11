import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { ORDER_STATUSES, OrderStatus } from './schemas/order.schema.js';
import { ResponseInterceptor } from '../common/response.interceptor.js';

@Controller('orders')
@UseInterceptors(ResponseInterceptor)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  findAll(@Query('status') status?: string) {
    if (
      status !== undefined &&
      !ORDER_STATUSES.includes(status as OrderStatus)
    ) {
      throw new BadRequestException(
        `status must be one of: ${ORDER_STATUSES.join(', ')}`,
      );
    }
    return this.ordersService.findAll(status as OrderStatus | undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }
}
