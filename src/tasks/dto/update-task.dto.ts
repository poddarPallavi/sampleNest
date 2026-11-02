import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

// Every field is optional here because a PATCH only needs to send the fields
// that are changing. (Written out explicitly, rather than via PartialType,
// so it's obvious what's going on when you're new to Nest.)
export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'title must be at least 3 characters long' })
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  done?: boolean;
}
