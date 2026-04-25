import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { nestConfig } from './app.config';
import { BaseExceptionFilter } from './common/exception/base-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  nestConfig(app);

  app.useGlobalFilters(new BaseExceptionFilter());
  await app.listen(3000);
}
bootstrap();
