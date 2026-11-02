import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

// DTO = Data Transfer Object: describes the shape of incoming request data.
// The decorators below are read by the global ValidationPipe (see main.ts)
// to automatically validate and reject bad requests before they reach the controller.
export class CreateTaskDto {
  @IsString()
  @MinLength(3, { message: 'title must be at least 3 characters long' })
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  done?: boolean;
}
