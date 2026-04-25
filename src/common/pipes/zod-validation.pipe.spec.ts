import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const schema = z.object({
    name: z.string().trim().min(1),
    age: z.number().int().positive(),
  });

  it('valid payload를 schema parse 결과로 반환한다', () => {
    const pipe = new ZodValidationPipe(schema);

    expect(pipe.transform({ name: '  mashup  ', age: 1 })).toEqual({
      name: 'mashup',
      age: 1,
    });
  });

  it('invalid payload면 code와 message를 포함한 BadRequestException을 던진다', () => {
    const pipe = new ZodValidationPipe(schema);

    expect.assertions(3);

    try {
      pipe.transform({ name: '', age: -1 });
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
      });
      expect(
        ((error as BadRequestException).getResponse() as { message: string })
          .message,
      ).toContain('name:');
    }
  });
});
