import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

// A minimal "root" controller, kept as a simple health check.
// The real example logic lives in src/tasks/.
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
