import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

// A Guard decides whether a request is allowed to reach the route handler at
// all - it runs before the body is even validated. Guards are the idiomatic
// place for auth checks. This one is deliberately simple: it just compares a
// header against a key read from the environment via ConfigService.
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'];
    const expectedKey = this.configService.get<string>('API_KEY', 'nest-rocks');

    if (apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid or missing x-api-key header');
    }
    return true;
  }
}
