import { INestApplication } from '@nestjs/common';
import { CommonResponseInterceptor } from './common/interceptor/response.interceptor';
import { swaggerConfig } from './app.swagger';

export function nestConfig(app: INestApplication) {
  const corsOrigins =
    process.env.CORS_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.useGlobalInterceptors(new CommonResponseInterceptor());
  swaggerConfig(app);
}
