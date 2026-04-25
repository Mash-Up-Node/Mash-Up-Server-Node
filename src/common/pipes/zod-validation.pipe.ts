/*
 * 각 모듈 담당자는 본인 API에 맞게 아래 방식으로 DTO를 정의합니다.
 *
 * import { createInsertSchema } from 'drizzle-zod';
 * import { users } from '@/db/schema';
 *
 * export const CreateUserDto = createInsertSchema(users).pick({
 *   name: true,
 *   email: true,
 * });
 *
 * 컨트롤러에서는 아래와 같이 사용합니다.
 *
 * @Post()
 * create(@Body(new ZodValidationPipe(CreateUserDto)) body: CreateUserDtoType) {}
 */
import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

export class ZodValidationPipe<T = unknown> implements PipeTransform<
  unknown,
  T
> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);

    if (result.success === false) {
      throw new BadRequestException(result.error.flatten());
    }

    return result.data;
  }
}
