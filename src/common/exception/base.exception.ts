import { HttpException } from '@nestjs/common';

export class BaseException extends HttpException {
  constructor(status: number, errorCode: string, message: string) {
    super(
      {
        statusCode: status,
        errorCode: errorCode,
        message,
      },
      status,
    );

    Error.captureStackTrace(this, new.target);
  }
}
