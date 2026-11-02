import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';

// A Module groups related controllers and providers together.
// Nest apps are a tree of modules, starting from the root AppModule,
// which imports this one.
@Module({
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
