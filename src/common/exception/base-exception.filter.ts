import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { Response } from 'express';
import { BaseException } from './base.exception';

@Catch(BaseException)
export class BaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(BaseExceptionFilter.name);

  catch(exception: BaseException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    const logLevel = status >= 500 ? 'error' : 'warn';
    this.logger[logLevel](exception.message, exception.stack);

    response.status(status).json(exception.getResponse());
  }
}
