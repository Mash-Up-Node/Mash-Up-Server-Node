import { INestApplication } from '@nestjs/common';
import { CommonResponseInterceptor } from './common/interceptor/response.interceptor';
import { swaggerConfig } from './app.swagger';

export function nestConfig(app: INestApplication) {
  app.useGlobalInterceptors(new CommonResponseInterceptor());
  swaggerConfig(app);
}
