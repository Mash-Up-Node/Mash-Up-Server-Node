import { INestApplication } from '@nestjs/common';
import { CommonResponseInterceptor } from './common/interceptor/response.interceptor';

export function nestConfig(app: INestApplication) {
  app.useGlobalInterceptors(new CommonResponseInterceptor());
}
