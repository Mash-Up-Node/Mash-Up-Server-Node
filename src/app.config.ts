import { INestApplication } from '@nestjs/common';
import { swaggerConfig } from './app.swagger';

export function nestConfig(app: INestApplication) {
  swaggerConfig(app);
}
