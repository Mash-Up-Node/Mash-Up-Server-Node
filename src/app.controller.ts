import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { TestException } from './common/exception/app-test.exception';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('error-check')
  getError() {
    throw new TestException();
  }
}
