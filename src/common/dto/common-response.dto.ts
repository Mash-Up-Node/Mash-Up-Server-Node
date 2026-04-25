import { ApiProperty } from '@nestjs/swagger';

/**
 * Response 기본 형식
 */
export class CommonResponse<T> {
  @ApiProperty()
  data: T;
}
