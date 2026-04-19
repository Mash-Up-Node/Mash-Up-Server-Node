import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { nestConfig } from './app.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  nestConfig(app);

  await app.listen(3000);
}
bootstrap();
