import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // A global Pipe runs on every incoming request body/query/param before it
  // reaches a controller. This one uses class-validator's decorators (see
  // src/tasks/dto/*.ts) to reject invalid payloads automatically.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties that aren't in the DTO
      forbidNonWhitelisted: true, // ...and error instead of silently stripping
      transform: true, // convert plain JSON into instances of the DTO class
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
