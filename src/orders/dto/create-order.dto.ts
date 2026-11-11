import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class OrderItemDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsInt()
  @Min(1)
  unitPrice: number;
}

export class CreateOrderDto {
  @IsEmail()
  customerEmail: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
