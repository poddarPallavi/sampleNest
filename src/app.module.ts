import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { OrdersModule } from './orders/orders.module.js';
import { WebhooksModule } from './webhooks/webhooks.module.js';
import { LoggerMiddleware } from './common/logger.middleware.js';
import { ApiKeyGuard } from './common/api-key.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        for (const key of [
          'API_KEY',
          'MONGODB_URI',
          'RAZORPAY_KEY_ID',
          'RAZORPAY_KEY_SECRET',
          'RAZORPAY_WEBHOOK_SECRET',
        ]) {
          if (!config[key]) {
            throw new Error(`${key} must be set (e.g. in .env)`);
          }
        }
        return config;
      },
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    OrdersModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ApiKeyGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
