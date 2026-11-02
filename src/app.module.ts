import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { TasksModule } from './tasks/tasks.module.js';
import { LoggerMiddleware } from './common/logger.middleware.js';

// The root module. Every Nest app has exactly one of these, passed to
// NestFactory.create() in main.ts. It wires together:
// - ConfigModule: loads variables from .env, makes ConfigService injectable everywhere
// - TasksModule: the feature module we built (see src/tasks/)
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), TasksModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  // Middleware is wired up here rather than with a decorator, because it
  // needs to run before Nest's routing decides which controller to use.
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
